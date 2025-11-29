// screens/AppointmentDetail.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Keyboard,
  Alert, // Thêm Alert để xác nhận
} from 'react-native';
import Button from '@/components/Button';
import db from '@/services/firestore';
import { useAuth } from '@/context/AuthContext';
import safeAlert from '@/utils/safeAlert';
import Icon from '@react-native-vector-icons/feather'; // Thêm Icon để trang trí nút

type Note = {
  text: string;
  authorId: string;
  authorName?: string | null;
  createdAt: string;
};

type KV = { label: string; value?: string | number | null };

function stripUndefined<T>(val: T): T {
  if (Array.isArray(val)) {
    // @ts-ignore
    return val.map(stripUndefined);
  }
  if (val && typeof val === 'object') {
    const out: any = {};
    Object.entries(val as any).forEach(([k, v]) => {
      if (v === undefined) return;
      if (v && typeof v === 'object') out[k] = stripUndefined(v);
      else out[k] = v;
    });
    return out;
  }
  return val;
}

function parseMoney(n?: number | string | null): number {
  if (typeof n === 'number') return isFinite(n) ? n : 0;
  if (typeof n === 'string') {
    const cleaned = n.replace(/[^\d.-]/g, '');
    const v = Number(cleaned);
    return isFinite(v) ? v : 0;
  }
  return 0;
}

