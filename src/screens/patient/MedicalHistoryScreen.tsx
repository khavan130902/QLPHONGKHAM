import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import db from '@/services/firestore';
import safeAlert from '@/utils/safeAlert';
import Button from '@/components/Button';

type Appt = {
  id: string;
  start?: any;
  end?: any;
  createdAt?: any;
  status?: string;
  doctorId?: string;
  doctorName?: string;
  roomId?: string;
  price?: number | string;
  patientId?: string;
  meta?: {
    serviceName?: string;
    servicePrice?: number | string;
    specialtyName?: string;
    bookedFrom?: string;
  };
};

type Doctor = { id: string; name?: string | null; photoURL?: string | null };

const PAGE_SIZE = 20;

/** Helpers */
function toDateObj(v: any) {
  try {
    if (!v) return null;
    if (v?.toDate) return v.toDate();
    return new Date(v);
  } catch {
    return null;
  }
}
function formatTs(v: any) {
  const d = toDateObj(v);
  return d ? d.toLocaleString('vi-VN') : '-';
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
function formatMoney(n?: number | string | null) {
  return `${(parseMoney(n) || 0).toLocaleString('vi-VN')}₫`;
}
function compareApptDesc(a: Appt, b: Appt) {
  const as = toDateObj(a.start)?.getTime() ?? 0;
  const bs = toDateObj(b.start)?.getTime() ?? 0;
  if (as !== bs) return bs - as;
  const ac = toDateObj(a.createdAt)?.getTime() ?? 0;
  const bc = toDateObj(b.createdAt)?.getTime() ?? 0;
  if (ac !== bc) return bc - ac;
  return b.id.localeCompare(a.id);
}

export default function MedicalHistoryScreen({ navigation }: any) {
  const { user } = useAuth() as any;

  const [rows, setRows] = useState<Appt[]>([]);
  const [doctorMap, setDoctorMap] = useState<Record<string, Doctor>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);

  /** KHÔNG orderBy → không cần index */
  const baseQuery = useCallback(() => {
    return db.collection('appointments').where('patientId', '==', user?.uid);
  }, [user?.uid]);

  /** nạp thông tin bác sĩ cho các doctorId chưa có trong cache */
  const warmDoctors = useCallback(
    async (appts: Appt[]) => {
      const ids = Array.from(
        new Set(
          appts
            .map(a => a.doctorId)
            .filter(Boolean)
            .filter(id => !doctorMap[id as string]),
        ),
      ) as string[];
      if (!ids.length) return;
      try {
        const docs = await Promise.all(
          ids.map(id => db.collection('users').doc(id).get()),
        );
        const patch: Record<string, Doctor> = {};
        docs.forEach(d => {
          const data = d.data() as any;
          if (!data) return;
          patch[d.id] = {
            id: d.id,
            name: data?.name ?? null,
            photoURL: data?.photoURL ?? null,
          };
        });
        setDoctorMap(prev => ({ ...prev, ...patch }));
      } catch (e) {
        // im lặng nếu lỗi, vẫn có fallback hiển thị id
        console.warn('warmDoctors', e);
      }
    },
    [doctorMap],
  );

  const fetchFirst = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    setLastDoc(null);
    try {
      const snap = await baseQuery().limit(PAGE_SIZE).get();
      let data = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as any),
      })) as Appt[];
      data = data.filter(it => (it.status || '').toLowerCase() === 'completed');
      data.sort(compareApptDesc);

      setRows(data);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      warmDoctors(data); // nạp doctor
    } catch (e) {
      console.warn('fetchFirst', e);
      safeAlert('Lỗi', 'Không thể tải hồ sơ bệnh án');
    } finally {
      setLoading(false);
    }
  }, [baseQuery, user?.uid, warmDoctors]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchFirst();
    } finally {
      setRefreshing(false);
    }
  }, [fetchFirst]);

  const loadMore = useCallback(async () => {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);
    try {
      const snap = await baseQuery().startAfter(lastDoc).limit(PAGE_SIZE).get();
      let more = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as any),
      })) as Appt[];
      more = more.filter(it => (it.status || '').toLowerCase() === 'completed');

      setRows(prev => {
        const merged = [...prev, ...more];
        merged.sort(compareApptDesc);
        return merged;
      });
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      warmDoctors(more);
    } catch (e) {
      console.warn('loadMore', e);
    } finally {
      setLoadingMore(false);
    }
  }, [baseQuery, lastDoc, loadingMore, warmDoctors]);

  useEffect(() => {
    fetchFirst();
  }, [fetchFirst]);

  const renderItem = ({ item }: { item: Appt }) => {
    const svc = item.meta?.serviceName || 'Dịch vụ';
    const when = `${formatTs(item.start)} — ${formatTs(item.end)}`;
    const doc = (item.doctorId && doctorMap[item.doctorId]) || null;
    const doctorName =
      doc?.name ||
      item.doctorName ||
      (item.doctorId ? item.doctorId.slice(0, 8) : 'Bác sĩ');
    const price = formatMoney(item.meta?.servicePrice ?? item.price ?? 0);

    return (
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.service}>{svc}</Text>
          <Text style={styles.badge}>Đã hoàn thành</Text>
        </View>

        <Text style={styles.when}>{when}</Text>

        <View style={[styles.rowBetween, { marginTop: 8 }]}>
          <View style={styles.row}>
            {doc?.photoURL ? (
              <Image source={{ uri: doc.photoURL }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={{ color: '#0F172A' }}>👨‍⚕️</Text>
              </View>
            )}
            <Text style={styles.doctor}>{doctorName}</Text>
          </View>

          <Text style={styles.price}>{price}</Text>
        </View>

        {/* Nút Xem chi tiết */}
        <View style={{ marginTop: 10 }}>
          <Button
            title="Xem chi tiết"
            onPress={() =>
              navigation.navigate('MedicalRecordDetail', {
                appointmentId: item.id,
              })
            }
          />
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator />
        <Text style={{ color: '#64748B', marginTop: 8 }}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={rows}
        keyExtractor={it => it.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        onEndReachedThreshold={0.3}
        onEndReached={loadMore}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 12 }}>
              <ActivityIndicator />
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={[styles.center, { paddingTop: 40 }]}>
            <Text style={{ color: '#64748B' }}>Chưa có hồ sơ hoàn thành</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  center: { justifyContent: 'center', alignItems: 'center' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  service: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  when: { marginTop: 6, color: '#334155', fontWeight: '600' },
  doctor: { marginLeft: 8, color: '#475569', fontWeight: '700' },
  price: { color: '#2563EB', fontWeight: '800' },

  badge: {
    backgroundColor: '#DCFCE7',
    color: '#065F46',
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },

  avatar: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
  },
  avatarFallback: { justifyContent: 'center', alignItems: 'center' },
});
