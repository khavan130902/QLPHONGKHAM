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
} from 'react-native';
import Button from '@/components/Button';
import db from '@/services/firestore';
import { useAuth } from '@/context/AuthContext';
import safeAlert from '@/utils/safeAlert';

type Note = {
  text: string;
  authorId: string;
  authorName?: string | null; // cho phép null, tránh undefined
  createdAt: string; // ISO string
};

type KV = { label: string; value?: string | number | null };

/** Utils: loại bỏ mọi undefined trong object/array (đệ quy) */
function stripUndefined<T>(val: T): T {
  if (Array.isArray(val)) {
    // @ts-ignore
    return val.map(stripUndefined);
  }
  if (val && typeof val === 'object') {
    const out: any = {};
    Object.entries(val as any).forEach(([k, v]) => {
      if (v === undefined) return; // bỏ key undefined
      if (v && typeof v === 'object') out[k] = stripUndefined(v);
      else out[k] = v;
    });
    return out;
  }
  return val;
}

/** Parse tiền từ number/string có dấu phẩy, ký tự tiền */
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

  // notes list
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesInput, setNotesInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        if (!appointmentId) return;

        const doc = await db
          .collection('appointments')
          .doc(appointmentId)
          .get();
        if (!mounted) return;

        if (!doc.exists) {
          setLoading(false);
          return safeAlert('Thông tin', 'Không tìm thấy lịch hẹn');
        }

        const apptData = doc.data() as any;
        const appt = { id: doc.id, ...apptData };
        setAppointment(appt);

        // notes: chuyển về mảng nếu đang là string/undefined
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

        // patient
        const pid = apptData?.patientId;
        if (pid) {
          const pdoc = await db.collection('users').doc(pid).get();
          if (mounted)
            setPatientProfile({ id: pdoc.id, ...(pdoc.data() as any) });
        }

        // rooms map
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
      authorName: user?.displayName ?? user?.email ?? null, // null, không undefined
      createdAt: new Date().toISOString(),
    };

    try {
      setSaving(true);

      const ref = db.collection('appointments').doc(appointmentId);

      // đọc mảng notes hiện tại
      const snap = await ref.get();
      const data = snap.data() || {};
      const prevRaw = Array.isArray(data.notes) ? (data.notes as any[]) : [];

      // chuẩn hoá các phần tử cũ (bỏ undefined)
      const prev: Note[] = prevRaw.map(it => stripUndefined(it));

      // thêm note mới (mới nhất lên trước)
      const updated = [stripUndefined(newNote), ...prev];

      // dùng set merge và luôn stripUndefined trước khi ghi
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
      await db.collection('appointments').doc(appointmentId).update({
        status: 'cancelled',
        cancelledBy: user?.uid,
        cancelledAt: new Date().toISOString(),
      });
      safeAlert('Đã hủy', 'Đã hủy lịch');
      navigation.goBack();
    } catch (e) {
      console.warn('cancelAppointment', e);
      safeAlert('Lỗi', 'Hủy lịch thất bại');
    }
  }

  // --------- Helpers ----------
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

      {/* Ghi chú (list) */}
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
          <Button title="Hủy lịch" onPress={cancelAppointment} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

/** --------- Presentational --------- */
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

/** --------- Styles --------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  center: { justifyContent: 'center', alignItems: 'center' },

  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitle: { fontWeight: '800', color: '#0F172A' },

  divider: { height: 1, backgroundColor: '#EEF2F7', marginVertical: 10 },

  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 6,
  },
  kvLabel: { color: '#475569', fontWeight: '700', maxWidth: '45%' },
  kvValue: { color: '#0F172A', flex: 1, textAlign: 'right', fontWeight: '600' },
  kvValueStrong: { color: '#2563EB' },

  subtleLabel: { color: '#64748B', fontWeight: '700', marginBottom: 6 },

  textarea: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    marginBottom: 10,
    minHeight: 110,
  },

  // notes list
  noteItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
  },
  noteAuthor: { fontWeight: '700', color: '#0F172A' },
  noteTime: { color: '#64748B', marginLeft: 8 },
  noteText: { color: '#0F172A', marginTop: 6 },

  // pills
  pillBase: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 12, fontWeight: '800', color: '#0F172A' },
  pillPending: { backgroundColor: '#FEF3C7' },
  pillAccepted: { backgroundColor: '#DBEAFE' },
  pillCompleted: { backgroundColor: '#DCFCE7' },
  pillCancelled: { backgroundColor: '#FEE2E2' },
  pillNeutral: { backgroundColor: '#E2E8F0' },
});