export default function AppointmentDetail({ route, navigation }: any) {
  const { appointmentId } = route?.params || {};
  const { user } = useAuth() as any;

  const [appointment, setAppointment] = useState<any>(null);
  const [patientProfile, setPatientProfile] = useState<any>(null);
  const [roomsMap, setRoomsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [notes, setNotes] = useState<Note[]>([]);
  const [notesInput, setNotesInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        if (!appointmentId) return;

        const doc = await db.collection('appointments').doc(appointmentId).get();
        if (!mounted) return;

        if (!doc.exists) {
          setLoading(false);
          return safeAlert('Thông tin', 'Không tìm thấy lịch hẹn');
        }

        const apptData = doc.data() as any;
        const appt = { id: doc.id, ...apptData };
        setAppointment(appt);

        const rawNotes = apptData?.notes;
        if (Array.isArray(rawNotes)) {
          setNotes(stripUndefined(rawNotes as Note[]));
        } else if (typeof rawNotes === 'string' && rawNotes.trim()) {
          setNotes([
            stripUndefined({
              text: rawNotes,
              authorId: apptData?.doctorId || '',
              authorName: null,
              createdAt:
                apptData?.updatedAt ||
                apptData?.createdAt ||
                new Date().toISOString(),
            }),
          ]);
        } else {
          setNotes([]);
        }

        const pid = apptData?.patientId;
        if (pid) {
          const pdoc = await db.collection('users').doc(pid).get();
          if (mounted)
            setPatientProfile({ id: pdoc.id, ...(pdoc.data() as any) });
        }

        try {
          const snap = await db.collection('rooms').get();
          if (!mounted) return;
          const m: Record<string, string> = {};
          snap.docs.forEach(d => {
            const data = d.data() as any;
            m[d.id] = data?.name || data?.label || d.id;
          });
          setRoomsMap(m);
        } catch {}
      } catch (e) {
        console.warn('load appointment', e);
        safeAlert('Lỗi', 'Không thể tải chi tiết lịch hẹn');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [appointmentId]);

  async function addNote() {
    if (!appointmentId) return;
    const body = notesInput.trim();
    if (!body) return safeAlert('Thông tin', 'Nhập ghi chú trước khi lưu');

    const newNote: Note = {
      text: body,
      authorId: user?.uid || '',
      authorName: user?.displayName ?? user?.email ?? null,
      createdAt: new Date().toISOString(),
    };

    try {
      setSaving(true);

      const ref = db.collection('appointments').doc(appointmentId);

      const snap = await ref.get();
      const data = snap.data() || {};
      const prevRaw = Array.isArray(data.notes) ? (data.notes as any[]) : [];
      const prev: Note[] = prevRaw.map(it => stripUndefined(it));
      const updated = [stripUndefined(newNote), ...prev];

      await ref.set(stripUndefined({ notes: updated }), { merge: true });

      setNotes(updated);
      setAppointment((p: any) => ({ ...(p || {}), notes: updated }));
      setNotesInput('');
      Keyboard.dismiss();
      safeAlert('Thành công', 'Đã thêm ghi chú');
    } catch (e: any) {
      console.error('addNote Error:', e);
      safeAlert(
        'Lỗi',
        `Không thể thêm ghi chú: ${(e && e.message) || String(e)}`,
      );
    } finally {
      setSaving(false);
    }
  }

  async function cancelAppointment() {
    if (!appointmentId) return;
    try {
      // 🌟 THÊM ALERT XÁC NHẬN TRƯỚC KHI HỦY
      Alert.alert(
        'Xác nhận hủy lịch',
        'Bạn có chắc chắn muốn hủy lịch hẹn này không? Hành động này không thể hoàn tác.',
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Đồng ý',
            onPress: async () => {
              await db.collection('appointments').doc(appointmentId).update({
                status: 'cancelled',
                cancelledBy: user?.uid,
                cancelledAt: new Date().toISOString(),
              });
              safeAlert('Đã hủy', 'Đã hủy lịch hẹn thành công.');
              navigation.goBack();
            },
            style: 'destructive',
          },
        ]
      );
    } catch (e) {
      console.warn('cancelAppointment', e);
      safeAlert('Lỗi', 'Hủy lịch thất bại');
    }
  }

  // 🌟 HÀM ĐIỀU HƯỚNG ĐẾN LỊCH SỬ KHÁM BỆNH CỦA BỆNH NHÂN
  function goToPatientHistory() {
    const patientId = appointment?.patientId;

    if (!patientId) {
      return safeAlert('Thông báo', 'Không có ID bệnh nhân để truy vấn lịch sử.');
    }
    navigation.navigate('PatientMedicalHistory', { focusedPatientId: patientId }); 
    
  }

  const formatMoney = (n?: number | string | null) =>
    `${(parseMoney(n) || 0).toLocaleString('vi-VN')}₫`;

  const toDateObj = (v: any) => {
    try {
      if (!v) return null;
      if (v?.toDate) return v.toDate();
      return new Date(v);
    } catch {
      return null;
    }
  };
  const formatTs = (v: any, locale = 'vi-VN') => {
    const d = toDateObj(v);
    return d ? d.toLocaleString(locale) : '-';
  };

  const statusInfo = useMemo(() => {
    const s = (appointment?.status || '').toLowerCase();
    const map: Record<string, { text: string; style: any }> = {
      pending: { text: 'Chờ duyệt', style: styles.pillPending },
      accepted: { text: 'Đã duyệt', style: styles.pillAccepted },
      completed: { text: 'Hoàn thành', style: styles.pillCompleted },
      cancelled: { text: 'Đã hủy', style: styles.pillCancelled },
    };
    return (
      map[s] || { text: appointment?.status || '-', style: styles.pillNeutral }
    );
  }, [appointment?.status]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator />
        <Text style={{ color: '#64748B', marginTop: 8 }}>Đang tải...</Text>
      </View>
    );
  }

  if (!appointment) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={{ color: '#64748B' }}>Không tìm thấy lịch hẹn</Text>
      </View>
    );
  }

  const m = appointment?.meta || {};
  const metaRows: KV[] = [
    { label: 'Dịch vụ', value: m.serviceName || m.service_type_name || '-' },
    { label: 'Chuyên khoa', value: m.specialtyName || m.specialtyId || '-' },
    {
      label: 'Giá',
      value: formatMoney(m.servicePrice ?? appointment?.price ?? 0),
    },
    { label: 'Thiết bị', value: m.bookedFrom || '-' },
    {
      label: 'Thời lượng',
      value: m.serviceDurationMin ? `${m.serviceDurationMin} phút` : '-',
    },
  ];

  const patientLine =
    (patientProfile?.name ||
      appointment.patientName ||
      appointment.patientId ||
      '-') +
    (patientProfile?.phone ||
    patientProfile?.phoneNumber ||
    appointment.patientPhone
      ? ' • ' +
        (patientProfile?.phone ||
          patientProfile?.phoneNumber ||
          appointment.patientPhone)
      : '');

  const startStr = formatTs(appointment.start);
  const endStr = appointment.end ? formatTs(appointment.end) : '-';
  const roomName = appointment.roomId
    ? roomsMap[appointment.roomId] || appointment.roomId
    : '-';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Chi tiết lịch</Text>

      {/* Tổng quan */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Tổng quan</Text>
          <View style={[styles.pillBase, statusInfo.style]}>
            <Text style={styles.pillText}>{statusInfo.text}</Text>
          </View>
        </View>

        <KVRow label="Bệnh nhân" value={patientLine} />
        
        {/* 🌟 NÚT XEM LỊCH SỬ BỆNH NHÂN */}
        {appointment.patientId && (
            <TouchableOpacity 
                onPress={goToPatientHistory}
                style={styles.historyButton}
                activeOpacity={0.8}
            >
                <Icon name="file-text" size={16} color="#FFFFFF" />
                <Text style={styles.historyButtonText}>
                    Xem Hồ Sơ Bệnh Nhân
                </Text>
            </TouchableOpacity>
        )}
        {/* 🌟 HẾT NÚT XEM LỊCH SỬ BỆNH NHÂN */}
        
        <View style={styles.divider} /> 
        <KVRow label="Phòng" value={roomName} />
        <KVRow label="Bắt đầu / Kết thúc" value={`${startStr} — ${endStr}`} />
        <View style={styles.divider} />
        <KVRow
          label="Giá"
          value={formatMoney(
            appointment?.meta?.servicePrice ?? appointment?.price ?? 0,
          )}
          strong
        />
      </View>

      {/* Thông tin dịch vụ */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Thông tin dịch vụ</Text>
        {metaRows.map((r, i) => (
          <KVRow key={i} label={r.label} value={String(r.value ?? '-')} />
        ))}
      </View>

      {/* Mốc thời gian */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mốc thời gian</Text>
        <KVRow label="Tạo" value={formatTs(appointment.createdAt)} />
        <KVRow label="Đã chấp nhận" value={formatTs(appointment.acceptedAt)} />
        <KVRow label="Hoàn thành" value={formatTs(appointment.completedAt)} />
        {appointment.cancelledAt ? (
          <KVRow label="Hủy lúc" value={formatTs(appointment.cancelledAt)} />
        ) : null}
      </View>

      {/* Ghi chú */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ghi chú bác sĩ</Text>

        {notes?.length ? (
          <View style={{ gap: 8 }}>
            {notes.map((n, idx) => (
              <View key={idx} style={styles.noteItem}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text style={styles.noteAuthor}>
                    {n.authorName || 'Bác sĩ'}
                  </Text>
                  <Text style={styles.noteTime}>{formatTs(n.createdAt)}</Text>
                </View>
                <Text style={styles.noteText}>{n.text}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.subtleLabel}>Chưa có ghi chú</Text>
        )}

        <View style={styles.divider} />
        <Text style={styles.subtleLabel}>Thêm ghi chú mới</Text>
        <TextInput
          value={notesInput}
          onChangeText={setNotesInput}
          style={styles.textarea}
          placeholder="Nhập ghi chú..."
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />
        <View style={{ marginTop: 6 }}>
          <Button
            title={saving ? 'Đang lưu...' : 'Thêm ghi chú'}
            onPress={addNote}
            disabled={saving || !notesInput.trim()}
          />
        </View>
      </View>

      {/* Hành động nhanh */}
      <View style={[styles.card, { gap: 8 }]}>
        <Text style={styles.cardTitle}>Hành động</Text>
        <TouchableOpacity activeOpacity={0.8}>
          <Button
            title="Hủy lịch"
            onPress={cancelAppointment}
            style={styles.cancelButton}
            textStyle={styles.cancelButtonText}
          />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function KVRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value?: string | number | null;
  strong?: boolean;
}) {
  const v = value == null || value === '' ? '-' : String(value);
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text
        style={[styles.kvValue, strong && styles.kvValueStrong]}
        numberOfLines={2}
      >
        {v}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2FBFD' },
  center: { justifyContent: 'center', alignItems: 'center' },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#155E75',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(37,150,190,0.08)',
    shadowColor: '#2596be',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: {
    fontWeight: '800',
    color: '#1E293B',
    fontSize: 17,
    borderLeftWidth: 3,
    borderLeftColor: '#2596be',
    paddingLeft: 8,
  },
  divider: { height: 1, backgroundColor: '#E0F2FE', marginVertical: 12 },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  kvLabel: { color: '#475569', fontWeight: '700', maxWidth: '45%' },
  kvValue: { color: '#0F172A', flex: 1, textAlign: 'right', fontWeight: '600' },
  kvValueStrong: { color: '#2596be' },
  subtleLabel: {
    color: '#64748B',
    fontWeight: '700',
    marginBottom: 6,
    fontSize: 13,
  },
  textarea: {
    borderWidth: 1.2,
    borderColor: '#CFE9F3',
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F9FEFF',
    minHeight: 100,
    fontSize: 15,
  },
  noteItem: {
    backgroundColor: '#E6F7FB',
    borderRadius: 14,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#2596be',
  },
  noteAuthor: { fontWeight: '700', color: '#155E75' },
  noteTime: { color: '#64748B', fontSize: 12 },
  noteText: { color: '#0F172A', marginTop: 6, lineHeight: 20 },
  pillBase: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillText: { fontSize: 12, fontWeight: '800', color: '#1E293B' },
  pillPending: { backgroundColor: '#FFF8E1' },
  pillAccepted: { backgroundColor: '#D7F3FE' },
  pillCompleted: { backgroundColor: '#E6FAEE' },
  pillCancelled: { backgroundColor: '#FFEAEA' },
  pillNeutral: { backgroundColor: '#E2E8F0' },

  cancelButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
    textTransform: 'uppercase',
  },
  
  // 🌟 STYLE MỚI CHO NÚT XEM LỊCH SỬ BỆNH NHÂN
  historyButton: {
    backgroundColor: '#2596be',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 5,
  },
  historyButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginLeft: 8,
    fontSize: 15,
  },
});