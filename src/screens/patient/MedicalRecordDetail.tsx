import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import db from '@/services/firestore';
import Button from '@/components/Button';
import safeAlert from '@/utils/safeAlert';

type Note = {
  text: string;
  authorId: string;
  authorName?: string | null;
  createdAt: string;
};

function toDateObj(v: any) {
  try {
    if (!v) return null;
    if (v?.toDate) return v.toDate();
    return new Date(v);
  } catch {
    return null;
  }
}
function formatTs(v: any, locale = 'vi-VN') {
  const d = toDateObj(v);
  return d ? d.toLocaleString(locale) : '-';
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
const formatMoney = (n?: number | string | null) =>
  `${(parseMoney(n) || 0).toLocaleString('vi-VN')}₫`;

export default function MedicalRecordDetail({ route, navigation }: any) {
  const { appointmentId } = route?.params || {};

  const [appointment, setAppointment] = useState<any>(null);
  const [roomsMap, setRoomsMap] = useState<Record<string, string>>({});
  const [patient, setPatient] = useState<any>(null);
  const [doctor, setDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
          return safeAlert('Thông tin', 'Không tìm thấy hồ sơ');
        }

        const data = { id: doc.id, ...(doc.data() as any) };

        // Bảo đảm notes là mảng
        const raw = data?.notes;
        if (!Array.isArray(raw)) {
          data.notes =
            typeof raw === 'string' && raw.trim()
              ? [
                  {
                    text: raw,
                    authorId: data?.doctorId || '',
                    authorName: null,
                    createdAt:
                      data?.updatedAt ||
                      data?.createdAt ||
                      new Date().toISOString(),
                  } as Note,
                ]
              : [];
        }
        setAppointment(data);

        const pid = (doc.data() as any)?.patientId;
        if (pid) {
          const pdoc = await db.collection('users').doc(pid).get();
          if (mounted) setPatient({ id: pdoc.id, ...(pdoc.data() as any) });
        }

        const did = (doc.data() as any)?.doctorId;
        if (did) {
          const ddoc = await db.collection('users').doc(did).get();
          if (mounted) setDoctor({ id: ddoc.id, ...(ddoc.data() as any) });
        }

        try {
          const snap = await db.collection('rooms').get();
          if (!mounted) return;
          const m: Record<string, string> = {};
          snap.docs.forEach(d => {
            const r = d.data() as any;
            m[d.id] = r?.name || r?.label || d.id;
          });
          setRoomsMap(m);
        } catch {}
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [appointmentId]);

  /** 🔧 Gọi hook useMemo KHÔNG điều kiện (luôn ở top-level) */
  const notesFromAppt: Note[] = useMemo(() => {
    const n = appointment?.notes;
    if (Array.isArray(n)) return n as Note[];
    return [];
  }, [appointment?.notes]);

  const orderedNotes: Note[] = useMemo(
    () =>
      [...notesFromAppt].sort((a, b) =>
        (b.createdAt || '').localeCompare(a.createdAt || ''),
      ),
    [notesFromAppt],
  );

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
        <Text style={{ color: '#64748B' }}>Không tìm thấy hồ sơ</Text>
      </View>
    );
  }

  const meta = appointment?.meta || {};
  const roomName = appointment.roomId
    ? roomsMap[appointment.roomId] || appointment.roomId
    : '-';
  const patientLine =
    (patient?.name || appointment.patientName || appointment.patientId || '-') +
    (patient?.phone || patient?.phoneNumber || appointment.patientPhone
      ? ' • ' +
        (patient?.phone || patient?.phoneNumber || appointment.patientPhone)
      : '');

  // Header summary
  const svcName = meta.serviceName || meta.service_type_name || 'Dịch vụ';
  const startStr = formatTs(appointment.start);
  const endStr = formatTs(appointment.end);
  const priceStr = formatMoney(meta?.servicePrice ?? appointment?.price ?? 0);
  const status = String(appointment.status || '-').toLowerCase();
  const statusText =
    status === 'completed'
      ? 'Đã hoàn thành'
      : status === 'accepted'
      ? 'Đã duyệt'
      : status === 'pending'
      ? 'Chờ duyệt'
      : status === 'cancelled'
      ? 'Đã hủy'
      : String(appointment.status || '-');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
    >
      <Text style={styles.title}>Chi tiết hồ sơ bệnh án</Text>

      {/* Header tóm tắt */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.service}>{svcName}</Text>
          <Text
            style={[
              styles.badge,
              status === 'completed'
                ? styles.badgeGreen
                : status === 'accepted'
                ? styles.badgeBlue
                : status === 'pending'
                ? styles.badgeAmber
                : styles.badgeRed,
            ]}
          >
            {statusText}
          </Text>
        </View>

        <Text style={styles.when}>
          {startStr} — {endStr}
        </Text>

        <View style={[styles.rowBetween, { marginTop: 10 }]}>
          <View style={styles.row}>
            {doctor?.photoURL ? (
              <Image source={{ uri: doctor.photoURL }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text>👨‍⚕️</Text>
              </View>
            )}
            <View>
              <Text style={styles.doctorName}>
                {doctor?.name || appointment.doctorName || 'Bác sĩ'}
              </Text>
              {!!doctor?.specialty && (
                <Text style={styles.doctorSub}>{doctor.specialty}</Text>
              )}
            </View>
          </View>
          <Text style={styles.price}>{priceStr}</Text>
        </View>
      </View>

      {/* Tổng quan */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tổng quan</Text>
        <KVRow label="Bệnh nhân" value={patientLine} />
        <KVRow label="Phòng" value={roomName} />
        <KVRow label="Bắt đầu" value={startStr} />
        <KVRow label="Kết thúc" value={endStr} />
        <KVRow label="Trạng thái" value={statusText} />
        <View style={styles.divider} />
        <KVRow label="Giá" value={priceStr} strong />
      </View>

      {/* Thông tin dịch vụ */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Thông tin dịch vụ</Text>
        <KVRow label="Dịch vụ" value={svcName} />
        <KVRow
          label="Chuyên khoa"
          value={meta.specialtyName || meta.specialtyId || '-'}
        />
        <KVRow
          label="Thời lượng"
          value={
            meta.serviceDurationMin ? `${meta.serviceDurationMin} phút` : '-'
          }
        />
        <KVRow label="Nguồn" value={meta.bookedFrom || '-'} />
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
        <Text style={styles.cardTitle}>Ghi chú (list)</Text>
        {orderedNotes.length ? (
          <View style={{ gap: 8 }}>
            {orderedNotes.map((n, i) => (
              <View key={i} style={styles.noteItem}>
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
      </View>

      <View style={[styles.card, { gap: 8 }]}>
        <Button title="Quay lại" onPress={() => navigation.goBack()} />
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

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  service: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  when: { marginTop: 6, color: '#334155', fontWeight: '600' },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontWeight: '800',
    overflow: 'hidden',
    color: '#0F172A',
    backgroundColor: '#E2E8F0',
  },
  badgeGreen: { backgroundColor: '#DCFCE7' },
  badgeBlue: { backgroundColor: '#DBEAFE' },
  badgeAmber: { backgroundColor: '#FEF3C7' },
  badgeRed: { backgroundColor: '#FEE2E2' },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
  },

  doctorName: { fontWeight: '800', color: '#0F172A' },
  doctorSub: { color: '#64748B', marginTop: 2 },

  price: { color: '#2563EB', fontWeight: '800' },

  cardTitle: { fontWeight: '800', color: '#0F172A', marginBottom: 8 },
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

  noteItem: { backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10 },
  noteAuthor: { fontWeight: '700', color: '#0F172A' },
  noteTime: { color: '#64748B', marginLeft: 8 },
  noteText: { color: '#0F172A', marginTop: 6 },
});
