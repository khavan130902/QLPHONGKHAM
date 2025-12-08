// screens/patient/InvoiceDetail.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Image,
} from "react-native";
import { getInvoiceById } from "@/services/invoices";
import db from "@/services/firestore";
import safeAlert from "@/utils/safeAlert";

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
  if (typeof n === "number") return Number.isFinite(n) ? n : 0;
  if (typeof n === "string") {
    const cleaned = n.replace(/[^\d.-]/g, "");
    const v = Number(cleaned);
    return Number.isFinite(v) ? v : 0;
  }
  return 0;
};
const formatMoney = (n?: number | string | null) =>
  `${(parseMoney(n) || 0).toLocaleString("vi-VN")}₫`;

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
  return d ? d.toLocaleString("vi-VN") : "-";
};

export default function InvoiceDetail({ route }: any) {
  const { id } = route?.params || {};

  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<any>(null);

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
        const inv = await getInvoiceById(id);
        if (!mounted) return;
        setInvoice(inv);

        const apptId = inv?.appointmentId as string | undefined;
        if (apptId) {
          const doc = await db.collection("appointments").doc(apptId).get();
          const existAppt =
            typeof (doc as any).exists === "function"
              ? (doc as any).exists()
              : (doc as any).exists;

          if (existAppt && mounted) {
            const ap = {
              id: (doc as any).id,
              ...((doc as any).data() as any),
            } as Appointment;
            setAppt(ap);

            const doctorId = inv?.doctorId || ap.doctorId;
            const patientId = inv?.patientId || ap.patientId;

            if (doctorId) {
              try {
                const ddoc = await db.collection("users").doc(doctorId).get();
                const existDoc =
                  typeof (ddoc as any).exists === "function"
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
                const pdoc = await db.collection("users").doc(patientId).get();
                const existPat =
                  typeof (pdoc as any).exists === "function"
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

        try {
          const rs = await db.collection("rooms").get();
          const m: Record<string, string> = {};
          rs.docs.forEach((d) => {
            const r = (d as any).data() as any;
            m[(d as any).id] = r?.name || r?.label || (d as any).id;
          });
          if (mounted) setRoomsMap(m);
        } catch {}
      } catch (e) {
        console.warn("load invoice detail", e);
        safeAlert("Lỗi", "Không tải được hóa đơn");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  const items = useMemo(() => {
    const arr = Array.isArray(invoice?.items) ? invoice.items : [];
    return arr;
  }, [invoice?.items]);

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

  const s = String(invoice?.status || "pending").toLowerCase();

  const statusMap = {
    pending: { text: "Chờ thanh toán", bg: "#FDF3D7", color: "#AD6B00" },
    paid: { text: "Đã thanh toán", bg: "#DFF7E6", color: "#146C43" },
    cancelled: { text: "Đã hủy", bg: "#FFE5E5", color: "#B42318" },
    refunded: { text: "Đã hoàn tiền", bg: "#E6E9FF", color: "#3538CD" },
  } as const;

  const safeKey: keyof typeof statusMap =
    ["pending", "paid", "cancelled", "refunded"].includes(s as any)
      ? (s as any)
      : "pending";

  const sInfo = statusMap[safeKey];

  const serviceName =
    appt?.meta?.serviceName ||
    appt?.meta?.service_type_name ||
    "Dịch vụ khám bệnh";

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
        <View style={{ gap: 16 }}>
          {/* Header */}
          <View style={styles.headerBox}>
            <Text style={styles.headerTitle}>
              {invoice.title || `Hóa đơn dịch vụ`}
            </Text>

            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.subText}>Mã hóa đơn: {invoice.id}</Text>
                <Text style={styles.subText}>
                  Ngày tạo: {formatTs(invoice.createdAt)}
                </Text>
                {invoice.appointmentId ? (
                  <Text style={styles.subText}>
                    Mã lịch hẹn: {String(invoice.appointmentId)}
                  </Text>
                ) : null}
              </View>

              <View style={[styles.statusBadge, { backgroundColor: sInfo.bg }]}>
                <Text style={[styles.statusText, { color: sInfo.color }]}>
                  {sInfo.text}
                </Text>
              </View>
            </View>
          </View>

          {/* Doctor + Patient Card */}
          {(doctor || patient) && (
            <View style={styles.dualCard}>
              {doctor && (
                <View style={styles.profileBox}>
                  <Text style={styles.profileTag}>Bác sĩ</Text>
                  <AvatarInline
                    uri={doctor.photoURL}
                    name={doctor.name || "Bác sĩ"}
                  />
                  <Text style={styles.profileName}>{doctor.name}</Text>
                  <Text style={styles.profileSub} numberOfLines={1}>
                    {doctor.specialty || specialtyName || ""}
                  </Text>
                </View>
              )}

              {patient && (
                <View style={styles.profileBox}>
                  <Text style={styles.profileTag}>Bệnh nhân</Text>
                  <AvatarInline
                    uri={patient.photoURL}
                    name={patient.name || "Bệnh nhân"}
                  />
                  <Text style={styles.profileName}>{patient.name}</Text>
                  <Text style={styles.profileSub} numberOfLines={1}>
                    {patient.email || patient.phoneNumber || ""}
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

          {/* Lịch hẹn */}
          {appt && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Thông tin lịch hẹn</Text>

              <KVRow label="Dịch vụ" value={serviceName} />
              {specialtyName && (
                <KVRow label="Chuyên khoa" value={String(specialtyName)} />
              )}
              {duration && <KVRow label="Thời lượng" value={duration} />}
              {roomName && <KVRow label="Phòng" value={roomName} />}

              <KVRow label="Bắt đầu" value={formatTs(appt.start)} />
              <KVRow label="Kết thúc" value={formatTs(appt.end)} />

              {appt.meta?.bookedFrom && (
                <KVRow
                  label="Thiết bị"
                  value={String(appt.meta.bookedFrom)}
                />
              )}
            </View>
          )}

          {/* Items */}
          {items.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Chi tiết dịch vụ</Text>

              {items.map((it: any, idx: number) => (
                <View key={idx} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{it.name || "Hạng mục"}</Text>
                    {it.note && (
                      <Text style={styles.itemNote}>{it.note}</Text>
                    )}
                  </View>

                  <Text style={styles.itemAmount}>
                    {formatMoney(it.amount)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Biên lai */}
          {invoice.receiptUrl && (
            <TouchableOpacity
              onPress={() => Linking.openURL(invoice.receiptUrl)}
              style={{ marginTop: 6 }}
            >
              <Text style={styles.link}>Xem biên lai / Tải về</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <Text>Không tìm thấy hóa đơn</Text>
      )}
    </View>
  );
}

/* COMPONENT SMALL */
function KVRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  const v = value == null || value === "" ? "-" : String(value);

  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={styles.kvValue}>{v}</Text>
    </View>
  );
}

function AvatarInline({
  uri,
  name,
  size = 48,
}: {
  uri?: string | null;
  name?: string | null;
  size?: number;
}) {
  const initials =
    (name || "")
      .trim()
      .split(/\s+/)
      .map((s) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  return uri ? (
    <Image
      source={{ uri }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        marginBottom: 6,
      }}
    />
  ) : (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#E2E8F0",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 6,
      }}
    >
      <Text style={{ fontWeight: "800", color: "#1E293B" }}>{initials}</Text>
    </View>
  );
}

/* STYLE */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#F2F4F7",
  },

  headerBox: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 10,
  },

  subText: {
    color: "#475569",
    fontSize: 14,
    marginBottom: 4,
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
  },

  statusText: {
    fontWeight: "800",
    fontSize: 13,
  },

  dualCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },

  profileBox: {
    flex: 1,
    alignItems: "center",
  },

  profileTag: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "700",
    marginBottom: 6,
  },

  profileName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },

  profileSub: {
    color: "#475569",
    fontSize: 13,
    marginTop: 2,
  },

  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },

  sectionTitle: {
    fontWeight: "900",
    fontSize: 16,
    marginBottom: 10,
    color: "#0F172A",
  },

  total: {
    fontSize: 26,
    fontWeight: "900",
    color: "#2563EB",
    marginTop: 4,
  },

  kvRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },

  kvLabel: {
    color: "#64748B",
    fontWeight: "700",
    fontSize: 14,
  },

  kvValue: {
    color: "#0F172A",
    fontWeight: "700",
    fontSize: 14,
    maxWidth: "60%",
    textAlign: "right",
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginTop: 8,
  },

  itemName: {
    fontWeight: "700",
    color: "#0F172A",
    fontSize: 15,
  },

  itemNote: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 4,
  },

  itemAmount: {
    fontWeight: "800",
    color: "#1E293B",
    marginLeft: 10,
  },

  link: {
    color: "#0284C7",
    fontWeight: "800",
    fontSize: 15,
  },
});
