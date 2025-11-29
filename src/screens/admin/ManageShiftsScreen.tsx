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
  Dimensions, // Thêm Dimensions để dùng cho responsive
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

/** ====== BẢNG MÀU MỚI ====== */
const COLORS = {
  primary: '#2596be',       // Xanh đậm chủ đạo (dùng lại màu appBar)
  primaryLight: '#E3F2FD',  // Xanh nhạt cho nền active/selected
  secondary: '#FF9800',     // Cam cho hành động phụ/nổi bật
  success: '#4CAF50',       // Xanh lá cho Sửa
  danger: '#F44336',        // Đỏ cho Xóa
  background: '#F8F9FA',    // Nền tổng thể: xám rất nhạt
  cardBackground: '#FFFFFF',// Nền card/modal: trắng tinh
  textDark: '#212529',      // Chữ đậm: gần đen
  textLight: '#6C757D',     // Chữ phụ: xám
  border: '#DEE2E6',        // Viền: xám nhạt
  placeholder: '#ADB5BD',   // Màu placeholder
  shadowColor: '#000',      // Màu đổ bóng
};

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

  // Tương tự, nếu doctor/room/specialty không tồn tại, tránh lỗi.
  const selectedDoctor = useMemo(
    () => doctors.find(d => d.id === doctorId) || {},
    [doctors, doctorId],
  );

  const selectedRoom = useMemo(
    () => rooms.find(r => r.id === roomId) || {},
    [rooms, roomId],
  );


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
    setFormVisible(true); // Đảm bảo form hiện ra khi edit
    // Cuộn lên đầu trang (nếu cần)
    // Tùy thuộc vào cách bạn quản lý ScrollView bên ngoài
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
        payload.date = null; // Quan trọng: phải xoá field date nếu không dùng
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

  // Chia cột (tối đa 2 cột) cho màn hình lớn hơn 900
  const isLargeScreen = width > 900;
  const columnContainerStyle = isLargeScreen
    ? styles.columnsContainer
    : undefined;
  const columnStyle = isLargeScreen ? styles.column : undefined;

  return (
    <ScrollView
      style={styles.fullContainer}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingHorizontal: isLargeScreen ? 48 : 16 },
      ]}
    >
      <View style={styles.appBar}>
        <Text style={styles.appBarTitle}>Quản lý ca làm việc</Text>
        <Text style={styles.appBarSubtitle}>
          Tạo, chỉnh sửa, và phân công ca làm việc cho bác sĩ.
        </Text>
      </View>

      <View style={columnContainerStyle}>
        {/* CỘT 1: FORM TẠO/SỬA CA */}
        <View style={[styles.card, columnStyle]}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>
              {editingId ? 'Sửa ca làm việc' : 'Tạo ca làm việc mới'}
            </Text>
            <TouchableOpacity
              onPress={() => setFormVisible(v => !v)}
              style={styles.toggleButton}
            >
              <Text style={styles.toggleButtonText}>
                {formVisible ? 'Ẩn form' : 'Hiện form'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form (toggle show/hide) */}
          {formVisible && (
            <View>
              {/* Doctor picker */}
              <Text style={styles.label}>Chọn bác sĩ</Text>
              <TouchableOpacity
                style={styles.selectedDoctor}
                onPress={() => setDoctorPickerVisible(true)}
              >
                {doctorId ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Avatar
                      uri={selectedDoctor.photoURL}
                      name={selectedDoctor.name}
                      size={40}
                    />
                    <View style={{ marginLeft: 12 }}>
                      <Text style={styles.doctorName}>
                        {selectedDoctor.name || 'Chọn bác sĩ'}
                      </Text>
                      <Text style={styles.doctorSpecialty}>
                        {specialtyMap[selectedDoctor.specialty_id] || ''}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.placeholderText}>Chọn bác sĩ...</Text>
                )}
              </TouchableOpacity>

              {/* Chọn ngày */}
              <View style={styles.formSection}>
                <Text style={styles.label}>Ngày (Cụ thể)</Text>
                <TouchableOpacity
                  onPress={() => {
                    if (DateTimePicker) setShowDatePicker(true);
                    else setCalendarVisible(true);
                  }}
                  style={styles.dateInput}
                >
                  <Text
                    style={{
                      color: specificDate ? COLORS.textDark : COLORS.placeholder,
                      fontWeight: '500',
                    }}
                  >
                    {specificDate || 'YYYY-MM-DD'}
                  </Text>
                </TouchableOpacity>

                {/* Native DateTimePicker (iOS/Android) */}
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
                    display={
                      Platform.OS === 'ios' ? 'spinner' : 'calendar'
                    }
                    onChange={(event: any, date?: Date) => {
                      // Android đóng dialog sau khi chọn/huỷ
                      if (Platform.OS === 'android') setShowDatePicker(false);
                      if (event?.type === 'dismissed') return;
                      if (date) {
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

                {/* Calendar nội bộ (Fallback) */}
                <Modal
                  visible={calendarVisible}
                  transparent
                  animationType="fade"
                >
                  <View style={styles.modalBackdrop}>
                    <View style={[styles.modalContent, styles.calendarModal]}>
                      <View style={styles.calendarHeader}>
                        <TouchableOpacity
                          onPress={() => {
                            const prev = new Date(calendarMonth);
                            prev.setMonth(prev.getMonth() - 1);
                            setCalendarMonth(prev);
                          }}
                        >
                          <Text style={styles.calendarNavText}>{'◀'}</Text>
                        </TouchableOpacity>
                        <Text style={styles.calendarMonthText}>
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
                          <Text style={styles.calendarNavText}>{'▶'}</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.calendarGrid}>
                        {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(h => (
                          <Text
                            key={h}
                            style={styles.calendarDayHeader}
                          >
                            {h}
                          </Text>
                        ))}
                        {renderMonthDays(calendarMonth).map(
                          (cell: any, idx: number) => {
                            if (!cell)
                              return (
                                <View key={idx} style={styles.calendarCell} />
                              );
                            const isThisMonth =
                              cell.getMonth() === calendarMonth.getMonth();
                            const isSelected =
                              specificDate === toYMD(cell);
                            return (
                              <TouchableOpacity
                                key={idx}
                                style={[
                                  styles.calendarCell,
                                  isSelected && styles.calendarCellSelected,
                                ]}
                                onPress={() => {
                                  setDateFromObj(cell);
                                  setCalendarVisible(false);
                                }}
                              >
                                <Text
                                  style={[
                                    styles.calendarCellText,
                                    !isThisMonth &&
                                      styles.calendarCellOutsideMonth,
                                    isSelected && styles.calendarCellTextSelected,
                                  ]}
                                >
                                  {cell.getDate()}
                                </Text>
                              </TouchableOpacity>
                            );
                          },
                        )}
                      </View>
                      <View style={styles.modalActions}>
                        <Button
                          title="Đóng"
                          onPress={() => setCalendarVisible(false)}
                          style={styles.modalCancelButton}
                          textStyle={styles.modalCancelButtonText}
                        />
                      </View>
                    </View>
                  </View>
                </Modal>
              </View>

              {/* Thời gian */}
              <View style={styles.formSection}>
                <Text style={styles.label}>Thời gian (HH:mm)</Text>
                <View style={styles.timeInputsContainer}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Input
                      placeholder="Bắt đầu (HH:mm)"
                      value={startTime}
                      onChangeText={setStartTime}
                      style={styles.inputStyle}
                      placeholderTextColor={COLORS.placeholder}
                    />
                  </View>
                  <View style={styles.timeSeparator}>
                    <Text style={{ fontSize: 18, color: COLORS.textLight }}>
                      →
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Input
                      placeholder="Kết thúc (HH:mm)"
                      value={endTime}
                      onChangeText={setEndTime}
                      style={styles.inputStyle}
                      placeholderTextColor={COLORS.placeholder}
                    />
                  </View>
                </View>
              </View>

              {/* Phòng */}
              <View style={styles.formSection}>
                <TouchableOpacity
                  onPress={() => setRoomsCollapsed(v => !v)}
                  style={styles.roomToggle}
                >
                  <Text style={styles.label}>
                    Phòng khám (Tuỳ chọn: {selectedRoom.name || 'Chưa chọn'})
                  </Text>
                  <Text style={styles.toggleIcon}>
                    {roomsCollapsed ? '▾' : '▴'}
                  </Text>
                </TouchableOpacity>

                {!roomsCollapsed && (
                  <View style={styles.roomsContainer}>
                    {rooms.map(r => (
                      <TouchableOpacity
                        key={r.id}
                        onPress={() => setRoomId(r.id)}
                        style={[
                          styles.chip,
                          roomId === r.id
                            ? styles.chipSelected
                            : styles.chipDefault,
                        ]}
                      >
                        <Text
                          style={
                            roomId === r.id
                              ? styles.chipTextSelected
                              : styles.chipTextDefault
                          }
                        >
                          {r.name || r.id}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Actions */}
              <View style={styles.actionsRow}>
                <Button
                  title={editingId ? 'Cập nhật' : 'Tạo ca'}
                  onPress={saveShift}
                  disabled={busy || !doctorId || !specificDate}
                  style={styles.primaryButton}
                  textStyle={styles.primaryButtonText}
                />
                <View style={{ width: 12 }} />
                <Button
                  title="Hủy"
                  onPress={clearForm}
                  style={styles.secondaryButton}
                  textStyle={styles.secondaryButtonText}
                />
              </View>
            </View>
          )}

          {/* Công cụ sinh khung giờ */}
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={styles.generateButton}
          >
            <Text style={styles.generateButtonText}>⚙️ Sinh khung giờ tự động</Text>
          </TouchableOpacity>
        </View>

        {/* CỘT 2: DANH SÁCH CA LÀM VIỆC */}
        <View style={[styles.card, columnStyle]}>
          <Text style={styles.sectionTitle}>Danh sách ca đã tạo</Text>
          {loading ? (
            <ActivityIndicator color={COLORS.primary} size="large" />
          ) : (
            <FlatList
              data={shifts}
              keyExtractor={s => s.id}
              scrollEnabled={false} // Cuộn theo ScrollView tổng
              ListEmptyComponent={() => (
                <Text style={styles.emptyListText}>
                  Chưa có ca làm việc nào được tạo.
                </Text>
              )}
              renderItem={({ item }) => {
                const doc = doctors.find(d => d.id === item.doctor_id) || {};
                const room =
                  rooms.find(r => r.id === item.room_id) || {};

                const shiftDateText = item.date
                  ? item.date
                  : DAYS[item.day_of_week];

                return (
                  <View style={styles.shiftCard}>
                    <View style={styles.shiftCardContent}>
                      <Avatar uri={doc.photoURL} name={doc.name} size={48} />
                      <View style={styles.shiftCardText}>
                        <Text style={styles.shiftDoctorName}>
                          {doc.name || item.doctor_id}
                        </Text>
                        <Text style={styles.shiftDetailText}>
                          📍 {room.name || 'Chưa phân phòng'}
                        </Text>
                        <Text style={styles.shiftDetailText}>
                          📅 {shiftDateText} • 🕒 {item.start_time} -{' '}
                          {item.end_time}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.shiftCardActions}>
                      <Button
                        title="Sửa"
                        onPress={() => onEdit(item)}
                        style={styles.editButton}
                        textStyle={styles.editButtonText}
                      />
                      <View style={{ width: 8 }} />
                      <Button
                        title="Xóa"
                        onPress={() => onDelete(item.id)}
                        style={styles.deleteButton}
                        textStyle={styles.deleteButtonText}
                      />
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>
      </View>

      {/* Modal Sinh Khung Giờ */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { maxWidth: 400 }]}>
            <Text style={styles.modalTitle}>Sinh Khung Giờ Hẹn</Text>
            <Text style={styles.label}>Bác sĩ áp dụng: {selectedDoctor.name || 'Chưa chọn'}</Text>

            <Text style={styles.label}>Từ ngày (YYYY-MM-DD)</Text>
            <Input
              placeholder="YYYY-MM-DD"
              value={genFromDate}
              onChangeText={setGenFromDate}
              style={styles.inputStyle}
              placeholderTextColor={COLORS.placeholder}
            />

            <Text style={styles.label}>Đến ngày (YYYY-MM-DD)</Text>
            <Input
              placeholder="YYYY-MM-DD"
              value={genToDate}
              onChangeText={setGenToDate}
              style={styles.inputStyle}
              placeholderTextColor={COLORS.placeholder}
            />

            <View style={{ height: 20 }} />

            <View style={styles.actionsRow}>
              <Button
                title="Thực hiện sinh khung"
                onPress={onGenerateSlotsForDoctor}
                disabled={busy || !doctorId}
                style={styles.primaryButton}
                textStyle={styles.primaryButtonText}
              />
            </View>
            <View style={styles.actionsRow}>
              <Button
                title="Đóng"
                onPress={() => setModalVisible(false)}
                style={styles.secondaryButton}
                textStyle={styles.secondaryButtonText}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Doctor Picker Modal (dùng lại code cũ) */}
      <Modal
        visible={doctorPickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDoctorPickerVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { maxHeight: 480, maxWidth: 400 }]}>
            <Text style={styles.modalTitle}>Chọn bác sĩ</Text>
            <ScrollView>
              {doctors.map(doc => (
                <TouchableOpacity
                  key={doc.id}
                  style={[
                    styles.doctorRow,
                    doctorId === doc.id && styles.doctorRowSelected,
                  ]}
                  onPress={() => {
                    setDoctorId(doc.id);
                    setDoctorPickerVisible(false);
                  }}
                >
                  <Avatar uri={doc.photoURL} name={doc.name} size={44} />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.doctorName}>
                      {doc.name}
                      {doctorId === doc.id && ' (Đã chọn)'}
                    </Text>
                    <Text style={styles.doctorSpecialty}>
                      {specialtyMap[doc.specialty_id] || ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <Button
                title="Đóng"
                onPress={() => setDoctorPickerVisible(false)}
                style={styles.modalCancelButton}
                textStyle={styles.modalCancelButtonText}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingVertical: 24,
  },
  // Responsive Columns
  columnsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  column: {
    flex: 1,
    minWidth: 350,
    marginHorizontal: 10,
  },
  // Global Components
  appBar: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12, // Bo tròn nhiều hơn
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  appBarTitle: {
    color: COLORS.cardBackground,
    fontWeight: '800', // Đậm hơn
    fontSize: 24, // To hơn
    marginBottom: 4,
  },
  appBarSubtitle: {
    color: COLORS.primaryLight,
    fontSize: 14,
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: 18,
    color: COLORS.textDark,
  },
  label: {
    color: COLORS.textLight,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 15,
    fontSize: 14,
  },
  formSection: {
    marginBottom: 12,
  },
  // Doctor Selector
  selectedDoctor: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  doctorName: {
    fontWeight: '700',
    color: COLORS.textDark,
    fontSize: 16,
  },
  doctorSpecialty: {
    color: COLORS.textLight,
    fontSize: 12,
  },
  placeholderText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  // Date Input
  dateInput: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  // Time Inputs
  timeInputsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeSeparator: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputStyle: {
    // Để ghi đè lên style của Input component
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.background,
    color: COLORS.textDark,
    fontSize: 15,
  },
  // Rooms Chip Selector
  roomToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  toggleIcon: {
    color: COLORS.primary,
    fontSize: 16,
  },
  roomsContainer: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
    borderRadius: 20, // Bo tròn dạng pill
    marginBottom: 8,
  },
  chipDefault: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
  },
  chipTextDefault: {
    color: COLORS.textDark,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: COLORS.cardBackground,
    fontWeight: '600',
  },
  // Actions
  actionsRow: {
    flexDirection: 'row',
    marginTop: 20,
    justifyContent: 'space-between',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: COLORS.cardBackground,
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: COLORS.border,
    paddingVertical: 12,
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: COLORS.textLight,
    fontWeight: '700',
    fontSize: 16,
  },
  toggleButton: {
    padding: 6,
    borderRadius: 8,
  },
  toggleButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  generateButton: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  generateButtonText: {
    color: COLORS.cardBackground,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Shift List
  shiftCard: {
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary, // Điểm nhấn màu sắc
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadowColor,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  shiftCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  shiftCardText: {
    marginLeft: 12,
    flex: 1,
  },
  shiftDoctorName: {
    fontWeight: '700',
    fontSize: 16,
    color: COLORS.textDark,
  },
  shiftDetailText: {
    color: COLORS.textLight,
    fontSize: 13,
    marginTop: 2,
  },
  shiftCardActions: {
    flexDirection: 'row',
    marginLeft: 10,
  },
  editButton: {
    backgroundColor: COLORS.success,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  editButtonText: {
    color: COLORS.cardBackground,
    fontWeight: '600',
    fontSize: 13,
  },
  deleteButton: {
    backgroundColor: COLORS.danger,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: COLORS.cardBackground,
    fontWeight: '600',
    fontSize: 13,
  },
  emptyListText: {
    textAlign: 'center',
    color: COLORS.textLight,
    fontStyle: 'italic',
    marginTop: 10,
  },
  // Modals (Dùng chung cho cả Doctor Picker và Generate)
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', // Nền tối hơn
  },
  modalContent: {
    margin: 20,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16, // Bo tròn nhiều hơn
    padding: 24, // Tăng padding
    width: '90%', // Chiếm 90% chiều rộng
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadowColor,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  modalTitle: {
    fontWeight: '800',
    fontSize: 20,
    marginBottom: 20,
    color: COLORS.textDark,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 10,
  },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  doctorRowSelected: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    marginVertical: 2,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 15,
  },
  modalCancelButton: {
    backgroundColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalCancelButtonText: {
    color: COLORS.textDark,
    fontWeight: '600',
  },
  // Calendar Modal
  calendarModal: {
    maxWidth: 340,
    padding: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  calendarNavText: {
    fontSize: 18,
    color: COLORS.primary,
    fontWeight: '700',
  },
  calendarMonthText: {
    fontWeight: '700',
    fontSize: 16,
    color: COLORS.textDark,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  calendarDayHeader: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontWeight: '700',
    color: COLORS.textDark,
    paddingVertical: 8,
    backgroundColor: COLORS.background,
  },
  calendarCell: {
    width: `${100 / 7}%`,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: COLORS.border,
  },
  calendarCellSelected: {
    backgroundColor: COLORS.primary,
  },
  calendarCellText: {
    textAlign: 'center',
    color: COLORS.textDark,
    fontWeight: '500',
  },
  calendarCellTextSelected: {
    color: COLORS.cardBackground,
    fontWeight: '700',
  },
  calendarCellOutsideMonth: {
    color: COLORS.placeholder,
  },
});