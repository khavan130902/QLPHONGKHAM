// screens/ManageShiftsScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
  Platform,
} from 'react-native';
import Avatar from '@/components/Avatar';
import Input from '@/components/Input';
import Button from '@/components/Button';
import db from '@/services/firestore';
import safeAlert from '@/utils/safeAlert';
import { generateSlotsForDate } from '@/services/timeSlots';

// @ts-ignore (optional dependency)
let DateTimePicker: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  DateTimePicker = require('@react-native-community/datetimepicker').default;
} catch (e) {
  DateTimePicker = null;
}

const DAYS = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

/** ====== Date helpers (LOCAL-safe) ====== */
/** tạo Date local ghim 12:00 để tránh lệch timezone/DST */
function dateAtNoonLocal(y: number, mZeroBased: number, d: number) {
  return new Date(y, mZeroBased, d, 12, 0, 0, 0);
}
/** parse 'YYYY-MM-DD' → Date local (12:00) */
function parseYMDToLocalDate(ymd: string): Date | null {
  const parts = ymd.split('-').map(p => parseInt(p, 10));
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const [y, m, d] = parts;
  return dateAtNoonLocal(y, m - 1, d);
}
/** format Date → 'YYYY-MM-DD' (dựa theo local components) */
function toYMD(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
/** weekday (0..6) nhưng tính theo UTC của "ngày thuần" để đồng nhất đa máy */
function weekdayFromYMD(ymd: string) {
  const parts = ymd.split('-').map(p => parseInt(p, 10));
  if (parts.length !== 3 || parts.some(isNaN)) return 0;
  const [y, m, d] = parts;
  const utc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)); // 12:00 UTC để tránh biên
  return utc.getUTCDay();
}

