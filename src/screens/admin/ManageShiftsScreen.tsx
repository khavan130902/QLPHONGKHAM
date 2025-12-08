// file: ManageShiftsScreen.tsx
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
  Switch, 
} from 'react-native';
import Avatar from '@/components/Avatar';
import Input from '@/components/Input';
import Button from '@/components/Button';
import db from '@/services/firestore';
import safeAlert from '@/utils/safeAlert';
import Icon from '@react-native-vector-icons/feather';

// @ts-ignore (optional dependency)
let DateTimePicker: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  DateTimePicker = require('@react-native-community/datetimepicker').default;
} catch (e) {
  DateTimePicker = null;
}

const DAYS = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

/** ====== BẢNG MÀU THỐNG NHẤT VÀ HIỆN ĐẠI HƠN ====== */
const COLORS = {
  primary: '#2596be',       // Xanh đậm chủ đạo
  primaryLight: '#E3F2FD',  // Xanh nhạt cho nền active/selected
  secondary: '#FF9800',     // Cam (Dùng cho các điểm nhấn phụ)
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

/** ====== Date helpers ====== */
function dateAtNoonLocal(y: number, mZeroBased: number, d: number) {
  return new Date(y, mZeroBased, d, 12, 0, 0, 0);
}
function parseYMDToLocalDate(ymd: string): Date | null {
  const parts = ymd.split('-').map(p => parseInt(p, 10));
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const [y, m, d] = parts;
  return dateAtNoonLocal(y, m - 1, d);
}
function toYMD(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Hàm mới: Chuyển YYYY-MM-DD sang DD/MM/YYYY để hiển thị
function formatDateDisplay(ymd: string) {
    if (!ymd) return '';
    const dateObj = parseYMDToLocalDate(ymd); 
    if (!dateObj) return ymd; // Trả về nguyên trạng nếu lỗi
  
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${d}/${m}/${y}`; 
}

function weekdayFromYMD(ymd: string) {
  const parts = ymd.split('-').map(p => parseInt(p, 10));
  if (parts.length !== 3 || parts.some(isNaN)) return 0;
  const [y, m, d] = parts;
  const utc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)); 
  return utc.getUTCDay();
}

export default function ManageShiftsScreen() {
  const { width } = useWindowDimensions();
  const [shifts, setShifts] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Lấy ngày hiện tại ở định dạng YYYY-MM-DD
  const todayYMD = useMemo(() => toYMD(new Date()), []);

  // UI state
  const [doctorPickerVisible, setDoctorPickerVisible] = useState(false);
  const [roomsCollapsed, setRoomsCollapsed] = useState(true);
  const [formVisible, setFormVisible] = useState(true);

  // form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [doctorId, setDoctorId] = useState<string>('');
  
  const [useSpecificDate, setUseSpecificDate] = useState(true); 
  const [dayOfWeek, setDayOfWeek] = useState<number>(1); 

  const [specificDate, setSpecificDate] = useState<string>(''); 
  const selectedDateObj = useMemo(
    () => (specificDate ? parseYMDToLocalDate(specificDate) : null),
    [specificDate],
  );

  const [showDatePicker, setShowDatePicker] = useState(false);
  // Khởi tạo calendarMonth bằng ngày hiện tại
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());

  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('12:00');
  const [roomId, setRoomId] = useState<string | null>(null);
  
  const [busy, setBusy] = useState(false);

  // Derived State (Giữ nguyên)
  const selectedDoctor = useMemo(
    () => doctors.find(d => d.id === doctorId) || {},
    [doctors, doctorId],
  );

  const selectedRoom = useMemo(
    () => rooms.find(r => r.id === roomId) || {},
    [rooms, roomId],
  );

  const specialtyMap = useMemo(() => {
    const m: Record<string, string> = {};
    specialties.forEach(s => {
      if (s && s.id) m[s.id] = s.name || '';
    });
    return m;
  }, [specialties]);


  useEffect(() => {
    loadDoctors();
    loadRooms();
    loadSpecialties();
    loadShifts();
  }, []);

  // load functions (Giữ nguyên)
  async function loadSpecialties() {
    try {
      const snap = await db.collection('specialties').orderBy('name').get();
      setSpecialties(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    } catch (e) {
      console.warn('load specialties', e);
    }
  }

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
    setUseSpecificDate(true); 
    setSpecificDate('');
    setStartTime('09:00');
    setEndTime('12:00');
    setRoomId(null);
  }

  function onEdit(item: any) {
    setEditingId(item.id);
    setDoctorId(item.doctor_id || '');
    setStartTime(item.start_time || '09:00');
    setEndTime(item.end_time || '12:00');
    setRoomId(item.room_id || null);

    if (item.date) {
      // Ca cụ thể
      setUseSpecificDate(true);
      setSpecificDate(item.date);
    } else {
      // Ca định kỳ
      setUseSpecificDate(false);
      setSpecificDate('');
      setDayOfWeek(item.day_of_week ?? 1);
    }
    
    setFormVisible(true);
  }

  async function saveShift() {
    if (!doctorId) return safeAlert('Thông tin thiếu', 'Chọn bác sĩ');
    if (!startTime || !endTime)
      return safeAlert('Thông tin thiếu', 'Chọn giờ bắt đầu/kết thúc');
    
    // Kiểm tra logic theo chế độ đang chọn
    if (useSpecificDate && !specificDate) {
        return safeAlert('Thông tin thiếu', 'Chọn ngày cụ thể cho ca này');
    }
    if (!useSpecificDate && (dayOfWeek === undefined || dayOfWeek === null)) {
        return safeAlert('Thông tin thiếu', 'Chọn Thứ trong tuần cho ca định kỳ');
    }

    setBusy(true);
    try {
      const payload: any = {
        doctor_id: doctorId,
        start_time: startTime,
        end_time: endTime,
        room_id: roomId || null,
        updated_at: new Date().toISOString(),
      };

      if (useSpecificDate && specificDate) {
        // Ca cụ thể
        payload.date = specificDate; // YYYY-MM-DD
        payload.day_of_week = weekdayFromYMD(specificDate); // Tự tính Thứ từ ngày
      } else {
        // Ca định kỳ theo Thứ
        payload.date = null; // Quan trọng: Đặt là null để xác định ca định kỳ
        payload.day_of_week = dayOfWeek; // (0..6)
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

  // render 7×6 cells của tháng (Giữ nguyên)
  function renderMonthDays(monthDate: Date) {
    const y = monthDate.getFullYear();
    const m = monthDate.getMonth();
    const first = dateAtNoonLocal(y, m, 1);
    const startDay = first.getDay(); 
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

  const isLargeScreen = width > 900;
  
  // Component Form (Tạo/Sửa)
  const FormComponent = (
    <View style={[styles.card, isLargeScreen ? styles.formColumn : undefined]}>
        <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>
              {editingId ? 'Sửa ca làm việc' : 'Tạo ca làm việc mới'}
            </Text>
            {/* Thay thế Text bằng Icon */}
            <TouchableOpacity
              onPress={() => setFormVisible(v => !v)}
              style={styles.toggleButton}
            >
              <Icon 
                name={formVisible ? 'chevron-up' : 'chevron-down'} 
                size={24} 
                color={COLORS.primary} 
              />
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
                  <View style={styles.doctorInfoRow}>
                    <Avatar
                      uri={selectedDoctor.photoURL}
                      name={selectedDoctor.name}
                      size={40}
                    />
                    <View style={styles.doctorInfoText}>
                      <Text style={styles.doctorName}>
                        {selectedDoctor.name || 'Chọn bác sĩ'}
                      </Text>
                      <Text style={styles.doctorSpecialty}>
                        {specialtyMap[selectedDoctor.specialty_id] || 'Chưa rõ'}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.placeholderText}>Chọn bác sĩ...</Text>
                )}
              </TouchableOpacity>

              {/* Toggle Chọn Ngày Cụ Thể / Thứ Trong Tuần */}
              <View style={styles.formSection}>
                <View style={styles.toggleRow}>
                    <Text style={[styles.label, {marginTop: 0, marginBottom: 0}]}>
                        Loại ca: {useSpecificDate ? 'Ngày cụ thể' : 'Định kỳ (Theo Thứ)'}
                    </Text>
                    <Switch
                        value={useSpecificDate}
                        onValueChange={setUseSpecificDate}
                        thumbColor={useSpecificDate ? COLORS.primary : COLORS.textLight}
                        trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
                    />
                </View>
                {/* ------------------------------------------- */}
                {/* 1. CHỌN NGÀY CỤ THỂ (UseSpecificDate = TRUE) */}
                {/* ------------------------------------------- */}
                {useSpecificDate ? (
                  <TouchableOpacity
                    onPress={() => {
                      if (DateTimePicker) setShowDatePicker(true);
                      else setCalendarVisible(true);
                    }}
                    style={styles.dateInput}
                  >
                    {/* Thêm Icon Calendar */}
                    <Icon 
                      name="calendar" 
                      size={18} 
                      color={specificDate ? COLORS.textDark : COLORS.placeholder} 
                      style={{ marginRight: 8 }} 
                    />
                    <Text
                      style={{
                        color: specificDate ? COLORS.textDark : COLORS.placeholder,
                        fontWeight: '500',
                      }}
                    >
                      {/* ĐÃ SỬA: Hiển thị ngày dưới dạng DD/MM/YYYY */}
                      {formatDateDisplay(specificDate) || 'Chọn ngày làm việc'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                /* -------------------------------------------------- */
                /* 2. CHỌN THỨ TRONG TUẦN (UseSpecificDate = FALSE) */
                /* -------------------------------------------------- */
                    <View style={styles.daysContainer}>
                        {[1, 2, 3, 4, 5, 6, 0].map(dayIndex => (
                            <TouchableOpacity
                                key={dayIndex}
                                onPress={() => setDayOfWeek(dayIndex)}
                                style={[
                                    styles.dayChip,
                                    dayOfWeek === dayIndex ? styles.chipSelected : styles.chipDefault
                                ]}
                            >
                                <Text style={dayOfWeek === dayIndex ? styles.chipTextSelected : styles.chipTextDefault}>
                                    {DAYS[dayIndex].replace('Chủ nhật', 'CN').replace('Thứ ', 'T')}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
              </View>

              {/* Native DateTimePicker (iOS/Android) */}
              {showDatePicker && DateTimePicker && (
                <DateTimePicker
                  value={
                    selectedDateObj
                      ? selectedDateObj
                      : dateAtNoonLocal(
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

              {/* Calendar nội bộ (Fallback Modal) - ĐÃ CẬP NHẬT */}
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
                        <Icon name="chevron-left" size={24} color={COLORS.primary} />
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
                        <Icon name="chevron-right" size={24} color={COLORS.primary} />
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
                          const cellYMD = toYMD(cell);
                          const isThisMonth =
                            cell.getMonth() === calendarMonth.getMonth();
                          const isSelected =
                            specificDate === cellYMD;
                          const isToday = cellYMD === todayYMD; // Kiểm tra ngày hiện tại

                          return (
                            <TouchableOpacity
                              key={idx}
                              style={[
                                styles.calendarCell,
                                isToday && styles.calendarCellToday, // Highlight ngày hôm nay
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
                                  isToday && styles.calendarCellTodayText, // Màu chữ cho ngày hôm nay
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
                   {/* Thay thế Text bằng Icon */}
                  <Icon 
                    name={roomsCollapsed ? 'chevron-down' : 'chevron-up'} 
                    size={18} 
                    color={COLORS.textLight} 
                  />
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
                  title={editingId ? 'Cập nhật ca' : 'Tạo ca'}
                  onPress={saveShift}
                  disabled={busy || !doctorId || !startTime || !endTime}
                  style={styles.primaryButton}
                  textStyle={styles.primaryButtonText}
                />
                <View style={{ width: 12 }} />
                <Button
                  title="Hủy/Xóa form"
                  onPress={clearForm}
                  style={styles.secondaryButton}
                  textStyle={styles.secondaryButtonText}
                />
              </View>
            </View>
        )}
    </View>
  );

  // Component Danh sách ca
  const ListComponent = (
    <View style={[styles.card, isLargeScreen ? styles.listColumn : undefined]}>
        <Text style={styles.sectionTitle}>Danh sách ca đã tạo</Text>
          {loading ? (
            <ActivityIndicator color={COLORS.primary} size="large" style={{marginTop: 20}} />
          ) : (
            <FlatList
              data={shifts}
              keyExtractor={s => s.id}
              scrollEnabled={false}
              ListEmptyComponent={() => (
                <Text style={styles.emptyListText}>
                  Chưa có ca làm việc nào được tạo.
                </Text>
              )}
              renderItem={({ item }) => {
                const doc = doctors.find(d => d.id === item.doctor_id) || {};
                const room = rooms.find(r => r.id === item.room_id) || {};

                // Hiển thị ngày đã chọn theo format DD/MM/YYYY
                const shiftDateText = item.date
                  ? formatDateDisplay(item.date) // Dùng hàm mới
                  : DAYS[item.day_of_week] + ' (Định kỳ)'; 

                return (
                  <View style={styles.shiftCard}>
                    <View style={styles.shiftCardContent}>
                      <Avatar uri={doc.photoURL} name={doc.name} size={48} />
                      <View style={styles.shiftCardText}>
                        <Text style={styles.shiftDoctorName}>
                          {doc.name || item.doctor_id}
                        </Text>
                        {/* Thay thế emoji bằng Icon */}
                        <View style={styles.detailRow}>
                            <Icon name="map-pin" size={14} color={COLORS.textLight} style={styles.detailIcon} />
                            <Text style={styles.shiftDetailText}>
                                {room.name || 'Chưa phân phòng'}
                            </Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Icon name="calendar" size={14} color={COLORS.textLight} style={styles.detailIcon} />
                            <Text style={styles.shiftDetailText}>
                                {shiftDateText}
                            </Text>
                            <Icon name="clock" size={14} color={COLORS.textLight} style={[styles.detailIcon, {marginLeft: 10}]} />
                            <Text style={styles.shiftDetailText}>
                                {item.start_time} - {item.end_time}
                            </Text>
                        </View>
                      </View>
                    </View>
                    
                    {/* Thay thế Button bằng TouchableOpacity có Icon */}
                    <View style={styles.shiftCardActions}>
                      <TouchableOpacity
                        onPress={() => onEdit(item)}
                        style={styles.editButton}
                      >
                          <Icon name="edit" size={16} color={COLORS.cardBackground} style={{ marginRight: 5 }} />
                          <Text style={styles.editButtonText}>Sửa</Text>
                      </TouchableOpacity>
                      <View style={{ width: 8 }} />
                      <TouchableOpacity
                        onPress={() => onDelete(item.id)}
                        style={styles.deleteButton}
                      >
                          <Icon name="trash-2" size={16} color={COLORS.cardBackground} style={{ marginRight: 5 }} />
                          <Text style={styles.deleteButtonText}>Xóa</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
            />
          )}
    </View>
  );

  return (
    <ScrollView
      style={styles.fullContainer}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingHorizontal: isLargeScreen ? 30 : 16 }, 
      ]}
    >
      {/* App Bar mới */}
      <View style={styles.appBar}>
        <Text style={styles.appBarTitle}>Quản lý Ca Làm Việc</Text>
        <Text style={styles.appBarSubtitle}>
          Thiết lập lịch làm việc theo ngày cụ thể hoặc lịch định kỳ hàng tuần cho bác sĩ.
        </Text>
      </View>
      
      {/* Layout Responsive: 1 cột (di động) -> 2 cột (máy tính) */}
      {isLargeScreen ? (
        <View style={styles.columnsContainer}>
            {FormComponent}
            {ListComponent}
        </View>
      ) : (
        <>
            {FormComponent}
            {ListComponent}
        </>
      )}

      {/* Doctor Picker Modal (Giữ nguyên) */}
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
  // Responsive Columns (New Styles)
  columnsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 20, 
  },
  formColumn: {
    flex: 1,
    minWidth: 350,
    maxWidth: 450, 
  },
  listColumn: {
    flex: 2,
    minWidth: 400,
  },
  // Global Components (Updated Styles for Modern Look)
  appBar: {
    backgroundColor: COLORS.primary,
    paddingVertical: 20, 
    paddingHorizontal: 20,
    borderRadius: 16, 
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadowColor,
        shadowOffset: { width: 0, height: 6 }, 
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  appBarTitle: {
    color: COLORS.cardBackground,
    fontWeight: '800',
    fontSize: 28, 
    marginBottom: 4,
  },
  appBarSubtitle: {
    color: COLORS.primaryLight,
    fontSize: 15,
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    padding: 24, 
    borderRadius: 16, 
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontWeight: '800', 
    fontSize: 20, 
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
    marginBottom: 16, 
  },
  // Doctor Selector (Updated)
  selectedDoctor: {
    padding: 14, 
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
  },
  doctorInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorInfoText: {
    marginLeft: 12,
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
    color: COLORS.placeholder, 
    fontWeight: '600',
  },
  // Date Input (Updated - Added flexDirection)
  dateInput: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    flexDirection: 'row', // Thêm để căn icon và text
    alignItems: 'center',
  },
  // Time Inputs (Updated)
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
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10, 
    paddingHorizontal: 12,
    paddingVertical: 12, 
    backgroundColor: COLORS.background,
    color: COLORS.textDark,
    fontSize: 15,
  },
  // Rooms Chip Selector (Updated)
  roomToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  roomsContainer: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20, 
    marginBottom: 8,
    borderWidth: 1,
  },
  chipDefault: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipTextDefault: {
    color: COLORS.textDark,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: COLORS.cardBackground,
    fontWeight: '600',
  },
  // Actions (Updated)
  actionsRow: {
    flexDirection: 'row',
    marginTop: 24, 
    justifyContent: 'space-between',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 14, 
    borderRadius: 10,
  },
  primaryButtonText: {
    color: COLORS.cardBackground,
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: COLORS.border,
    paddingVertical: 14,
    borderRadius: 10,
  },
  secondaryButtonText: {
    color: COLORS.textLight,
    fontWeight: '700',
    fontSize: 16,
  },
  toggleButton: {
    padding: 8,
    borderRadius: 8,
  },
  // Shift List (Updated)
  shiftCard: {
    backgroundColor: COLORS.cardBackground,
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 5, 
    borderLeftColor: COLORS.primary, 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  // Thêm styles cho DetailRow
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  detailIcon: {
    marginRight: 4,
  },
  shiftDetailText: {
    color: COLORS.textLight,
    fontSize: 13,
  },
  shiftCardActions: {
    flexDirection: 'row',
    marginLeft: 10,
  },
  // Chỉnh sửa style Button thành TouchableOpacity có Icon
  editButton: {
    backgroundColor: COLORS.success,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
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
    marginTop: 20,
  },
  // Modals (Giữ nguyên)
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    margin: 20,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 24,
    width: '90%',
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
  // Thêm style cho ngày hiện tại
  calendarCellToday: {
    backgroundColor: COLORS.primaryLight, // Màu nền xanh nhạt
    borderColor: COLORS.primary,
    borderWidth: 1,
    borderRadius: 0, // Đảm bảo không bo góc nếu đã có border radius cho grid
  },
  calendarCellTodayText: {
    color: COLORS.primary, // Màu chữ xanh đậm
    fontWeight: '700',
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
  // Style cho phần chọn Thứ trong tuần (Giữ nguyên)
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 15,
    paddingVertical: 5,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    paddingVertical: 8,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dayChip: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginHorizontal: 2,
    borderRadius: 20,
  }
});