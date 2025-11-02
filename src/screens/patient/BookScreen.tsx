// screens/BookScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import Input from '@/components/Input';
import Button from '@/components/Button';
import Avatar from '@/components/Avatar';
import safeAlert from '@/utils/safeAlert';
import db from '@/services/firestore';
import { useAuth } from '@/context/AuthContext';

import {
  createBooking,
  getAppointmentsForDoctorOnDay,
} from '@/services/booking';

// optional native datepicker
// @ts-ignore
let DateTimePicker: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  DateTimePicker = require('@react-native-community/datetimepicker').default;
} catch (_) {}

type Doctor = {
  id: string;
  name?: string;
  photoURL?: string;
  specialty_id?: string;
};
type Specialty = { id: string; name: string };
type ServiceType = {
  id: string;
  name: string;
  base_price?: number | null;
  duration_min?: number | null;
  description?: string | null;
  is_active?: boolean;
  specialty_id: string;
};

const DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/* --------------------------- Date helpers --------------------------- */
function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
function weekdayFromYMD(ymd: string) {
  const [y, m, d] = ymd.split('-').map(n => parseInt(n, 10));
  return new Date(y, m - 1, d).getDay(); // 0..6
}
function parseTimeToMinutes(hhmm: string) {
  const [hh, mm] = hhmm.split(':').map(n => parseInt(n, 10));
  return hh * 60 + mm;
}
function overlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  const aS = parseTimeToMinutes(aStart);
  const aE = parseTimeToMinutes(aEnd);
  const bS = parseTimeToMinutes(bStart);
  const bE = parseTimeToMinutes(bEnd);
  return Math.max(aS, bS) < Math.min(aE, bE);
}

