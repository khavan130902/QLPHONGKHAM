// screens/DoctorHistoryScreen.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import db from '@/services/firestore';
import { useAuth } from '@/context/AuthContext';

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
const VNCurrency = (n: any) => (Number(n) || 0).toLocaleString('vi-VN') + '₫';

export default function DoctorHistoryScreen() {
  const { user } = useAuth() as any;
  const [items, setItems] = useState<any[]>([]);
  const [patientsMap, setPatientsMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Query theo doctorId để khỏi cần index phức tạp
      const snap = await db
        .collection('appointments')
        .where('doctorId', '==', user.uid)
        .get();

      const all = snap.docs
        .map(d => ({ id: d.id, ...(d.data() as any) }))
        .map(it => ({ ...it, startISO: toIso(it.start) }))
        .filter(it => it.status === 'completed' && !!it.startISO)
        .sort((a, b) => +new Date(b.startISO) - +new Date(a.startISO)); // mới nhất trước

      setItems(all);

      // Prefetch bệnh nhân (unique)
      const ids = Array.from(
        new Set(all.map(i => i.patientId).filter(Boolean)),
      );
      if (ids.length) {
        const docs = await Promise.all(
          ids.map(id => db.collection('users').doc(id).get()),
        );
        const m: Record<string, any> = {};
        docs.forEach(d => {
          const dd = d.data();
          if (dd) m[d.id] = dd;
        });
        setPatientsMap(m);
      }
    } catch (err) {
      console.warn('load doctor history failed', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(it => {
      const p = patientsMap[it.patientId];
      const name = (p?.name || it.patientId || '').toLowerCase();
      const svc = (it.meta?.serviceName || '').toLowerCase();
      return name.includes(needle) || svc.includes(needle);
    });
  }, [items, q, patientsMap]);

  const renderItem = ({ item }: { item: any }) => {
    const patient = patientsMap[item.patientId];
    const name = patient?.name || item.patientId || 'Bệnh nhân';
    const photo = patient?.photoURL;
    const initials = (() => {
      const parts = (name || '').trim().split(/\s+/);
      if (!parts.length) return 'BN';
      return (
        parts.length === 1
          ? parts[0].slice(0, 2)
          : (parts[0][0] || '') + (parts[parts.length - 1][0] || '')
      ).toUpperCase();
    })();

    const d = new Date(item.startISO);
    const dateText = d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const timeText = d.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const amount = item.meta?.servicePrice ?? item.price;
    const service = item.meta?.serviceName || 'Dịch vụ khám';

    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          pressed && { opacity: 0.96, transform: [{ scale: 0.995 }] },
        ]}
        android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
      >
        {/* trái: avatar */}
        {photo ? (
          <Image source={{ uri: photo }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={{ fontWeight: '800', color: '#0F172A' }}>
              {initials}
            </Text>
          </View>
        )}

        {/* giữa: nội dung */}
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={styles.rowBetween}>
            <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
              {name}
            </Text>
            <View style={styles.datePill}>
              <Text style={styles.datePillText}>{dateText}</Text>
            </View>
          </View>
          <Text style={styles.service} numberOfLines={1}>
            {service}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {`Giờ: ${timeText}`}
            {item.roomId ? ` • Phòng ${item.roomId}` : ''}
          </Text>
        </View>

        {/* phải: số tiền */}
        <View style={{ marginLeft: 10, alignItems: 'flex-end' }}>
          <Text style={styles.amount}>{VNCurrency(amount)}</Text>
          <Text style={styles.status}>Đã hoàn thành</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lịch sử đã khám</Text>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Tìm theo tên bệnh nhân hoặc dịch vụ…"
        placeholderTextColor="#9CA3AF"
        style={styles.search}
      />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 16 }} color="#1976d2" />
      ) : filtered.length === 0 ? (
        <Text style={styles.empty}>Chưa có lịch đã hoàn thành</Text>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 24 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}
    </View>
  );
}

const AVATAR = 48;

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
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 8,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2 },
  avatarPlaceholder: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  datePill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  datePillText: { color: '#4F46E5', fontWeight: '700', fontSize: 12 },

  service: { color: '#2563EB', fontWeight: '600', marginTop: 2 },
  meta: { color: '#667085', marginTop: 2 },

  amount: { fontWeight: '800', color: '#111827' },
  status: { marginTop: 2, color: '#16A34A', fontWeight: '700', fontSize: 12 },

  empty: { textAlign: 'center', color: '#6B7280', marginTop: 20 },
});
