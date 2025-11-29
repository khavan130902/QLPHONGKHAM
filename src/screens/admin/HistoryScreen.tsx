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
  SafeAreaView, // Thêm SafeAreaView để xử lý notch/thanh trạng thái
} from 'react-native';
// Đảm bảo các imports này hoạt động trong môi trường của bạn:
import { useAuth } from '@/context/AuthContext';
import db from '@/services/firestore';
import Avatar from '@/components/Avatar';

// Bảng màu được cung cấp
const COLORS = {
  primary: '#2596be', // Màu xanh chủ đạo
  background: '#f8f9fa', // Nền tổng thể rất nhạt
  cardBackground: '#ffffff', // Nền card trắng
  textDark: '#1c1c1c',
  textLight: '#4a4a4a',
  subtitle: '#777777',
  shadowColor: '#000000',
  // Thêm màu phụ để sử dụng trong card
  tagSuccess: '#607d8b', // Xanh lá cho trạng thái hoàn thành (viền)
  searchIcon: '#9CA3AF',
};

// Định nghĩa Type để dễ quản lý (giữ nguyên type Appt)
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

  // ... (useEffect và useMemo giữ nguyên logic) ...
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) return;
      setLoading(true);
      try {
        const isDoctor = (user?.role || '').toLowerCase() === 'doctor';

        // Lấy dữ liệu (GIỮ NGUYÊN LOGIC FIREBASE CỦA BẠN)
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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Lịch sử đã khám</Text>

        {/* Thanh tìm kiếm với icon và style mới */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            placeholder="Tìm theo tên hoặc dịch vụ..."
            placeholderTextColor={COLORS.searchIcon}
            value={q}
            onChangeText={setQ}
            style={styles.searchInput}
          />
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loading} color={COLORS.primary} />
        ) : filtered.length === 0 ? (
          <Text style={styles.empty}>Chưa có lịch đã hoàn thành.</Text>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={i => i.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isDoctor = (user?.role || '').toLowerCase() === 'doctor';
              const otherId = isDoctor ? item.patientId : item.doctorId;
              const other = otherId ? people[otherId] : null;
              const otherName =
                other?.name ||
                (isDoctor ? 'Bệnh nhân' : 'Bác sĩ') + ` ${otherId || ''}`;
              const photo = other?.photoURL;
              const at = new Date(toIso(item.start)!);
              // Định dạng thời gian rõ ràng hơn
              const timeStr = at.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) + ' ' + at.toLocaleDateString('vi-VN');
              const service = item.meta?.serviceName || 'Khám bệnh';
              const amount =
                Number(item.meta?.servicePrice ?? item.price ?? 0) || 0;
              
              // Màu viền card sẽ là màu success nếu completed, hoặc màu primary nếu có trạng thái khác
              const cardBorderColor = item.status === 'completed' ? COLORS.tagSuccess : COLORS.primary;

              return (
                <View style={[styles.card, { borderLeftColor: cardBorderColor }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {/* Avatar */}
                    <View style={styles.avatarWrapper}>
                      {photo ? (
                        <Image source={{ uri: photo }} style={styles.avatar} />
                      ) : (
                        <Avatar name={otherName} size={48} /> 
                      )}
                    </View>
                    
                    {/* Thông tin */}
                    <View style={styles.infoContainer}>
                      <Text style={styles.name}>{otherName}</Text>
                      <Text style={styles.serviceText}>{service}</Text>
                      <Text style={styles.timeText}>{timeStr}</Text>
                    </View>
                    
                    {/* Giá tiền */}
                    <View style={styles.priceContainer}>
                      <Text style={styles.price}>
                        {amount > 0 ? `₫ ${amount.toLocaleString('vi-VN')}` : 'Miễn phí'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, paddingHorizontal: 16, backgroundColor: COLORS.background },
  title: {
    fontSize: 22, // Tăng kích thước
    fontWeight: '800',
    color: COLORS.textDark, // Dùng textDark
    marginTop: 10,
    marginBottom: 15,
  },
  // --- Search Bar Mới ---
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.subtitle, // Dùng subtitle cho màu border nhạt hơn
    paddingHorizontal: 12,
    marginBottom: 20,
    shadowColor: COLORS.shadowColor,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 3,
  },
  searchIcon: {
    fontSize: 18,
    color: COLORS.searchIcon,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: COLORS.textDark,
    fontSize: 14,
  },
  // --- List & Card ---
  loading: { marginTop: 16 },
  listContent: { paddingBottom: 24 },
  empty: { textAlign: 'center', color: COLORS.textLight, marginTop: 18 },
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12, // Tăng khoảng cách giữa các thẻ
    borderLeftWidth: 5, // Viền trái
    shadowColor: COLORS.shadowColor,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  avatarWrapper: {
    marginRight: 12,
  },
  avatar: { width: 48, height: 48, borderRadius: 24 }, // Tăng kích thước avatar
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  priceContainer: {
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  name: { 
    fontWeight: '700', 
    color: COLORS.textDark, 
    fontSize: 16,
    marginBottom: 2,
  },
  serviceText: {
    color: COLORS.textLight, // Dùng textLight
    fontSize: 13,
  },
  timeText: { 
    color: COLORS.subtitle, // Dùng subtitle
    fontSize: 11, 
    marginTop: 4 
  },
  price: { 
    color: COLORS.textDark, 
    fontWeight: '800', 
    fontSize: 16,
    backgroundColor: COLORS.background, // Nền nhẹ cho giá tiền
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  // Đã loại bỏ styles cũ
});