/* ------------------------------- Screen ------------------------------ */
export default function BookScreen() {
  const { user } = useAuth() as any;
  const navigation = useNavigation();

  // data
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [specialtyMap, setSpecialtyMap] = useState<Record<string, string>>({});
  const [roomsMap, setRoomsMap] = useState<Record<string, string>>({}); // id -> label

  // services (phụ thuộc chuyên khoa)
  const [services, setServices] = useState<ServiceType[]>([]);

  // UI dropdowns
  const [specialtyOpen, setSpecialtyOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [doctorOpen, setDoctorOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [showNativeDatePicker, setShowNativeDatePicker] = useState(false);

  // form state
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<string | null>(
    null,
  );
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    null,
  );
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState(() => toYMD(new Date()));
  const [shiftsForDate, setShiftsForDate] = useState<
    {
      id: string;
      start_time: string;
      end_time: string;
      room_id: string | null;
    }[]
  >([]);
  const [bookedForDate, setBookedForDate] = useState<
    { start: string; end: string }[]
  >([]);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);

  // book for other
  const [bookingForOther, setBookingForOther] = useState(false);
  const [otherPatientId, setOtherPatientId] = useState('');

  /* ------------------------------ init load ------------------------------ */
  useEffect(() => {
    (async () => {
      try {
        const snapDocs = await db
          .collection('users')
          .where('role', '==', 'doctor')
          .get();
        setDoctors(
          snapDocs.docs.map(d => ({
            id: d.id,
            ...(d.data() as any),
          })) as Doctor[],
        );

        const snapSpec = await db
          .collection('specialties')
          .orderBy('name')
          .get();
        const list = snapSpec.docs.map(d => ({
          id: d.id,
          ...(d.data() as any),
        })) as Specialty[];
        setSpecialties(list);
        const map: Record<string, string> = {};
        list.forEach(s => (map[s.id] = s.name));
        setSpecialtyMap(map);

        // rooms map
        try {
          const snapRooms = await db.collection('rooms').get();
          const rmap: Record<string, string> = {};
          snapRooms.docs.forEach(d => {
            const data = d.data() as any;
            rmap[d.id] = data?.name || data?.label || d.id;
          });
          setRoomsMap(rmap);
        } catch (e) {
          console.warn('load rooms', e);
          setRoomsMap({});
        }
      } catch (e) {
        console.warn('init load', e);
      }
    })();
  }, []);

  /* -------------------- load services when specialty changes -------------------- */
  useEffect(() => {
    setSelectedServiceId(null);
    // reset selected doctor khi đổi chuyên khoa
    setDoctorId('');
    if (!selectedSpecialtyId) {
      setServices([]);
      return;
    }
    (async () => {
      try {
        // Query only by specialty_id to avoid requiring composite indexes.
        // Do filtering (is_active) and ordering (name) client-side.
        const snap = await db
          .collection('service_types')
          .where('specialty_id', '==', selectedSpecialtyId)
          .get();

        const list = snap.docs.map(d => ({
          id: d.id,
          ...(d.data() as any),
        })) as ServiceType[];

        const filtered = list
          .filter(s => s.is_active !== false) // include true or undefined
          .sort((a, b) =>
            ('' + (a.name || '')).localeCompare('' + (b.name || '')),
          );

        setServices(filtered);
      } catch (e) {
        console.warn('load services', e);
        setServices([]);
      }
    })();
  }, [selectedSpecialtyId]);

  /* ------------- load shifts + existing appointments when doctor/date changes ------------- */
  useEffect(() => {
    if (!doctorId || !date) {
      setShiftsForDate([]);
      setBookedForDate([]);
      setSelectedShiftId(null);
      return;
    }

    (async () => {
      try {
        // ---- 1) Lấy ca theo NGÀY ----
        const dateDocs = await db
          .collection('work_shifts')
          .where('doctor_id', '==', doctorId)
          .where('date', '==', date)
          .get();

        // ---- 2) Lấy ca theo THỨ (fallback) ----
        const dow = weekdayFromYMD(date);
        const dowDocs = await db
          .collection('work_shifts')
          .where('doctor_id', '==', doctorId)
          .where('day_of_week', '==', dow)
          .get();

        // Nếu có ca theo ngày -> chỉ dùng ca ngày; nếu không, dùng ca theo thứ
        const raw = (dateDocs.size > 0 ? dateDocs.docs : dowDocs.docs).map(
          d => ({
            id: d.id,
            ...(d.data() as any),
          }),
        );

        // Chuẩn hóa + lọc thiếu giờ
        const normalized = raw
          .filter(s => s.start_time && s.end_time)
          .map(s => ({
            id: s.id,
            start_time: s.start_time,
            end_time: s.end_time,
            room_id: s.room_id || null,
          }));

        // ✅ DEDUPE theo start-end-room (nếu admin lỡ tạo trùng)
        const seen = new Set<string>();
        const deduped: typeof normalized = [];
        for (const s of normalized) {
          const key = `${s.start_time}-${s.end_time}-${s.room_id ?? ''}`;
          if (!seen.has(key)) {
            seen.add(key);
            deduped.push(s);
          }
        }

        // sort theo giờ bắt đầu
        deduped.sort(
          (a, b) =>
            parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time),
        );

        setShiftsForDate(deduped);

        // ---- 3) Lấy appointments cùng ngày để khóa ca đã đặt ----
        const apps = await getAppointmentsForDoctorOnDay(
          doctorId,
          new Date(date),
        );
        const formatted = (apps || []).map((it: any) => {
          const s = new Date(it.start);
          const e = new Date(it.end);
          const sHH = String(s.getHours()).padStart(2, '0');
          const sMM = String(s.getMinutes()).padStart(2, '0');
          const eHH = String(e.getHours()).padStart(2, '0');
          const eMM = String(e.getMinutes()).padStart(2, '0');
          return { start: `${sHH}:${sMM}`, end: `${eHH}:${eMM}` };
        });
        setBookedForDate(formatted);

        // giữ selection nếu còn hợp lệ
        setSelectedShiftId(prev =>
          deduped.some(
            s =>
              s.id === prev &&
              !formatted.some(b =>
                overlap(b.start, b.end, s.start_time, s.end_time),
              ),
          )
            ? prev
            : null,
        );
      } catch (e) {
        console.warn('load shifts/booked', e);
        setShiftsForDate([]);
        setBookedForDate([]);
        setSelectedShiftId(null);
      }
    })();
  }, [doctorId, date]);

  /* ---------------------------- derived lists ---------------------------- */
  const doctorsFiltered = useMemo(() => {
    if (!selectedSpecialtyId) return doctors;
    return doctors.filter(d => (d?.specialty_id || '') === selectedSpecialtyId);
  }, [doctors, selectedSpecialtyId]);

  const chosenService = useMemo(
    () => services.find(s => s.id === selectedServiceId) || null,
    [services, selectedServiceId],
  );
  const doctorObj = useMemo(
    () => doctors.find(d => d.id === doctorId) || null,
    [doctors, doctorId],
  );

  /* ------------------------------- actions ------------------------------- */
  function onConfirm() {
    if (!selectedSpecialtyId)
      return safeAlert('Thiếu thông tin', 'Vui lòng chọn chuyên khoa.');
    if (!selectedServiceId)
      return safeAlert('Thiếu thông tin', 'Vui lòng chọn dịch vụ.');
    if (!doctorId) return safeAlert('Thiếu thông tin', 'Vui lòng chọn bác sĩ.');
    if (!date) return safeAlert('Thiếu thông tin', 'Vui lòng chọn ngày.');
    if (!selectedShiftId)
      return safeAlert('Thiếu thông tin', 'Vui lòng chọn ca làm.');

    const shift = shiftsForDate.find(s => s.id === selectedShiftId);
    if (!shift) return;

    // chặn trùng lần cuối
    const isConflict = bookedForDate.some(b =>
      overlap(b.start, b.end, shift.start_time, shift.end_time),
    );
    if (isConflict) {
      return safeAlert(
        'Trùng lịch',
        'Ca này đã có người đặt, vui lòng chọn ca khác.',
      );
    }

    const docName = doctorObj?.name || 'Bác sĩ';
    const svcName = chosenService?.name || 'Dịch vụ';
    const msg = `Dịch vụ: ${svcName}\nNgày ${date}\nCa: ${shift.start_time} - ${shift.end_time}\nVới ${docName}`;
    Alert.alert('Xác nhận', msg, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xác nhận',
        onPress: async () => {
          try {
            const startISO = new Date(`${date}T${shift.start_time}:00`);
            const endISO = new Date(`${date}T${shift.end_time}:00`);
            const payload: any = {
              doctorId,
              patientId: bookingForOther ? otherPatientId : user?.uid,
              start: startISO.toISOString(),
              end: endISO.toISOString(),
              roomId: shift.room_id || null,
              service_type_id: selectedServiceId, // ✅ UID dịch vụ
              meta: {
                bookedFrom: 'mobile',
                serviceName: chosenService?.name || null,
                servicePrice: chosenService?.base_price ?? null,
                serviceDurationMin: chosenService?.duration_min ?? null,
                specialtyId: selectedSpecialtyId,
              },
              status: 'pending',
              createdAt: new Date().toISOString(),
            };
            await createBooking(payload);
            safeAlert('Thành công', 'Bạn đã đặt lịch thành công.');
            (navigation as any).goBack?.();
          } catch (e: any) {
            console.warn('create booking', e);
            safeAlert('Lỗi', e?.message || 'Không thể tạo lịch hẹn.');
          }
        },
      },
    ]);
  }

  /* ------------------------------- UI blocks ------------------------------- */
  const SpecialtySelector = (
    <>
      <Text style={styles.sectionTitle}>Chọn chuyên khoa</Text>
      <TouchableOpacity
        style={styles.dropdownHeader}
        onPress={() => setSpecialtyOpen(v => !v)}
      >
        <Text style={{ fontWeight: '600' }}>
          {selectedSpecialtyId
            ? specialtyMap[selectedSpecialtyId]
            : 'Tất cả chuyên khoa'}
        </Text>
        <Text>{specialtyOpen ? '▴' : '▾'}</Text>
      </TouchableOpacity>
      {specialtyOpen && (
        <View style={styles.dropdownBody}>
          <TouchableOpacity
            onPress={() => {
              setSelectedSpecialtyId(null);
              setSelectedServiceId(null);
              setSpecialtyOpen(false);
            }}
            style={styles.dropdownItem}
          >
            <Text>Tất cả</Text>
          </TouchableOpacity>
          <ScrollView style={{ maxHeight: 220 }}>
            {specialties.map(s => (
              <TouchableOpacity
                key={s.id}
                onPress={() => {
                  setSelectedSpecialtyId(s.id);
                  setSelectedServiceId(null);
                  setSpecialtyOpen(false);
                }}
                style={styles.dropdownItem}
              >
                <Text>{s.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </>
  );

  const ServiceSelector = (
    <>
      <Text style={styles.sectionTitle}>Chọn dịch vụ</Text>
      <TouchableOpacity
        style={styles.dropdownHeader}
        onPress={() => setServiceOpen(v => !v)}
        disabled={!selectedSpecialtyId}
      >
        <Text
          style={{
            fontWeight: '600',
            color: selectedSpecialtyId ? '#111' : '#999',
          }}
        >
          {selectedServiceId
            ? services.find(s => s.id === selectedServiceId)?.name ?? 'Dịch vụ'
            : selectedSpecialtyId
            ? 'Chọn dịch vụ'
            : 'Chọn chuyên khoa trước'}
        </Text>
        <Text>{serviceOpen ? '▴' : '▾'}</Text>
      </TouchableOpacity>
      {serviceOpen && selectedSpecialtyId && (
        <View style={styles.dropdownBody}>
          {services.length === 0 ? (
            <Text style={{ color: '#666', padding: 8 }}>
              Chuyên khoa này chưa có dịch vụ.
            </Text>
          ) : null}
          <ScrollView style={{ maxHeight: 300 }}>
            {services.map(s => (
              <TouchableOpacity
                key={s.id}
                style={styles.dropdownItem}
                onPress={() => {
                  setSelectedServiceId(s.id);
                  setServiceOpen(false);
                }}
              >
                <Text style={{ fontWeight: '600' }}>{s.name}</Text>
                <Text style={{ color: '#666', marginTop: 2 }}>
                  {s.duration_min ? `• ${s.duration_min} phút   ` : ''}
                  {s.base_price != null
                    ? `• ${Number(s.base_price).toLocaleString()}₫`
                    : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      {selectedServiceId && chosenService && (
        <Text style={{ color: '#555', marginTop: 6 }}>
          Đã chọn: {chosenService.name}
          {chosenService.duration_min
            ? ` • ${chosenService.duration_min} phút`
            : ''}
          {chosenService.base_price != null
            ? ` • ${Number(chosenService.base_price).toLocaleString()}₫`
            : ''}
        </Text>
      )}
    </>
  );

  const DoctorSelector = (
    <>
      <Text style={styles.sectionTitle}>Chọn bác sĩ</Text>
      <TouchableOpacity
        style={styles.dropdownHeader}
        onPress={() => selectedServiceId && setDoctorOpen(v => !v)}
        disabled={!selectedServiceId || doctorsFiltered.length === 0}
      >
        <Text
          style={{
            fontWeight: '600',
            color:
              selectedServiceId && doctorsFiltered.length ? '#111' : '#999',
          }}
        >
          {doctorId
            ? doctors.find(d => d.id === doctorId)?.name || 'Bác sĩ'
            : doctorsFiltered.length
            ? 'Chọn bác sĩ'
            : selectedServiceId
            ? 'Không có bác sĩ'
            : 'Chọn dịch vụ trước'}
        </Text>
        <Text>{doctorOpen ? '▴' : '▾'}</Text>
      </TouchableOpacity>

      {doctorOpen && (
        <View style={styles.dropdownBody}>
          {doctorsFiltered.length === 0 ? (
            <Text style={{ color: '#666', padding: 8 }}>
              Chưa có bác sĩ phù hợp.
            </Text>
          ) : null}
          <ScrollView style={{ maxHeight: 260 }}>
            {doctorsFiltered.map(d => {
              const selected = doctorId === d.id;
              return (
                <TouchableOpacity
                  key={d.id}
                  style={[
                    styles.doctorRow,
                    selected ? styles.doctorRowSelected : undefined,
                  ]}
                  onPress={() => {
                    setDoctorId(d.id);
                    setDoctorOpen(false);
                  }}
                >
                  <Avatar uri={d.photoURL} name={d.name} size={44} />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text
                      style={[
                        styles.doctorName,
                        selected ? { color: '#fff' } : {},
                      ]}
                    >
                      {d.name || 'Bác sĩ ' + d.id}
                    </Text>
                    <Text
                      style={[
                        styles.doctorSubtitle,
                        selected ? { color: '#e6f0ff' } : {},
                      ]}
                    >
                      {specialtyMap[d.specialty_id || ''] ||
                        'Chuyên khoa chưa đặt'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </>
  );

  const DateSelector = (
    <>
      <Text style={styles.sectionTitle}>Chọn ngày</Text>
      <TouchableOpacity
        onPress={() => {
          if (DateTimePicker) setShowNativeDatePicker(true);
          else setCalendarOpen(true);
        }}
        style={styles.dateInput}
      >
        <Text style={{ color: '#111' }}>{date}</Text>
      </TouchableOpacity>

      {/* Native Picker */}
      {showNativeDatePicker && DateTimePicker && (
        <DateTimePicker
          value={new Date(date + 'T12:00:00')}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
          onChange={(event: any, d?: Date) => {
            if (Platform.OS === 'android') setShowNativeDatePicker(false);
            if (event?.type === 'dismissed') return;
            if (d) setDate(toYMD(d));
          }}
        />
      )}

      {/* Simple calendar modal */}
      <CalendarModal
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        initialDate={new Date(date + 'T12:00:00')}
        onPick={(d: Date) => {
          setDate(toYMD(d));
          setCalendarOpen(false);
        }}
      />
    </>
  );

  const ShiftSelector = (
    <>
      <Text style={styles.sectionTitle}>Chọn ca làm</Text>
      {doctorId ? (
        shiftsForDate.length > 0 ? (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={shiftsForDate}
            keyExtractor={s => s.id}
            contentContainerStyle={{ paddingVertical: 8 }}
            renderItem={({ item }) => {
              const disabled = bookedForDate.some(b =>
                overlap(b.start, b.end, item.start_time, item.end_time),
              );
              const selected = selectedShiftId === item.id;
              return (
                <TouchableOpacity
                  onPress={() => !disabled && setSelectedShiftId(item.id)}
                  style={[
                    styles.chip,
                    selected ? styles.chipSelected : undefined,
                    disabled && {
                      opacity: 0.5,
                      backgroundColor: '#f3f4f6',
                      borderColor: '#eee',
                    },
                  ]}
                >
                  <Text
                    style={selected ? styles.chipTextSelected : styles.chipText}
                  >
                    {item.start_time} - {item.end_time}
                  </Text>
                  {item.room_id ? (
                    <Text
                      style={{
                        marginLeft: 6,
                        fontSize: 11,
                        color: selected ? '#e9f2ff' : '#666',
                      }}
                    >
                      {roomsMap[item.room_id]
                        ? `Phòng ${roomsMap[item.room_id]}`
                        : `Phòng ${item.room_id}`}
                    </Text>
                  ) : null}
                  {disabled ? (
                    <Text
                      style={{ marginLeft: 6, fontSize: 11, color: '#999' }}
                    >
                      Đã kín
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            }}
          />
        ) : (
          <Text style={{ color: '#b33' }}>
            Bác sĩ chưa có ca làm việc cho ngày {date}. Vui lòng chọn ngày khác.
          </Text>
        )
      ) : (
        <Text style={{ color: '#666' }}>Hãy chọn bác sĩ trước.</Text>
      )}
    </>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đặt lịch khám</Text>

      {SpecialtySelector}
      {ServiceSelector}
      {DoctorSelector}
      {DateSelector}
      {ShiftSelector}

      {/* Đặt hộ người khác */}
      <View style={{ marginTop: 12 }}>
        <Text style={styles.sectionTitle}>
          Đặt hộ người khác (không bắt buộc)
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => setBookingForOther(v => !v)}
            style={[styles.switchBtn, bookingForOther && styles.switchBtnOn]}
          >
            <Text
              style={{
                color: bookingForOther ? '#fff' : '#111',
                fontWeight: '600',
              }}
            >
              {bookingForOther ? 'Bật' : 'Tắt'}
            </Text>
          </TouchableOpacity>
          <Text style={{ marginLeft: 8, color: '#444' }}>
            {bookingForOther ? 'Đang đặt hộ' : 'Không đặt hộ'}
          </Text>
        </View>
        {bookingForOther && (
          <View style={{ marginTop: 8 }}>
            <Input
              placeholder="Nhập UID bệnh nhân"
              value={otherPatientId}
              onChangeText={setOtherPatientId}
            />
          </View>
        )}
      </View>

      <View style={{ height: 12 }} />
      <Button
        title="Xác nhận đặt lịch"
        onPress={onConfirm}
        disabled={
          !selectedSpecialtyId ||
          !selectedServiceId ||
          !doctorId ||
          !date ||
          !selectedShiftId
        }
      />
      {selectedShiftId ? (
        <View style={{ alignItems: 'center', marginTop: 8 }}>
          <Text style={{ color: '#333', fontWeight: '600' }}>
            Đã chọn: {date} •{' '}
            {(() => {
              const s = shiftsForDate.find(x => x.id === selectedShiftId);
              return s ? `${s.start_time} - ${s.end_time}` : '--:--';
            })()}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/* --------------------------- Calendar Modal --------------------------- */
function CalendarModal({
  open,
  onClose,
  initialDate,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  initialDate: Date;
  onPick: (d: Date) => void;
}) {
  const [month, setMonth] = useState<Date>(initialDate);

  useEffect(() => {
    if (open) setMonth(initialDate);
  }, [open, initialDate]);

  function monthCells(m: Date) {
    const y = m.getFullYear();
    const mm = m.getMonth();
    const first = new Date(y, mm, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(y, mm + 1, 0).getDate();
    const daysInPrev = new Date(y, mm, 0).getDate();
    const cells: Date[] = [];
    for (let i = 0; i < startDay; i++) {
      const day = daysInPrev - startDay + 1 + i;
      cells.push(new Date(y, mm - 1, day, 12));
    }
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, mm, d, 12));
    let next = 1;
    while (cells.length < 42) cells.push(new Date(y, mm + 1, next++, 12));
    return cells;
  }

  if (!open) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalContent, { maxWidth: 360 }]}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity
              onPress={() => {
                const prev = new Date(month);
                prev.setMonth(prev.getMonth() - 1);
                setMonth(prev);
              }}
            >
              <Text>{'◀'}</Text>
            </TouchableOpacity>
            <Text style={{ fontWeight: '700' }}>
              {month.toLocaleString(undefined, {
                month: 'long',
                year: 'numeric',
              })}
            </Text>
            <TouchableOpacity
              onPress={() => {
                const next = new Date(month);
                next.setMonth(next.getMonth() + 1);
                setMonth(next);
              }}
            >
              <Text>{'▶'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.calendarGrid}>
            {DAYS.map(h => (
              <Text key={h} style={{ textAlign: 'center', fontWeight: '700' }}>
                {h}
              </Text>
            ))}
            {monthCells(month).map((d, idx) => {
              const dim = month.getMonth() === d.getMonth();
              return (
                <TouchableOpacity
                  key={idx}
                  style={styles.calendarCell}
                  onPress={() => onPick(d)}
                >
                  <Text
                    style={{
                      textAlign: 'center',
                      color: dim ? '#111' : '#bbb',
                    }}
                  >
                    {d.getDate()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              marginTop: 8,
            }}
          >
            <Button title="Đóng" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ------------------------------- Styles ------------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },

  sectionTitle: {
    marginTop: 12,
    marginBottom: 6,
    fontWeight: '600',
    color: '#333',
  },

  // doctor
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginVertical: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  doctorRowSelected: { backgroundColor: '#1976d2', borderColor: '#155fa6' },
  doctorName: { fontWeight: '700', fontSize: 15, color: '#111' },
  doctorSubtitle: { color: '#666', fontSize: 13, marginTop: 2 },

  // chips
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#eee',
    borderWidth: 1,
    borderColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipSelected: { backgroundColor: '#1976d2', borderColor: '#1976d2' },
  chipText: { color: '#111' },
  chipTextSelected: { color: '#fff' },

  // dropdown
  dropdownHeader: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownBody: {
    marginTop: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
    padding: 6,
  },
  dropdownItem: { paddingVertical: 10, paddingHorizontal: 10, borderRadius: 8 },

  // date
  dateInput: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },

  // switch mimic
  switchBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#f5f5f5',
  },
  switchBtnOn: {
    backgroundColor: '#1976d2',
    borderColor: '#1976d2',
  },

  // modal & calendar
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    margin: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarCell: { width: '14.2857%', paddingVertical: 8 },
});
