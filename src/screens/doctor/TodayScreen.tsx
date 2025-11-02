// screens/DoctorScheduleScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  SectionList,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  RefreshControl,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import db from '@/services/firestore';
import Button from '@/components/Button';

type Tab = 'pending' | 'today' | 'upcoming';

const toIso = (v: any) => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (v?.toDate) return v.toDate().toISOString();
  try {
    return new Date(v).toISOString();
  } catch {
    return null;
  }
};

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;

const parseMoney = (n?: any) => {
  if (typeof n === 'number') return isFinite(n) ? n : 0;
  if (typeof n === 'string') {
    const v = Number(n.replace(/[^\d.-]/g, ''));
    return isFinite(v) ? v : 0;
  }
  return 0;
};

export default function DoctorScheduleScreen() {
  const { user } = useAuth() as any;
  const navigation = useNavigation();
  const [tab, setTab] = useState<Tab>('pending');
  const [sections, setSections] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // maps để hiển thị tên thay vì id
  const [patientsMap, setPatientsMap] = useState<Record<string, any>>({});
  const [roomsMap, setRoomsMap] = useState<Record<string, string>>({});

  // nạp tên phòng 1 lần
  useEffect(() => {
    (async () => {
      try {
        const snap = await db.collection('rooms').get();
        const m: Record<string, string> = {};
        snap.docs.forEach(d => {
          const data = d.data() as any;
          m[d.id] = data?.name || data?.label || d.id;
        });
        setRoomsMap(m);
      } catch {
        setRoomsMap({});
      }
    })();
  }, []);

  const reload = useCallback(async () => {
    if (!user) return;

    const now = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 30); // 30 ngày tới

    const snap = await db
      .collection('appointments')
      .where('doctorId', '==', user.uid)
      .get();

    let list = snap.docs
      .map(d => ({ id: d.id, ...(d.data() as any) }))
      .map(it => ({ ...it, startISO: toIso(it.start), endISO: toIso(it.end) }))
      .filter(it => !!it.startISO)
      .sort((a, b) => +new Date(a.startISO) - +new Date(b.startISO));

    if (tab === 'pending') {
      list = list.filter(
        it =>
          (it.status ?? 'pending') === 'pending' &&
          new Date(it.startISO) <= end,
      );
    } else if (tab === 'today') {
      const s = new Date(now);
      s.setHours(0, 0, 0, 0);
      const e = new Date(now);
      e.setHours(23, 59, 59, 999);
      list = list.filter(it => {
        const t = new Date(it.startISO).getTime();
        return t >= s.getTime() && t <= e.getTime();
      });
    } else {
      // upcoming: đã duyệt trong 30 ngày tới
      list = list.filter(
        it =>
          it.status === 'accepted' &&
          new Date(it.startISO) >= now &&
          new Date(it.startISO) <= end,
      );
    }

    // prefetch tên bệnh nhân
    const patientIds = Array.from(
      new Set(list.map(x => x.patientId ?? x.meta?.patientId).filter(Boolean)),
    ) as string[];
    if (patientIds.length) {
      try {
        const docs = await Promise.all(
          patientIds.map(id => db.collection('users').doc(id).get()),
        );
        const m: Record<string, any> = {};
        docs.forEach(d => {
          const data = d.data();
          if (data) m[d.id] = data;
        });
        setPatientsMap(prev => ({ ...prev, ...m }));
      } catch {}
    }

    const groups: Record<string, any[]> = {};
    list.forEach(it => {
      const k = dayKey(new Date(it.startISO));
      (groups[k] ||= []).push(it);
    });
    const secs = Object.keys(groups)
      .sort()
      .map(k => ({
        title: k,
        data: groups[k].sort(
          (a, b) => +new Date(a.startISO) - +new Date(b.startISO),
        ),
      }));
    setSections(secs);
  }, [tab, user]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function accept(appointmentId: string) {
    await db.collection('appointments').doc(appointmentId).update({
      status: 'accepted',
      acceptedAt: firestore.FieldValue.serverTimestamp(),
    });
    reload();
  }

  // HOÀN THÀNH + TẠO/CẬP NHẬT HÓA ĐƠN
  async function complete(item: any) {
    // 1) cập nhật appointment
    await db.collection('appointments').doc(item.id).update({
      status: 'completed',
      completedAt: firestore.FieldValue.serverTimestamp(),
    });

    // 2) tạo/cập nhật invoice
    try {
      const meta = item?.meta || {};
      const total = parseMoney(meta?.servicePrice ?? item?.price);

      // Tránh trùng invoice cho cùng appointmentId
      const existing = await db
        .collection('invoices')
        .where('appointmentId', '==', item.id)
        .limit(1)
        .get();

      const payload = {
        appointmentId: item.id,
        doctorId: item.doctorId,
        patientId: item.patientId ?? meta?.patientId ?? null,
        title: meta?.serviceName
          ? `Hóa đơn dịch vụ: ${meta.serviceName}`
          : 'Hóa đơn dịch vụ',
        status: 'unpaid',
        total, // <-- chuẩn hoá field tiền là "total" (number)
        createdAt: firestore.FieldValue.serverTimestamp(),
      };

      if (!existing.empty) {
        await existing.docs[0].ref.set(payload, { merge: true });
      } else {
        await db.collection('invoices').add(payload);
      }
    } catch (e) {
      console.warn('create invoice failed', e);
    }

    reload();
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  }, [reload]);

  const headerTabs = (
    <View style={styles.tabs}>
      {[
        { k: 'pending', label: 'Chờ duyệt' },
        { k: 'today', label: 'Hôm nay' },
        { k: 'upcoming', label: 'Sắp tới' },
      ].map(t => {
        const active = tab === (t.k as Tab);
        return (
          <Pressable
            key={t.k}
            onPress={() => setTab(t.k as Tab)}
            style={[styles.tab, active && styles.tabActive]}
          >
            <Text style={[styles.tabText, active && styles.tabTextActive]}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      {headerTabs}

      <SectionList
        sections={sections}
        keyExtractor={i => i.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {new Date(title).toLocaleDateString('vi-VN', {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
            </Text>
          </View>
        )}
        renderItem={({ item }) => {
          const start = new Date(item.startISO);
          const hhmm = start.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });

          const service = item.meta?.serviceName ?? 'Lịch khám';
          const patientId = item.patientId ?? item.meta?.patientId ?? '';
          const patientName =
            patientsMap[patientId]?.name || patientId || 'Bệnh nhân';
          const roomName = item.roomId
            ? roomsMap[item.roomId] || item.roomId
            : null;

          const status = item.status ?? 'pending';
          const statusStyle =
            status === 'pending'
              ? styles.stPending
              : status === 'accepted'
              ? styles.stAccepted
              : styles.stCompleted;

          return (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.time}>{hhmm}</Text>
                <View style={[styles.statusPill, statusStyle]}>
                  <Text style={styles.statusText}>
                    {status === 'pending'
                      ? 'Chờ duyệt'
                      : status === 'accepted'
                      ? 'Đã duyệt'
                      : 'Hoàn thành'}
                  </Text>
                </View>
              </View>

              <Text style={styles.service} numberOfLines={1}>
                {service}
              </Text>

              <View style={[styles.rowBetween, { marginTop: 6 }]}>
                <Text style={styles.patient} numberOfLines={1}>
                  BN: {patientName}
                </Text>
                {roomName ? (
                  <View style={styles.roomPill}>
                    <Text style={styles.roomText}>Phòng {roomName}</Text>
                  </View>
                ) : null}
              </View>

              <View style={{ marginTop: 10 }}>
                {status === 'pending' && (
                  <Button
                    title="Chấp nhận"
                    onPress={() =>
                      Alert.alert('Chấp nhận', 'Xác nhận chấp nhận lịch này?', [
                        { text: 'Hủy', style: 'cancel' },
                        { text: 'Chấp nhận', onPress: () => accept(item.id) },
                      ])
                    }
                  />
                )}
                {status === 'accepted' && (
                  <Button title="Hoàn thành" onPress={() => complete(item)} />
                )}
                {status === 'completed' && (
                  <Button title="Đã hoàn thành" disabled />
                )}

                <Pressable
                  onPress={() =>
                    (navigation as any).navigate('AppointmentDetail', {
                      appointmentId: item.id,
                    })
                  }
                  style={styles.detailBtn}
                >
                  <Text style={styles.detailTxt}>Xem chi tiết ›</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {tab === 'pending'
              ? 'Không có lịch chờ duyệt trong 30 ngày tới'
              : tab === 'today'
              ? 'Hôm nay chưa có lịch'
              : 'Chưa có lịch đã duyệt trong 30 ngày tới'}
          </Text>
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F9FAFB' },

  // Tabs
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#EEF2F7',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabActive: { backgroundColor: '#1976d2', borderColor: '#1976d2' },
  tabText: { fontWeight: '700', color: '#0F172A' },
  tabTextActive: { color: '#fff' },

  // Section header
  sectionHeader: { paddingVertical: 6 },
  sectionTitle: { fontWeight: '800', color: '#0F172A' },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 2,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  time: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  service: { marginTop: 2, color: '#2563EB', fontWeight: '700' },
  patient: { color: '#334155', fontWeight: '600', flex: 1, marginRight: 8 },

  roomPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  roomText: { color: '#475569', fontWeight: '700', fontSize: 12 },

  // Status pill
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  stPending: { backgroundColor: '#FEF3C7' }, // amber-100
  stAccepted: { backgroundColor: '#DBEAFE' }, // blue-100
  stCompleted: { backgroundColor: '#DCFCE7' }, // green-100
  statusText: { fontSize: 12, fontWeight: '800', color: '#0F172A' },

  // Detail link
  detailBtn: { marginTop: 8, alignSelf: 'flex-start' },
  detailTxt: { color: '#64748B', fontWeight: '700' },

  empty: { textAlign: 'center', color: '#667085', marginTop: 28 },
});
