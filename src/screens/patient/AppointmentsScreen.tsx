// screens/AppointmentsScreen.tsx
import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import db from '@/services/firestore';
import { useAuth } from '@/context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import Avatar from '@/components/Avatar';
import Button from '@/components/Button';
import safeAlert from '@/utils/safeAlert';

type Appt = {
  id: string;
  start: any;
  end?: any;
  status?: string;
  doctorId?: string;
  location?: string;
  meta?: { serviceName?: string; servicePrice?: number | string };
};

export default function AppointmentsScreen() {
  const { user } = useAuth() as any;
  const navigation = useNavigation();
  const [items, setItems] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(false);
  const [doctorsMap, setDoctorsMap] = useState<Record<string, any>>({});
  const [specialtiesList, setSpecialtiesList] = useState<any[]>([]);

  // ✔️ thêm completed
  const [filter, setFilter] = useState<
    'all' | 'pending' | 'accepted' | 'completed' | 'cancelled'
  >('all');

  useEffect(() => {
    (async () => {
      if (!user) return;
      try {
        setLoading(true);

        const snap = await db
          .collection('appointments')
          .where('patientId', '==', user.uid)
          .get();

        const apps = snap.docs.map(d => ({
          id: d.id,
          ...(d.data() as any),
        })) as Appt[];
        setItems(apps);

        // fetch doctor metadata
        const doctorIds = Array.from(
          new Set(apps.map(a => a.doctorId).filter(Boolean)),
        ) as string[];
        const map: Record<string, any> = {};

        await Promise.all(
          doctorIds.map(async id => {
            try {
              const doc = await db.collection('users').doc(id).get();
              const data =
                doc.data && typeof doc.data === 'function'
                  ? doc.data()
                  : doc.data();
              map[id] = data || null;
            } catch {
              map[id] = null;
            }
          }),
        );

        setDoctorsMap(map);

        // specialties
        try {
          const snap2 = await db.collection('specialties').get();
          setSpecialtiesList(
            snap2.docs.map(d => ({ id: d.id, ...(d.data() as any) })),
          );
        } catch (e) {
          console.warn('load specialties', e);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // filter + sort
  const filtered = useMemo(() => {
    const norm = (s?: string) => (s || '').toLowerCase();
    return items
      .slice()
      .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
      .filter(i => {
        if (filter === 'all') return true;
        return norm(i.status) === filter;
      });
  }, [items, filter]);

  const renderItem = ({ item }: { item: Appt }) => {
    const doc = item.doctorId ? doctorsMap[item.doctorId] : null;
    const doctorName = (doc?.name || item.doctorId || 'Bác sĩ') as string;
    const specialty =
      (specialtiesList.find(s => s.id === doc?.specialty_id)?.name as string) ||
      doc?.specialty ||
      'Chưa có chuyên khoa';
    const clinic = item.location || doc?.clinic || 'Cơ sở 1';
    const status = (item.status || 'pending').toLowerCase();

    const statusLabelMap: Record<string, string> = {
      pending: 'Đang chờ xác nhận',
      accepted: 'Đã duyệt',
      completed: 'Đã hoàn thành',
      cancelled: 'Đã hủy',
    };
    const statusColorMap: Record<string, string> = {
      pending: '#FFF3CD',
      accepted: '#DBEAFE',
      completed: '#D1E7DD',
      cancelled: '#F8D7DA',
    };

    const startDate = new Date(item.start);
    const day = String(startDate.getDate()).padStart(2, '0');
    const month = String(startDate.getMonth() + 1).padStart(2, '0');
    const year = startDate.getFullYear();
    const hh = String(startDate.getHours()).padStart(2, '0');
    const mm = String(startDate.getMinutes()).padStart(2, '0');
    const dateLine = `Thứ ${
      ['CN', '2', '3', '4', '5', '6', '7'][startDate.getDay()]
    } • ${day}/${month}/${year} • ${hh}:${mm}`;

    const titleCase = (s: string) =>
      s.replace(
        /\w\S*/g,
        t => t.charAt(0).toUpperCase() + t.substr(1).toLowerCase(),
      );

    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <Avatar uri={doc?.photoURL} name={doctorName} size={56} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.cardDate}>{dateLine}</Text>
            <Text style={styles.cardDoctor}>
              {titleCase(doctorName)} {specialty ? `(${specialty})` : ''}
            </Text>
            <Text style={styles.cardClinic}>{clinic}</Text>
          </View>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: statusColorMap[status] || '#EEE' },
            ]}
          >
            <Text style={styles.statusText}>
              {statusLabelMap[status] || status}
            </Text>
          </View>

          <View style={{ height: 8 }} />

          {/* ✔️ CHỈ SỬA CHỖ NÀY: nếu completed → KHÔNG HIỆN nút "Hủy" */}
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity
              onPress={() =>
                (navigation as any).navigate('MedicalRecordDetail', {
                  appointmentId: item.id,
                })
              }
              style={styles.smallBtn}
            >
              <Text style={styles.smallBtnText}>Xem chi tiết</Text>
            </TouchableOpacity>

            <View style={{ width: 8 }} />

            {status === 'cancelled' ? (
              // Đã hủy: hiện "Đặt lại"
              <TouchableOpacity
                onPress={() => (navigation as any).navigate('Book')}
                style={styles.smallBtn}
              >
                <Text style={styles.smallBtnText}>Đặt lại</Text>
              </TouchableOpacity>
            ) : status === 'completed' ? (
              // ✔️ ĐÃ HOÀN THÀNH: KHÔNG cho hủy, KHÔNG hiện nút
              <View />
            ) : (
              // pending / accepted → hiện nút "Hủy"
              <TouchableOpacity
                onPress={() =>
                  safeAlert('Hủy lịch', 'Bạn có chắc muốn hủy lịch này?')
                }
                style={[styles.smallBtn, { backgroundColor: '#F8D7DA' }]}
              >
                <Text style={[styles.smallBtnText, { color: '#990000' }]}>
                  Hủy
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 24 }} />
      ) : (
        <View style={{ flex: 1 }}>
          {/* Filter bar */}
          <View style={styles.filterRow}>
            {[
              { key: 'all', label: 'Tất cả' },
              { key: 'pending', label: 'Đang chờ' },
              { key: 'accepted', label: 'Đã duyệt' },
              { key: 'completed', label: 'Đã hoàn thành' },
              { key: 'cancelled', label: 'Đã hủy' },
            ].map(f => (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key as any)}
                style={[
                  styles.filterPill,
                  filter === f.key && styles.filterPillActive,
                ]}
              >
                <Text
                  style={
                    filter === f.key
                      ? styles.filterTextActive
                      : styles.filterText
                  }
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={i => i.id}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.empty}>Bạn chưa có lịch hẹn</Text>
                <View style={{ height: 12 }} />
                <Button
                  title="Đặt lịch ngay"
                  onPress={() => (navigation as any).navigate('Book')}
                />
              </View>
            }
            contentContainerStyle={{ paddingBottom: 16 }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F4F6F8' },
  empty: { textAlign: 'center', color: '#666', marginTop: 24 },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 4,
    paddingBottom: 12,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
  },
  filterPillActive: { backgroundColor: '#0EA5E9', borderColor: '#0EA5E9' },
  filterText: { color: '#374151', fontSize: 13 },
  filterTextActive: { color: '#fff', fontSize: 13 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardDate: { color: '#6B7280', fontSize: 13, marginBottom: 6 },
  cardDoctor: { fontSize: 16, fontWeight: '700', color: '#111827' },
  cardClinic: { color: '#6B7280', fontSize: 13, marginTop: 4 },

  statusPill: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12 },
  statusText: { fontSize: 12, color: '#333' },

  smallBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  smallBtnText: { color: '#0B61A4', fontSize: 13, fontWeight: '600' },

  emptyWrap: { alignItems: 'center', padding: 24 },
});
