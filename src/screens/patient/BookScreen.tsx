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
  SafeAreaView, 
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
}
from '@/services/booking';

// optional native datepicker
// @ts-ignore
let DateTimePicker: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  DateTimePicker = require('@react-native-community/datetimepicker').default;
} catch (_) {}

// Hằng số màu sắc mới
const COLORS = {
  primary: '#2596be', // Màu chính
  secondary: '#FF9500',
  background: '#f0f4f8', // Nền nhẹ
  cardBackground: '#ffffff',
  textDark: '#1c1c1c',
  subtitle: '#777777',
  accent: '#1976d2', // Màu nhấn mạnh cho nút/chọn
  accentLight: '#e0f0ff', // Màu nền nhẹ cho chọn
  border: '#E0E0E0',
  shadowColor: '#000000',
  danger: '#ff4d4d',
};

// Component Card để nhóm các bước
const Card = ({ children, title }: { children: React.ReactNode, title: string }) => (
  <View style={newStyles.card}>
    <Text style={newStyles.cardTitle}>{title}</Text>
    {children}
  </View>
);

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

/* --------------------------- Date helpers (GIỮ NGUYÊN) --------------------------- */
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

  /* ------------------------------ init load (GIỮ NGUYÊN) ------------------------------ */
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

  /* -------------------- load services when specialty changes (GIỮ NGUYÊN) -------------------- */
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

  /* ------------- load shifts + existing appointments when doctor/date changes (GIỮ NGUYÊN) ------------- */
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

  /* ---------------------------- derived lists (GIỮ NGUYÊN) ---------------------------- */
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

  /* ------------------------------- actions (GIỮ NGUYÊN) ------------------------------- */
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
    
    // ✅ Bổ sung kiểm tra ca đã trôi qua
    const shiftStartISO = `${date}T${shift.start_time}:00`;
    const shiftStart = new Date(shiftStartISO);
    const now = new Date();
    const isToday = toYMD(shiftStart) === toYMD(now);
    const isPast = isToday && (shiftStart.getTime() < now.getTime());
    
    if (isPast) {
         return safeAlert(
            'Lỗi thời gian',
            'Ca này đã trôi qua so với thời gian thực. Vui lòng chọn ca khác.',
        );
    }
    // ----------------------------------------------------

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

  /* ------------------------------- UI blocks (ĐÃ SỬA LỖI STYLES) ------------------------------- */
  const SpecialtySelector = (
    <Card title="1. Chọn Chuyên Khoa">
      <TouchableOpacity
        style={newStyles.dropdownHeader}
        onPress={() => {
          setSpecialtyOpen(v => !v);
          setServiceOpen(false);
          setDoctorOpen(false);
        }}
      >
        <Text style={newStyles.dropdownHeaderText}>
          {selectedSpecialtyId
            ? specialtyMap[selectedSpecialtyId]
            : 'Tất cả chuyên khoa'}
        </Text>
        <Text style={{ color: COLORS.textDark }}>{specialtyOpen ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {specialtyOpen && (
        <View style={newStyles.dropdownBody}>
          {/* ✅ Đã tăng maxHeight và giữ nguyên ở đây */}
          <ScrollView style={{ maxHeight: 250 }}> 
            <TouchableOpacity
              onPress={() => {
                setSelectedSpecialtyId(null);
                setSelectedServiceId(null);
                setSpecialtyOpen(false);
              }}
              style={newStyles.dropdownItem}
            >
              <Text style={newStyles.dropdownItemText}>Tất cả chuyên khoa</Text>
            </TouchableOpacity>
            {specialties.map(s => (
              <TouchableOpacity
                key={s.id}
                onPress={() => {
                  setSelectedSpecialtyId(s.id);
                  setSelectedServiceId(null);
                  setSpecialtyOpen(false);
                }}
                style={[
                  newStyles.dropdownItem,
                  selectedSpecialtyId === s.id && newStyles.dropdownItemSelected,
                ]}
              >
                <Text style={newStyles.dropdownItemText}>{s.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </Card>
  );

  const ServiceSelector = (
    <Card title="2. Chọn Dịch Vụ">
      <TouchableOpacity
        style={[
          newStyles.dropdownHeader,
          !selectedSpecialtyId && newStyles.dropdownDisabled,
        ]}
        onPress={() => {
          selectedSpecialtyId && setServiceOpen(v => !v);
          setSpecialtyOpen(false);
          setDoctorOpen(false);
        }}
        disabled={!selectedSpecialtyId}
      >
        <Text
          style={[
            newStyles.dropdownHeaderText,
            !selectedSpecialtyId && { color: COLORS.subtitle },
          ]}
        >
          {selectedServiceId
            ? chosenService?.name ?? 'Dịch vụ'
            : selectedSpecialtyId
              ? 'Chọn dịch vụ'
              : '⬅ Vui lòng chọn chuyên khoa'}
        </Text>
        <Text style={{ color: selectedSpecialtyId ? COLORS.textDark : COLORS.subtitle }}>
          {serviceOpen ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>
      
      {serviceOpen && selectedSpecialtyId && (
        <View style={newStyles.dropdownBody}>
          {services.length === 0 ? (
            <Text style={newStyles.warningText}>
              Chuyên khoa này chưa có dịch vụ hoạt động.
            </Text>
          ) : (
            <ScrollView style={{ maxHeight: 300 }}>
              {services.map(s => (
                <TouchableOpacity
                  key={s.id}
                  style={[
                    newStyles.dropdownItem,
                    selectedServiceId === s.id && newStyles.dropdownItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedServiceId(s.id);
                    setServiceOpen(false);
                  }}
                >
                  <Text style={newStyles.dropdownItemText}>{s.name}</Text>
                  <Text style={newStyles.serviceDetailText}>
                    {s.duration_min ? `• ${s.duration_min} phút   ` : ''}
                    {s.base_price != null
                      ? `• ${Number(s.base_price).toLocaleString()}₫`
                      : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </Card>
  );

  const DoctorSelector = (
    <Card title="3. Chọn Bác Sĩ">
      <TouchableOpacity
        style={[
          newStyles.dropdownHeader,
          !selectedServiceId && newStyles.dropdownDisabled,
        ]}
        onPress={() => selectedServiceId && setDoctorOpen(v => !v)}
        disabled={!selectedServiceId || doctorsFiltered.length === 0}
      >
        <Text
          style={[
            newStyles.dropdownHeaderText,
            !selectedServiceId && { color: COLORS.subtitle },
          ]}
        >
          {doctorId
            ? doctorObj?.name || 'Bác sĩ'
            : selectedServiceId
              ? doctorsFiltered.length
                ? 'Chọn bác sĩ'
                : 'Không có bác sĩ phù hợp'
              : '⬅ Vui lòng chọn dịch vụ'}
        </Text>
        <Text style={{ color: selectedServiceId ? COLORS.textDark : COLORS.subtitle }}>
          {doctorOpen ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {doctorOpen && selectedServiceId && (
        <View style={newStyles.dropdownBody}>
          {doctorsFiltered.length === 0 ? (
            <Text style={newStyles.warningText}>
              Không tìm thấy bác sĩ cho chuyên khoa đã chọn.
            </Text>
          ) : (
            <ScrollView style={{ maxHeight: 260 }}>
              {doctorsFiltered.map(d => {
                const selected = doctorId === d.id;
                return (
                  <TouchableOpacity
                    key={d.id}
                    style={[
                      newStyles.doctorRow,
                      selected && newStyles.doctorRowSelected,
                    ]}
                    onPress={() => {
                      setDoctorId(d.id);
                      setDoctorOpen(false);
                      setSelectedShiftId(null); // Reset ca làm khi đổi bác sĩ
                    }}
                  >
                    <Avatar uri={d.photoURL} name={d.name} size={44} />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text 
                        // ✅ Áp dụng màu chữ trực tiếp theo trạng thái selected
                        style={[
                            newStyles.doctorName,
                            selected && { color: '#fff' }
                        ]}
                      >
                        {d.name || 'Bác sĩ ' + d.id}
                      </Text>
                      <Text 
                        // ✅ Áp dụng màu chữ trực tiếp theo trạng thái selected
                        style={[
                            newStyles.doctorSubtitle,
                            selected && { color: COLORS.accentLight }
                        ]}
                      >
                        {specialtyMap[d.specialty_id || ''] || 'Chuyên khoa'}
                      </Text>
                    </View>
                    {selected && <Text style={{ color: '#fff', fontSize: 20 }}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}
    </Card>
  );

  const DateShiftSelector = (
    <Card title="4. Chọn Ngày & Giờ Khám">
      {/* Date Selector */}
      <Text style={newStyles.subSectionTitle}>Ngày khám ({DAYS[weekdayFromYMD(date)]})</Text>
      <TouchableOpacity
        onPress={() => {
          if (DateTimePicker) setShowNativeDatePicker(true);
          else setCalendarOpen(true);
        }}
        style={[newStyles.dateInput, !doctorId && newStyles.dropdownDisabled]}
        disabled={!doctorId}
      >
        <Text style={{ color: doctorId ? COLORS.textDark : COLORS.subtitle, fontWeight: '600' }}>{date}</Text>
        <Text style={{ color: doctorId ? COLORS.textDark : COLORS.subtitle }}>▼</Text>
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
            setSelectedShiftId(null); // Reset ca làm khi đổi ngày
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
          setSelectedShiftId(null); // Reset ca làm khi đổi ngày
        }}
      />
      
      {/* Shift Selector */}
      <Text style={[newStyles.subSectionTitle, { marginTop: 15 }]}>
        Ca làm ({shiftsForDate.length} ca khả dụng)
      </Text>
      
      {doctorId ? (
        shiftsForDate.length > 0 ? (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={shiftsForDate}
            keyExtractor={s => s.id}
            contentContainerStyle={{ paddingVertical: 4 }}
            renderItem={({ item }) => {
              // ----------------------------------------------------
              // ✅ Logic: Kiểm tra ca đã trôi qua chưa
              // ----------------------------------------------------
              // 1. Lấy thời điểm bắt đầu ca (ISO string)
              const shiftStartISO = `${date}T${item.start_time}:00`;
              const shiftStart = new Date(shiftStartISO);
              
              // 2. Lấy thời điểm hiện tại
              const now = new Date();
              
              // 3. Kiểm tra xem ca đã trôi qua chưa (thời điểm bắt đầu < thời điểm hiện tại)
              // Chỉ kiểm tra isPast nếu ngày được chọn là ngày hôm nay
              const isToday = toYMD(shiftStart) === toYMD(now);
              const isPast = isToday && (shiftStart.getTime() < now.getTime());
              // ----------------------------------------------------

              // Kiểm tra xem ca có bị trùng lịch khác không
              const isConflict = bookedForDate.some(b =>
                overlap(b.start, b.end, item.start_time, item.end_time),
              );
              
              // Tổng hợp trạng thái vô hiệu hóa: Đã kín (Conflict) HOẶC Đã trôi qua (isPast)
              const disabled = isConflict || isPast;

              const selected = selectedShiftId === item.id;
              
              // Tạo một chuỗi thông tin phụ (Phòng/Đã kín/Đã trôi qua)
              const subInfo = isPast
                ? 'Đã qua' // Trạng thái mới: ca đã hết giờ
                : isConflict
                  ? 'Đã kín' 
                  : item.room_id 
                    ? roomsMap[item.room_id] ? `P. ${roomsMap[item.room_id]}` : 'Có phòng' 
                    : 'N/A';

              return (
                <TouchableOpacity
                  onPress={() => !disabled && setSelectedShiftId(item.id)}
                  style={[
                    newStyles.chip,
                    selected && newStyles.chipSelected,
                    disabled && newStyles.chipDisabled,
                  ]}
                  disabled={disabled}
                >
                  <Text style={selected ? newStyles.chipTextSelected : newStyles.chipText}>
                    {item.start_time.substring(0, 5)} - {item.end_time.substring(0, 5)}
                  </Text>
                  <Text style={[
                    newStyles.chipSubText, 
                    selected && { color: COLORS.accentLight }, 
                    disabled && { color: COLORS.subtitle }
                  ]}>
                    {subInfo}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        ) : (
          <Text style={{ color: COLORS.danger, fontWeight: '600' }}>
            Bác sĩ chưa có ca làm việc cho ngày {date}. Vui lòng chọn ngày khác.
          </Text>
        )
      ) : (
        <Text style={{ color: COLORS.subtitle }}>Hãy chọn bác sĩ trước.</Text>
      )}
      
      {/* Tóm tắt ca đã chọn */}
      {selectedShiftId && (
        <View style={{ marginTop: 15, padding: 10, backgroundColor: COLORS.accentLight, borderRadius: 8 }}>
            <Text style={{ color: COLORS.textDark, fontWeight: '700' }}>
                Đã chọn: {date}
                <Text style={{ color: COLORS.accent }}> • </Text>
                {(() => {
                    const s = shiftsForDate.find(x => x.id === selectedShiftId);
                    // Hiển thị giờ, phút (cắt bỏ giây)
                    return s ? `${s.start_time.substring(0, 5)} - ${s.end_time.substring(0, 5)}` : '--:--';
                })()}
            </Text>
        </View>
      )}
    </Card>
  );

  return (
    <SafeAreaView style={newStyles.safeArea}>
      <ScrollView contentContainerStyle={newStyles.container} showsVerticalScrollIndicator={false}>
        <Text style={newStyles.pageTitle}>Đặt lịch khám mới</Text>
        <Text style={newStyles.pageSubtitle}>Điền thông tin theo các bước dưới đây để hoàn tất việc đặt lịch.</Text>
        
        {SpecialtySelector}
        <View style={newStyles.spacer} />
        {ServiceSelector}
        <View style={newStyles.spacer} />
        {DoctorSelector}
        <View style={newStyles.spacer} />
        {DateShiftSelector}
        <View style={newStyles.spacer} />

        {/* Đặt hộ người khác */}
        <Card title="5. Dành cho người khác (Tùy chọn)">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ color: COLORS.textDark, fontWeight: '600' }}>
              {bookingForOther ? 'Đang đặt hộ người khác' : 'Đặt cho bản thân'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setBookingForOther(v => !v);
                setOtherPatientId('');
              }}
              style={[newStyles.switchBtn, bookingForOther && newStyles.switchBtnOn]}
            >
              <Text
                style={[
                    newStyles.switchBtnText,
                    bookingForOther && { color: '#fff' }
                ]}
              >
                {bookingForOther ? 'Tắt' : 'Bật'}
              </Text>
            </TouchableOpacity>
          </View>
          {bookingForOther && (
            <View style={{ marginTop: 8 }}>
              <Input
                placeholder="Nhập UID bệnh nhân (VD: xyz123)"
                value={otherPatientId}
                onChangeText={setOtherPatientId}
              />
            </View>
          )}
        </Card>
        
        <View style={{ height: 100 }} /> 
      </ScrollView>

      {/* FOOTER CỐ ĐỊNH */}
      <View style={newStyles.footer}>
        <Button
          title="Xác nhận & Đặt lịch"
          onPress={onConfirm}
          disabled={
            !selectedSpecialtyId ||
            !selectedServiceId ||
            !doctorId ||
            !date ||
            !selectedShiftId ||
            (bookingForOther && !otherPatientId)
          }
          style={{ backgroundColor: COLORS.primary }}
        />
      </View>
    </SafeAreaView>
  );
}

/* --------------------------- Calendar Modal (GIỮ NGUYÊN) --------------------------- */
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
      <View style={_calendarModalStyles.modalBackdrop}>
        <View style={[_calendarModalStyles.modalContent, { maxWidth: 360 }]}>
          <View style={_calendarModalStyles.calendarHeader}>
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

          <View style={_calendarModalStyles.calendarGrid}>
            {DAYS.map(h => (
              <Text key={h} style={{ textAlign: 'center', fontWeight: '700' }}>
                {h}
              </Text>
            ))}
            {monthCells(month).map((d, idx) => {
              const dim = month.getMonth() === d.getMonth();
              const isSelected = toYMD(d) === toYMD(initialDate);
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    _calendarModalStyles.calendarCell,
                    isSelected && { backgroundColor: COLORS.accentLight, borderRadius: 4 },
                  ]}
                  onPress={() => onPick(d)}
                >
                  <Text
                    style={{
                      textAlign: 'center',
                      color: dim ? COLORS.textDark : COLORS.subtitle,
                      fontWeight: isSelected ? '700' : '400',
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

/* ------------------------------- Styles MỚI (ĐÃ SỬA LỖI) ------------------------------- */
const newStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { padding: 16 },
  
  // Title & Subtitle
  pageTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textDark, marginBottom: 4 },
  pageSubtitle: { fontSize: 14, color: COLORS.subtitle, marginBottom: 15 },
  spacer: { height: 16 },

  // Card Component
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 14,
    padding: 16,
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 0, // Xóa margin bottom ở đây, dùng spacer ở ngoài
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 8,
  },
  subSectionTitle: {
    marginTop: 10,
    marginBottom: 6,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  warningText: {
    color: COLORS.danger, 
    padding: 8, 
    fontWeight: '500' 
  },

  // Dropdown/Input Styles (Generic)
  dropdownHeader: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardBackground,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownHeaderText: {
    fontWeight: '600',
    color: COLORS.textDark,
    fontSize: 15,
  },
  dropdownDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
  },
  dropdownBody: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardBackground,
    padding: 4,
    // ĐÃ GỠ bỏ maxHeight: 220, để ScrollView bên trong có thể cuộn đúng
  },
  dropdownItem: { 
    paddingVertical: 10, 
    paddingHorizontal: 10, 
    borderRadius: 8,
    marginVertical: 2,
  },
  dropdownItemSelected: {
    backgroundColor: COLORS.accentLight,
  },
  dropdownItemText: {
    fontWeight: '600',
    color: COLORS.textDark,
  },
  serviceDetailText: {
    color: COLORS.subtitle,
    fontSize: 12,
    marginTop: 2,
  },

  // Doctor Selector
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginVertical: 4,
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  // ✅ ĐÃ SỬA: Chỉ giữ lại style nền/viền. Màu chữ được áp dụng trong phần render.
  doctorRowSelected: { 
    backgroundColor: COLORS.accent, 
    borderColor: COLORS.accent,
  },
  doctorName: { fontWeight: '700', fontSize: 15, color: COLORS.textDark },
  doctorSubtitle: { color: COLORS.subtitle, fontSize: 13, marginTop: 2 },

  // Date Input
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardBackground,
  },

  // Chips (Shift Selector)
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: COLORS.accentLight,
    borderWidth: 1,
    borderColor: COLORS.accentLight,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  chipSelected: { 
    backgroundColor: COLORS.accent, 
    borderColor: COLORS.accent,
  },
  chipDisabled: {
    opacity: 0.6,
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
  },
  chipText: { 
    color: COLORS.textDark, 
    fontWeight: '600' 
  },
  chipTextSelected: { 
    color: '#fff', 
    fontWeight: '600' 
  },
  chipSubText: {
    fontSize: 11,
    color: COLORS.subtitle,
    marginTop: 2,
  },
  
  // Switch
  switchBtn: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#f5f5f5',
  },
  switchBtnOn: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  // ✅ Đã thêm style cho Text để áp dụng màu chữ bên trong TouchableOpacity
  switchBtnText: {
    color: COLORS.textDark,
    fontWeight: '600',
  },

  // Footer (Sticky Button)
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.cardBackground,
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 8,
  },
});

// Styles cũ cho Calendar Modal (Đặt tên khác để tránh conflict)
const _calendarModalStyles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    margin: 20,
    backgroundColor: COLORS.cardBackground,
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

// Giữ lại styles cũ trống để đảm bảo không có lỗi tham chiếu nếu components khác vẫn dùng
const styles = StyleSheet.create({
    container: {},
    title: {},
    modalBackdrop: _calendarModalStyles.modalBackdrop,
    modalContent: _calendarModalStyles.modalContent,
    calendarHeader: _calendarModalStyles.calendarHeader,
    calendarGrid: _calendarModalStyles.calendarGrid,
    calendarCell: _calendarModalStyles.calendarCell,
});