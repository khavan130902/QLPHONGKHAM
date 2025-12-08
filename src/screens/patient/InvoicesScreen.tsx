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
        const list = await getInvoicesForPatient(user.uid);
        setItems(Array.isArray(list) ? list : []);

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
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={[...items].sort(
            (a, b) =>
              new Date(b.createdAt || 0).getTime() -
              new Date(a.createdAt || 0).getTime(),
          )}
          keyExtractor={i => i.id}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.empty}>Không có hóa đơn</Text>
            </View>
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
                activeOpacity={0.9}
              >
                <View style={styles.row}>
                  <Avatar uri={doctor?.photoURL} name={doctor?.name} size={48} />

                  <View style={styles.info}>
                    <Text style={styles.title} numberOfLines={2}>
                      {item.title || 'Hóa đơn dịch vụ'}
                    </Text>
                    <Text style={styles.sub}>
                      Ngày tạo: {formatTs(item.createdAt)}
                    </Text>
                    <Text style={styles.sub}>
                      Tổng tiền: {formatMoney(item.total ?? item.amount)}
                    </Text>
                  </View>
                </View>

                <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
                  <Text style={[styles.statusText, { color: s.color }]}>
                    {s.text}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F6F7FB' },

  // Empty
  emptyWrap: { paddingTop: 40, alignItems: 'center' },
  empty: { color: '#7B8794', fontSize: 16 },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  row: { flexDirection: 'row', alignItems: 'center' },
  info: { marginLeft: 12, flex: 1 },

  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  sub: { color: '#4B5563', fontSize: 13, marginTop: 2 },

  statusPill: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