export default function ManageShiftsScreen() {
  const { width } = useWindowDimensions();
  const [shifts, setShifts] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // UI state
  const [doctorPickerVisible, setDoctorPickerVisible] = useState(false);
  const [roomsCollapsed, setRoomsCollapsed] = useState(true);
  const [formVisible, setFormVisible] = useState(true);

  // form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [doctorId, setDoctorId] = useState<string>('');
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);

  // luôn ưu tiên ngày cụ thể khi người dùng chọn (tự bật)
  const [useSpecificDate, setUseSpecificDate] = useState(false);
  const [specificDate, setSpecificDate] = useState<string>(''); // 'YYYY-MM-DD'
  const selectedDateObj = useMemo(
    () => (specificDate ? parseYMDToLocalDate(specificDate) : null),
    [specificDate],
  );

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());

  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('12:00');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const todayYMD = useMemo(() => toYMD(new Date()), []);
  const [genFromDate, setGenFromDate] = useState<string>(todayYMD);
  const [genToDate, setGenToDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return toYMD(d);
  });

  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadDoctors();
    loadRooms();
    loadSpecialties();
    loadShifts();
  }, []);

  async function loadSpecialties() {
    try {
      const snap = await db.collection('specialties').orderBy('name').get();
      setSpecialties(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    } catch (e) {
      console.warn('load specialties', e);
    }
  }

  const specialtyMap = useMemo(() => {
    const m: Record<string, string> = {};
    specialties.forEach(s => {
      if (s && s.id) m[s.id] = s.name || '';
    });
    return m;
  }, [specialties]);

  async function loadDoctors() {
    try {
      const snap = await db
        .collection('users')
        .where('role', '==', 'doctor')
        .get();
      setDoctors(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    } catch (e) {
      console.warn('load doctors', e);
    }
  }

  async function loadRooms() {
    try {
      const snap = await db.collection('rooms').get();
      setRooms(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    } catch (e) {
      console.warn('load rooms', e);
    }
  }

  async function loadShifts() {
    try {
      setLoading(true);
      const snap = await db
        .collection('work_shifts')
        .orderBy('doctor_id')
        .get();
      setShifts(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    } catch (e) {
      console.warn('load shifts', e);
      safeAlert('Lỗi', 'Không tải được ca làm việc');
    } finally {
      setLoading(false);
    }
  }

  function clearForm() {
    setEditingId(null);
    setDoctorId('');
    setDayOfWeek(1);
    setUseSpecificDate(false);
    setSpecificDate('');
    setStartTime('09:00');
    setEndTime('12:00');
    setRoomId(null);
  }

  function onEdit(item: any) {
    setEditingId(item.id);
    setDoctorId(item.doctor_id || '');
    // Ưu tiên hiển thị lại ngày cụ thể nếu có
    if (item.date) {
      setUseSpecificDate(true);
      setSpecificDate(item.date);
      setDayOfWeek(weekdayFromYMD(item.date));
    } else {
      setUseSpecificDate(false);
      setSpecificDate('');
      setDayOfWeek(item.day_of_week ?? 1);
    }
    setStartTime(item.start_time || '09:00');
    setEndTime(item.end_time || '12:00');
    setRoomId(item.room_id || null);
  }

  async function saveShift() {
    if (!doctorId) return safeAlert('Thông tin thiếu', 'Chọn bác sĩ');
    if (!startTime || !endTime)
      return safeAlert('Thông tin thiếu', 'Chọn giờ bắt đầu/kết thúc');

    setBusy(true);
    try {
      const payload: any = {
        doctor_id: doctorId,
        start_time: startTime,
        end_time: endTime,
        room_id: roomId || null,
        updated_at: new Date().toISOString(),
      };

      // Nếu có ngày cụ thể thì lưu ngày + day_of_week tính theo UTC
      if (useSpecificDate && specificDate) {
        payload.date = specificDate; // YYYY-MM-DD
        payload.day_of_week = weekdayFromYMD(specificDate);
      } else {
        // fallback theo dayOfWeek đang chọn (nếu bạn còn luồng theo thứ)
        payload.day_of_week = dayOfWeek;
      }

      if (editingId) {
        await db
          .collection('work_shifts')
          .doc(editingId)
          .set(payload, { merge: true });
        safeAlert('Thành công', 'Cập nhật ca thành công');
      } else {
        payload.created_at = new Date().toISOString();
        const ref = await db.collection('work_shifts').add(payload);
        safeAlert('Thành công', 'Tạo ca: ' + ref.id);
      }
      clearForm();
      await loadShifts();
    } catch (e) {
      console.warn('save shift', e);
      safeAlert('Lỗi', 'Lưu ca thất bại');
    } finally {
      setBusy(false);
    }
  }

  function onDelete(id: string) {
    Alert.alert('Xác nhận', 'Xóa ca này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await db.collection('work_shifts').doc(id).delete();
            safeAlert('Đã xóa', 'Ca đã được xóa');
            loadShifts();
          } catch (e) {
            console.warn('delete shift', e);
            safeAlert('Lỗi', 'Không xóa được ca');
          }
        },
      },
    ]);
  }

  async function onGenerateSlotsForDoctor() {
    if (!doctorId)
      return safeAlert('Chọn bác sĩ', 'Vui lòng chọn bác sĩ để sinh khung');
    setBusy(true);
    try {
      const from = parseYMDToLocalDate(genFromDate);
      const to = parseYMDToLocalDate(genToDate);
      if (!from || !to) {
        setBusy(false);
        return safeAlert('Lỗi', 'Định dạng ngày không hợp lệ. Dùng YYYY-MM-DD');
      }
      if (from.getTime() > to.getTime()) {
        setBusy(false);
        return safeAlert('Lỗi', 'Ngày bắt đầu phải ≤ ngày kết thúc');
      }

      let day = new Date(from);
      let totalCreated = 0;
      let daysCount = 0;

      while (day.getTime() <= to.getTime()) {
        const iso = toYMD(day);
        try {
          const created = await generateSlotsForDate(doctorId, iso);
          totalCreated += (created && created.length) || 0;
        } catch (e) {
          console.warn('generate slots for', iso, e);
        }
        daysCount++;
        day.setDate(day.getDate() + 1);
      }
      safeAlert('Hoàn tất', `Tạo ${totalCreated} khung cho ${daysCount} ngày`);
      setModalVisible(false);
    } catch (e) {
      console.warn('generate slots', e);
      safeAlert('Lỗi', 'Không sinh được khung giờ');
    } finally {
      setBusy(false);
    }
  }

  /** render 7×6 cells của tháng */
  function renderMonthDays(monthDate: Date) {
    const y = monthDate.getFullYear();
    const m = monthDate.getMonth();
    const first = dateAtNoonLocal(y, m, 1);
    const startDay = first.getDay(); // 0..6
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const daysInPrev = new Date(y, m, 0).getDate();
    const cells: Array<Date | null> = [];
    for (let i = 0; i < startDay; i++) {
      const day = daysInPrev - startDay + 1 + i;
      cells.push(dateAtNoonLocal(y, m - 1, day));
    }
    for (let d = 1; d <= daysInMonth; d++) cells.push(dateAtNoonLocal(y, m, d));
    let nextDay = 1;
    while (cells.length < 42) {
      cells.push(dateAtNoonLocal(y, m + 1, nextDay));
      nextDay++;
    }
    return cells;
  }

  function setDateFromObj(d: Date) {
    const iso = toYMD(d);
    setSpecificDate(iso);
    setUseSpecificDate(true);
    setDayOfWeek(weekdayFromYMD(iso));
  }

  return (
    <View
      style={[styles.container, { paddingHorizontal: width > 900 ? 48 : 16 }]}
    >
      <View style={styles.appBar}>
        <Text style={styles.appBarTitle}>Quản lý ca làm việc</Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 12,
          marginBottom: 8,
        }}
      >
        <Text style={{ fontWeight: '600' }}>Tạo / sửa ca làm việc</Text>
        <TouchableOpacity
          onPress={() => setFormVisible(v => !v)}
          style={{ padding: 6 }}
        >
          <Text style={{ color: '#1976d2' }}>
            {formVisible ? 'Ẩn' : 'Hiện'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Form (toggle show/hide) */}
      {formVisible && (
        <>
          {/* Doctor picker */}
          <Text style={{ color: '#666', marginBottom: 6 }}>Chọn bác sĩ</Text>
          <TouchableOpacity
            style={styles.selectedDoctor}
            onPress={() => setDoctorPickerVisible(true)}
          >
            {doctorId ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Avatar
                  uri={(doctors.find(d => d.id === doctorId) || {}).photoURL}
                  name={(doctors.find(d => d.id === doctorId) || {}).name}
                  size={40}
                />
                <View style={{ marginLeft: 8 }}>
                  <Text style={{ fontWeight: '700' }}>
                    {(doctors.find(d => d.id === doctorId) || {}).name ||
                      'Chọn bác sĩ'}
                  </Text>
                  <Text style={{ color: '#666', fontSize: 12 }}>
                    {specialtyMap[
                      (doctors.find(d => d.id === doctorId) || {}).specialty_id
                    ] || ''}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={{ color: '#1976d2' }}>Chọn bác sĩ...</Text>
            )}
          </TouchableOpacity>

          <Modal
            visible={doctorPickerVisible}
            animationType="slide"
            transparent
          >
            <View style={styles.modalBackdrop}>
              <View style={[styles.modalContent, { maxHeight: 480 }]}>
                <Text style={{ fontWeight: '700', marginBottom: 8 }}>
                  Chọn bác sĩ
                </Text>
                <ScrollView>
                  {doctors.map(doc => (
                    <TouchableOpacity
                      key={doc.id}
                      style={styles.doctorRow}
                      onPress={() => {
                        setDoctorId(doc.id);
                        setDoctorPickerVisible(false);
                      }}
                    >
                      <Avatar uri={doc.photoURL} name={doc.name} size={44} />
                      <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={{ fontWeight: '700' }}>{doc.name}</Text>
                        <Text style={{ color: '#666', fontSize: 12 }}>
                          {specialtyMap[doc.specialty_id] || ''}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'flex-end',
                    marginTop: 8,
                  }}
                >
                  <Button
                    title="Đóng"
                    onPress={() => setDoctorPickerVisible(false)}
                  />
                </View>
              </View>
            </View>
          </Modal>

          {/* Chọn ngày */}
          <View style={{ marginTop: 12 }}>
            <Text style={{ color: '#666', marginBottom: 6 }}>
              Chọn ngày (YYYY-MM-DD)
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (DateTimePicker) setShowDatePicker(true);
                else setCalendarVisible(true);
              }}
              style={styles.dateInput}
            >
              <Text style={{ color: specificDate ? '#111' : '#999' }}>
                {specificDate || 'YYYY-MM-DD'}
              </Text>
            </TouchableOpacity>

            {/* Native DateTimePicker */}
            {showDatePicker && DateTimePicker && (
              <DateTimePicker
                value={
                  selectedDateObj
                    ? selectedDateObj
                    : // mở tại hôm nay (12:00) để tránh lệch
                      dateAtNoonLocal(
                        new Date().getFullYear(),
                        new Date().getMonth(),
                        new Date().getDate(),
                      )
                }
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                onChange={(event: any, date?: Date) => {
                  // Android đóng dialog sau khi chọn/huỷ
                  if (Platform.OS === 'android') setShowDatePicker(false);
                  // iOS có event.type?—bảo vệ chung
                  if (event?.type === 'dismissed') return;
                  if (date) {
                    // Chuẩn hoá về 12:00 local
                    const localNoon = dateAtNoonLocal(
                      date.getFullYear(),
                      date.getMonth(),
                      date.getDate(),
                    );
                    setDateFromObj(localNoon);
                  }
                }}
              />
            )}

            {/* Calendar nội bộ khi không có native picker */}
            <Modal visible={calendarVisible} transparent animationType="fade">
              <View style={styles.modalBackdrop}>
                <View style={[styles.modalContent, { maxWidth: 360 }]}>
                  <View style={styles.calendarHeader}>
                    <TouchableOpacity
                      onPress={() => {
                        const prev = new Date(calendarMonth);
                        prev.setMonth(prev.getMonth() - 1);
                        setCalendarMonth(prev);
                      }}
                    >
                      <Text>{'◀'}</Text>
                    </TouchableOpacity>
                    <Text style={{ fontWeight: '700' }}>
                      {calendarMonth.toLocaleString(undefined, {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        const next = new Date(calendarMonth);
                        next.setMonth(next.getMonth() + 1);
                        setCalendarMonth(next);
                      }}
                    >
                      <Text>{'▶'}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.calendarGrid}>
                    {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(h => (
                      <Text
                        key={h}
                        style={{ textAlign: 'center', fontWeight: '700' }}
                      >
                        {h}
                      </Text>
                    ))}
                    {renderMonthDays(calendarMonth).map(
                      (cell: any, idx: number) => {
                        if (!cell)
                          return <View key={idx} style={styles.calendarCell} />;
                        const isThisMonth =
                          cell.getMonth() === calendarMonth.getMonth();
                        return (
                          <TouchableOpacity
                            key={idx}
                            style={styles.calendarCell}
                            onPress={() => {
                              setDateFromObj(cell);
                              setCalendarVisible(false);
                            }}
                          >
                            <Text
                              style={{
                                textAlign: 'center',
                                color: isThisMonth ? '#111' : '#bbb',
                              }}
                            >
                              {cell.getDate()}
                            </Text>
                          </TouchableOpacity>
                        );
                      },
                    )}
                  </View>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'flex-end',
                      marginTop: 8,
                    }}
                  >
                    <Button
                      title="Đóng"
                      onPress={() => setCalendarVisible(false)}
                    />
                  </View>
                </View>
              </View>
            </Modal>
          </View>

          {/* Thời gian */}
          <Text style={{ marginTop: 12 }}>Thời gian</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Input
                placeholder="Bắt đầu (HH:mm)"
                value={startTime}
                onChangeText={setStartTime}
              />
            </View>
            <View style={{ width: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 18 }}>→</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Input
                placeholder="Kết thúc (HH:mm)"
                value={endTime}
                onChangeText={setEndTime}
              />
            </View>
          </View>

          {/* Phòng */}
          <TouchableOpacity
            onPress={() => setRoomsCollapsed(v => !v)}
            style={{ marginTop: 12 }}
          >
            <Text style={{ color: '#666' }}>
              Chọn phòng (tuỳ chọn) {roomsCollapsed ? '▾' : '▴'}
            </Text>
          </TouchableOpacity>
          {!roomsCollapsed && (
            // Use a wrapping container so chips flow onto multiple lines on
            // narrow screens instead of being horizontally scrolled/overlapped.
            <View style={styles.roomsContainer}>
              {rooms.map(r => (
                <TouchableOpacity
                  key={r.id}
                  onPress={() => setRoomId(r.id)}
                  style={[
                    styles.chip,
                    roomId === r.id ? styles.chipSelected : undefined,
                  ]}
                >
                  <Text
                    style={
                      roomId === r.id
                        ? styles.chipTextSelected
                        : styles.chipText
                    }
                  >
                    {r.name || r.id}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionsRow}>
            <View style={{ flex: 1 }}>
              <Button
                title={editingId ? 'Cập nhật' : 'Tạo ca'}
                onPress={saveShift}
                disabled={busy}
              />
            </View>
            <View style={{ width: 8 }} />
            <Button title="Hủy" onPress={clearForm} />
          </View>
        </>
      )}

      {/* Danh sách ca */}
      <Text style={{ marginTop: 16, marginBottom: 8, fontWeight: '600' }}>
        Danh sách ca
      </Text>
      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={shifts}
          keyExtractor={s => s.id}
          renderItem={({ item }) => {
            const doc = doctors.find(d => d.id === item.doctor_id) || {};
            const showLine =
              (item.date && item.date) ||
              DAYS[item.day_of_week] ||
              item.day_of_week;
            return (
              <View style={styles.shiftCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Avatar uri={doc.photoURL} name={doc.name} size={40} />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={{ fontWeight: '700' }}>
                      {doc.name || item.doctor_id}
                    </Text>
                    <Text style={{ color: '#666' }}>
                      {showLine} • {item.start_time} - {item.end_time}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row' }}>
                    <Button title="Sửa" onPress={() => onEdit(item)} />
                    <View style={{ width: 8 }} />
                    <Button title="Xóa" onPress={() => onDelete(item.id)} />
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#eee',
    borderWidth: 1,
    borderColor: '#fff',
    marginBottom: 8,
  },
  chipSelected: { backgroundColor: '#1976d2', borderColor: '#1976d2' },
  chipText: { color: '#111' },
  chipTextSelected: { color: '#fff' },
  appBar: {
    backgroundColor: '#0D47A1',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  appBarTitle: { color: '#fff', fontWeight: '700', fontSize: 18 },
  selectedDoctor: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
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
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#fff',
  },
  actionsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  shiftCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fff',
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  dateInput: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  roomsContainer: {
    marginTop: 8,
    marginBottom: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  calendarCell: {
    width: '14.2857%',
    paddingVertical: 8,
  },
});
