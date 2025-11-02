// src/screens/HistoryScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TextInput,
  Image,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import db from '@/services/firestore';
import Avatar from '@/components/Avatar';

type Appt = {
  id: string;
  start: any;
  end?: any;
  doctorId?: string;
  patientId?: string;
  status?: string;
  price?: number;
  meta?: {
    serviceName?: string;
    servicePrice?: number;
    [k: string]: any;
  };
};

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

export default function HistoryScreen() {
  const { user } = useAuth() as any;
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Appt[]>([]);
  const [people, setPeople] = useState<Record<string, any>>({});
  const [q, setQ] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) return;
      setLoading(true);
      try {
        const isDoctor = (user?.role || '').toLowerCase() === 'doctor';

        // Chỉ where theo 1 trường để tránh cần composite index
        const snap = await db.collection('appointments').get();

        const rows: Appt[] = snap.docs
          .map(d => ({ id: d.id, ...(d.data() as any) }))
          .filter(r => (r.status ?? '') === 'completed' && !!toIso(r.start))
          .sort(
            (a, b) =>
              new Date(toIso(b.start)!).getTime() -
              new Date(toIso(a.start)!).getTime(),
          );

        if (!mounted) return;
        setItems(rows);

        // Prefetch người đối diện (bác sĩ hoặc bệnh nhân)
        const ids = Array.from(
          new Set(
            rows
              .map(r => (isDoctor ? r.patientId : r.doctorId))
              .filter(Boolean) as string[],
          ),
        );
        if (ids.length) {
          const docs = await Promise.all(
            ids.map(id => db.collection('users').doc(id).get()),
          );
          const map: Record<string, any> = {};
          docs.forEach(d => {
            const data = d.data();
            if (data) map[d.id] = data;
          });
          if (mounted) setPeople(map);
        }
      } catch (e) {
        console.warn('load completed history failed', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter(it => {
      const other =
        people[
          (user?.role || '').toLowerCase() === 'doctor'
            ? it.patientId || ''
            : it.doctorId || ''
        ];
      const name = (other?.name || '').toLowerCase();
      const service = (it.meta?.serviceName || '').toLowerCase();
      return name.includes(term) || service.includes(term);
    });
  }, [q, items, people, user]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lịch sử đã khám</Text>

      <TextInput
        placeholder="Tìm theo tên hoặc dịch vụ..."
        placeholderTextColor="#9CA3AF"
        value={q}
        onChangeText={setQ}
        style={styles.search}
      />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 16 }} />
      ) : filtered.length === 0 ? (
        <Text style={styles.empty}>Chưa có lịch đã hoàn thành.</Text>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => {
            const isDoctor = (user?.role || '').toLowerCase() === 'doctor';
            const otherId = isDoctor ? item.patientId : item.doctorId;
            const other = otherId ? people[otherId] : null;
            const otherName =
              other?.name ||
              (isDoctor ? 'Bệnh nhân' : 'Bác sĩ') + ` ${otherId || ''}`;
            const photo = other?.photoURL;
            const at = new Date(toIso(item.start)!);
            const timeStr = at.toLocaleString();
            const service = item.meta?.serviceName || 'Khám bệnh';
            const amount =
              Number(item.meta?.servicePrice ?? item.price ?? 0) || 0;

            return (
              <View style={styles.card}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {photo ? (
                    <Image source={{ uri: photo }} style={styles.avatar} />
                  ) : (
                    <Avatar name={otherName} size={44} />
                  )}
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.name}>{otherName}</Text>
                    <Text style={styles.meta}>
                      {service} • {timeStr}
                    </Text>
                    <Text style={styles.price}>
                      {amount > 0 ? `₫ ${amount.toLocaleString('vi-VN')}` : '—'}
                    </Text>
                  </View>
                  <Text style={styles.tagDone}>completed</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F9FAFB' },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  search: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  empty: { textAlign: 'center', color: '#6B7280', marginTop: 18 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  name: { fontWeight: '700', color: '#0F172A', fontSize: 15.5 },
  meta: { color: '#64748B', marginTop: 2 },
  price: { color: '#0F172A', fontWeight: '800', marginTop: 4 },
  tagDone: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
    fontWeight: '700',
    fontSize: 12,
  },
});
