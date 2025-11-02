// screens/patient/InvoiceDetail.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Image,
} from 'react-native';
import { getInvoiceById } from '@/services/invoices';
import db from '@/services/firestore';
import safeAlert from '@/utils/safeAlert';

type UserMini = {
  id?: string;
  name?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  photoURL?: string | null;
  specialty?: string | null;
  specialty_id?: string | null;
  role?: string | null;
};

type Appointment = {
  id: string;
  start?: any;
  end?: any;
  roomId?: string;
  status?: string;
  meta?: {
    serviceName?: string;
    service_type_name?: string;
    servicePrice?: number | string;
    serviceDurationMin?: number;
    specialtyName?: string;
    specialtyId?: string;
    bookedFrom?: string;
  };
  patientId?: string;
  doctorId?: string;
};

const parseMoney = (n?: number | string | null): number => {
  if (typeof n === 'number') return Number.isFinite(n) ? n : 0;
  if (typeof n === 'string') {
    const cleaned = n.replace(/[^\d.-]/g, '');
    const v = Number(cleaned);
    return Number.isFinite(v) ? v : 0;
  }
  return 0;
};
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
const formatTs = (v: any) => {
  const d = toDateObj(v);
  return d ? d.toLocaleString('vi-VN') : '-';
};

export default function InvoiceDetail({ route }: any) {
  const { id } = route?.params || {};

  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<any>(null);

  // Bổ sung từ appointments + users
  const [appt, setAppt] = useState<Appointment | null>(null);
  const [doctor, setDoctor] = useState<UserMini | null>(null);
  const [patient, setPatient] = useState<UserMini | null>(null);
  const [roomsMap, setRoomsMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!id) return;
      setLoading(true);
      try {
        // 1) Lấy invoice
        const inv = await getInvoiceById(id);
        if (!mounted) return;
        setInvoice(inv);

        // 2) Nếu có appointmentId → lấy appointment
        const apptId = inv?.appointmentId as string | undefined;
        if (apptId) {
          const doc = await db.collection('appointments').doc(apptId).get();
          // ⚠️ react-native-firebase có exists (boolean) ở runtime,
          // nhưng type hay cảnh báo -> gọi như hàm để an toàn với TS
          const existAppt =
            typeof (doc as any).exists === 'function'
              ? (doc as any).exists()
              : (doc as any).exists;
          if (existAppt && mounted) {
            const ap = {
              id: (doc as any).id,
              ...((doc as any).data() as any),
            } as Appointment;
            setAppt(ap);

            // 3) Lấy doctor/patient (ưu tiên id từ invoice, fallback từ appt)
            const doctorId = inv?.doctorId || ap.doctorId;
            const patientId = inv?.patientId || ap.patientId;

            if (doctorId) {
              try {
                const ddoc = await db.collection('users').doc(doctorId).get();
                const existDoc =
                  typeof (ddoc as any).exists === 'function'
                    ? (ddoc as any).exists()
                    : (ddoc as any).exists;
                if (existDoc && mounted) {
                  setDoctor({
                    id: (ddoc as any).id,
                    ...((ddoc as any).data() as any),
                  });
                }
              } catch {}
            }
            if (patientId) {
              try {
                const pdoc = await db.collection('users').doc(patientId).get();
                const existPat =
                  typeof (pdoc as any).exists === 'function'
                    ? (pdoc as any).exists()
                    : (pdoc as any).exists;
                if (existPat && mounted) {
                  setPatient({
                    id: (pdoc as any).id,
                    ...((pdoc as any).data() as any),
                  });
                }
              } catch {}
            }
          }
        }

        // 4) Map phòng (nếu có)
        try {
          const rs = await db.collection('rooms').get();
          const m: Record<string, string> = {};
          rs.docs.forEach(d => {
            const r = (d as any).data() as any;
            m[(d as any).id] = r?.name || r?.label || (d as any).id;
          });
          if (mounted) setRoomsMap(m);
        } catch {}
      } catch (e) {
        console.warn('load invoice detail', e);
        safeAlert('Lỗi', 'Không tải được hóa đơn');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  // Items nếu backend có mảng items
  const items = useMemo(() => {
    const arr = Array.isArray(invoice?.items) ? invoice.items : [];
    return arr;
  }, [invoice?.items]);

  // Tổng tiền: ưu tiên invoice.total → invoice.amount → appt.meta.servicePrice
  const total = useMemo(() => {
    if (!invoice && !appt) return 0;
    return (
      parseMoney(invoice?.total) ||
      parseMoney(invoice?.amount) ||
      parseMoney(appt?.meta?.servicePrice) ||
      0
    );
  }, [invoice?.total, invoice?.amount, appt?.meta?.servicePrice]);

  if (!id) {
    return (
      <View style={styles.container}>
        <Text>Không có dữ liệu</Text>
      </View>
    );
  }

  const s = String(invoice?.status || 'pending').toLowerCase();

  const statusMap = {
    pending: { text: 'Chờ thanh toán', bg: '#FEF3C7', color: '#92400E' },
    paid: { text: 'Đã thanh toán', bg: '#D1FAE5', color: '#065F46' },
    cancelled: { text: 'Đã hủy', bg: '#FEE2E2', color: '#991B1B' },
    refunded: { text: 'Đã hoàn tiền', bg: '#E0E7FF', color: '#3730A3' },
  } as const;
  type StatusKey = keyof typeof statusMap;
  const safeKey: StatusKey = (
    ['pending', 'paid', 'cancelled', 'refunded'] as const
  ).includes(s as StatusKey)
    ? (s as StatusKey)
    : 'pending';
  const sInfo = statusMap[safeKey];

  const serviceName =
    appt?.meta?.serviceName || appt?.meta?.service_type_name || 'Dịch vụ';

  const specialtyName =
    appt?.meta?.specialtyName || appt?.meta?.specialtyId || null;

  const duration =
    appt?.meta?.serviceDurationMin != null
      ? `${appt?.meta?.serviceDurationMin} phút`
      : null;

  const roomName = appt?.roomId
    ? roomsMap[appt.roomId] || appt.roomId
    : undefined;

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator />
      ) : invoice ? (
        <View style={{ gap: 12 }}>
          {/* Header */}
          <Text style={styles.title}>
            {invoice.title || `Hóa đơn dịch vụ: ${serviceName}`}
          </Text>

          <View style={styles.rowBetween}>
            <View style={{ gap: 6 }}>
              <Text style={styles.muted}>Mã hóa đơn: {invoice.id}</Text>
              <Text style={styles.muted}>
                Ngày tạo: {formatTs(invoice.createdAt)}
              </Text>
              {invoice.appointmentId ? (
                <Text style={styles.muted}>
                  Mã lịch hẹn: {String(invoice.appointmentId)}
                </Text>
              ) : null}
            </View>
            <View style={[styles.pill, { backgroundColor: sInfo.bg }]}>
              <Text style={{ fontWeight: '800', color: sInfo.color }}>
                {sInfo.text}
              </Text>
            </View>
          </View>

          {/* Bác sĩ & Bệnh nhân */}
          {(doctor || patient) && (
            <View style={styles.cardRow}>
              {doctor && (
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={styles.smallHeading}>Bác sĩ</Text>
                  <AvatarInline
                    uri={doctor.photoURL}
                    name={doctor.name || 'Bác sĩ'}
                  />
                  <Text style={styles.boldName} numberOfLines={1}>
                    {doctor.name || 'Bác sĩ'}
                  </Text>
                  <Text style={styles.muted} numberOfLines={1}>
                    {doctor.specialty || specialtyName || ''}
                  </Text>
                </View>
              )}
              <View style={{ width: 14 }} />
              {patient && (
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={styles.smallHeading}>Bệnh nhân</Text>
                  <AvatarInline
                    uri={patient.photoURL}
                    name={patient.name || 'Bệnh nhân'}
                  />
                  <Text style={styles.boldName} numberOfLines={1}>
                    {patient.name || 'Bệnh nhân'}
                  </Text>
                  <Text style={styles.muted} numberOfLines={1}>
                    {patient.email || patient.phoneNumber || ''}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Tổng tiền */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Tổng tiền</Text>
            <Text style={styles.total}>{formatMoney(total)}</Text>
          </View>

          {/* Thông tin lịch hẹn (lấy từ appointments) */}
          {appt && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Thông tin lịch hẹn</Text>
              <KVRow label="Dịch vụ" value={serviceName} />
              {specialtyName ? (
                <KVRow label="Chuyên khoa" value={String(specialtyName)} />
              ) : null}
              {duration ? <KVRow label="Thời lượng" value={duration} /> : null}
              {roomName ? <KVRow label="Phòng" value={roomName} /> : null}
              <KVRow label="Bắt đầu" value={formatTs(appt.start)} />
              <KVRow label="Kết thúc" value={formatTs(appt.end)} />
              {appt.meta?.bookedFrom ? (
                <KVRow label="Thiết bị" value={String(appt.meta.bookedFrom)} />
              ) : null}
            </View>
          )}

          {/* Chi tiết dòng (nếu backend có mảng items) */}
          {items.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Chi tiết dòng</Text>
              {items.map((it: any, idx: number) => (
                <View key={idx} style={styles.lineRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lineName}>{it.name || 'Hạng mục'}</Text>
                    {it.note ? (
                      <Text style={styles.lineNote}>{it.note}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.lineAmount}>
                    {formatMoney(it.amount)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Biên lai (nếu có) */}
          {invoice.receiptUrl ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(invoice.receiptUrl)}
              style={{ alignSelf: 'flex-start' }}
            >
              <Text style={{ color: '#0EA5E9', fontWeight: '700' }}>
                Xem biên lai / Tải về
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <Text>Không tìm thấy hóa đơn</Text>
      )}
    </View>
  );
}

/** ---------- UI helpers ---------- */
function KVRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  const v = value == null || value === '' ? '-' : String(value);
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={styles.kvValue} numberOfLines={2}>
        {v}
      </Text>
    </View>
  );
}

function AvatarInline({
  uri,
  name,
  size = 42,
}: {
  uri?: string | null;
  name?: string | null;
  size?: number;
}) {
  const initials =
    (name || '')
      .trim()
      .split(/\s+/)
      .map(s => s[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';

  return uri ? (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
    />
  ) : (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontWeight: '800', color: '#111827' }}>{initials}</Text>
    </View>
  );
}

/** ---------- Styles ---------- */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F4F6F8' },

  title: { fontWeight: '800', fontSize: 18, color: '#0F172A' },
  muted: { color: '#475569' },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  pill: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    marginTop: 6,
  },

  cardRow: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    marginTop: 6,
    flexDirection: 'row',
  },

  sectionTitle: { fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  total: { fontSize: 22, fontWeight: '900', color: '#2563EB' },

  boldName: { fontWeight: '800', color: '#0F172A', marginTop: 8 },
  smallHeading: { color: '#64748B', fontWeight: '700', marginBottom: 6 },

  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 6,
  },
  kvLabel: { color: '#475569', fontWeight: '700', maxWidth: '45%' },
  kvValue: { color: '#0F172A', flex: 1, textAlign: 'right', fontWeight: '600' },

  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
  },
  lineName: { fontWeight: '700', color: '#0F172A' },
  lineNote: { color: '#64748B', marginTop: 2, fontSize: 12 },
  lineAmount: { fontWeight: '800', color: '#0F172A', marginLeft: 12 },
});
