import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { getInvoicesForPatient } from '@/services/invoices';
import db from '@/services/firestore';
import Avatar from '@/components/Avatar';
import safeAlert from '@/utils/safeAlert';

const formatMoney = (n?: number | string | null) => {
  const v =
    typeof n === 'number'
      ? n
      : typeof n === 'string'
      ? Number(n.replace(/[^\d.-]/g, '')) || 0
      : 0;
  return v.toLocaleString('vi-VN') + '₫';
};
const formatTs = (v: any) => {
  try {
    if (!v) return '-';
    if (v?.toDate) return v.toDate().toLocaleString('vi-VN');
    return new Date(v).toLocaleString('vi-VN');
  } catch {
    return '-';
  }
};

export default function InvoicesScreen() {
  const { user } = useAuth() as any;
  const navigation = useNavigation();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [doctorsMap, setDoctorsMap] = useState<Record<string, any>>({});

  useEffect(() => {
    (async () => {
      if (!user) return;
      setLoading(true);
      try {
        // Lấy invoice của bệnh nhân
        const list = await getInvoicesForPatient(user.uid);
        setItems(Array.isArray(list) ? list : []);

        // Prefetch thông tin bác sĩ để hiển thị avatar + tên
        const doctorIds = Array.from(
          new Set((list || []).map((x: any) => x.doctorId).filter(Boolean)),
        ) as string[];

        const map: Record<string, any> = {};
        await Promise.all(
          doctorIds.map(async id => {
            try {
              const doc = await db.collection('users').doc(id).get();
              const data = doc.data ? doc.data() : undefined;
              if (data) map[id] = { id: doc.id, ...data };
            } catch {}
          }),
        );
        setDoctorsMap(map);
      } catch (e) {
        console.warn('load invoices', e);
        safeAlert('Lỗi', 'Không tải được hóa đơn');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const statusUi = (status?: string) => {
    const s = (status || 'pending').toLowerCase();
    switch (s) {
      case 'paid':
        return { text: 'Đã thanh toán', bg: '#D1FAE5', color: '#065F46' };
      case 'cancelled':
        return { text: 'Đã hủy', bg: '#FEE2E2', color: '#991B1B' };
      case 'refunded':
        return { text: 'Đã hoàn tiền', bg: '#E0E7FF', color: '#3730A3' };
      default:
        return { text: 'Chờ thanh toán', bg: '#FEF3C7', color: '#92400E' };
    }
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={[...items].sort(
            (a, b) =>
              new Date(b.createdAt || 0).getTime() -
              new Date(a.createdAt || 0).getTime(),
          )}
          keyExtractor={i => i.id}
          ListEmptyComponent={
            <Text style={{ color: '#666' }}>Không có hóa đơn</Text>
          }
          renderItem={({ item }) => {
            const doctor = doctorsMap[item.doctorId];
            const s = statusUi(item.status);
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() =>
                  (navigation as any).navigate('InvoiceDetail', { id: item.id })
                }
                activeOpacity={0.85}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Avatar
                    uri={doctor?.photoURL}
                    name={doctor?.name}
                    size={44}
                  />
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={styles.title} numberOfLines={2}>
                      {item.title || 'Hóa đơn dịch vụ'}
                    </Text>
                    <Text style={styles.sub}>
                      Ngày tạo: {formatTs(item.createdAt)}
                    </Text>
                    <Text style={styles.sub}>
                      Tổng: {formatMoney(item.total ?? item.amount)}
                    </Text>
                  </View>
                </View>

                <View style={[styles.pill, { backgroundColor: s.bg }]}>
                  <Text style={{ fontWeight: '800', color: s.color }}>
                    {s.text}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ paddingBottom: 16 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F4F6F8' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  title: { fontWeight: '800', color: '#0F172A' },
  sub: { color: '#475569', marginTop: 2 },
  pill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
});
