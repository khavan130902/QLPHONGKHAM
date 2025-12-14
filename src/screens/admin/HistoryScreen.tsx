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
  SafeAreaView,
} from 'react-native';

import { useAuth } from '@/context/AuthContext';
import db from '@/services/firestore';
import Avatar from '@/components/Avatar';

// =================================================================
// KHAI BÁO CƠ SỞ VÀ HÀM TIỆN ÍCH
// =================================================================

// Bảng màu thống nhất cho giao diện
const COLORS = {
  primary: '#2596be', 
  background: '#f8f9fa',
  cardBackground: '#ffffff', 
  textDark: '#1c1c1c',
  textLight: '#4a4a4a',
  subtitle: '#777777',
  shadowColor: '#000000',
  tagSuccess: '#607d8b', 
  searchIcon: '#9CA3AF',
};

// Định nghĩa Type cho cấu trúc dữ liệu cuộc hẹn
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

/**
 * Hàm chuyển đổi Timestamp/Date sang chuỗi ISO 8601. 
 * Đảm bảo định dạng thống nhất cho việc sắp xếp và hiển thị.
 */
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
  
  // State quản lý trạng thái tải, danh sách cuộc hẹn, thông tin người đối diện, và từ khóa tìm kiếm
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Appt[]>([]);
  const [people, setPeople] = useState<Record<string, any>>({});
  const [q, setQ] = useState('');

  // =================================================================
  // LOGIC TẢI DỮ LIỆU (LỊCH SỬ VÀ THÔNG TIN NGƯỜI ĐỐI DIỆN)
  // =================================================================
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) return;
      setLoading(true);
      try {
        const isDoctor = (user?.role || '').toLowerCase() === 'doctor';

        // 1. Tải tất cả cuộc hẹn
        const snap = await db.collection('appointments').get();

        // 2. Lọc: Chỉ lấy các cuộc hẹn đã HOÀN THÀNH ('completed') và có thời gian hợp lệ.
        // 3. Sắp xếp: Mới nhất lên đầu (thời gian giảm dần).
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

        // 4. Tải trước (Prefetch) thông tin người đối diện (Bác sĩ/Bệnh nhân)
        const ids = Array.from(
          new Set(
            rows
              .map(r => (isDoctor ? r.patientId : r.doctorId))
              .filter(Boolean) as string[],
          ),
        );
        if (ids.length) {
          // Tải thông tin user chi tiết (tên, ảnh) từ Firestore
          const docs = await Promise.all(
            ids.map(id => db.collection('users').doc(id).get()),
          );
          const map: Record<string, any> = {};
          docs.forEach(d => {
            const data = d.data();
            if (data) map[d.id] = data;
          });
          if (mounted) setPeople(map); // Lưu vào state people
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

  // =================================================================
  // LOGIC TÌM KIẾM VÀ LỌC DỮ LIỆU
  // =================================================================

  /**
   * useMemo: Danh sách đã lọc dựa trên từ khóa tìm kiếm (q).
   * Lọc theo Tên người đối diện hoặc Tên Dịch vụ.
   */
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items; // Nếu không có từ khóa, hiển thị toàn bộ

    return items.filter(it => {
      // Xác định người đối diện (Bác sĩ nếu user là Bệnh nhân, hoặc ngược lại)
      const other =
        people[
          (user?.role || '').toLowerCase() === 'doctor'
            ? it.patientId || ''
            : it.doctorId || ''
        ];
      const name = (other?.name || '').toLowerCase();
      const service = (it.meta?.serviceName || '').toLowerCase();
      
      // Kiểm tra xem tên hoặc dịch vụ có chứa từ khóa tìm kiếm không
      return name.includes(term) || service.includes(term);
    });
  }, [q, items, people, user]);


  // =================================================================
  // GIAO DIỆN (RENDER)
  // =================================================================
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Lịch sử đã khám</Text>

        {/* Thanh tìm kiếm */}
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

        {/* Khối hiển thị: Loading / Trống / Danh sách */}
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
              
              // Chuẩn bị các biến hiển thị (Tên, Ảnh, Thời gian, Dịch vụ, Giá)
              const otherName =
                other?.name ||
                (isDoctor ? 'Bệnh nhân' : 'Bác sĩ') + ` ${otherId || ''}`;
              const photo = other?.photoURL;
              const at = new Date(toIso(item.start)!);
              const timeStr = at.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) + ' ' + at.toLocaleDateString('vi-VN');
              const service = item.meta?.serviceName || 'Khám bệnh';
              const amount =
                Number(item.meta?.servicePrice ?? item.price ?? 0) || 0;
              const cardBorderColor = COLORS.tagSuccess; // Màu viền trái cố định cho lịch sử hoàn thành

              return (
                <View style={[styles.card, { borderLeftColor: cardBorderColor }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    
                    {/* Avatar và Tên */}
                    <View style={styles.avatarWrapper}>
                      {photo ? (
                        <Image source={{ uri: photo }} style={styles.avatar} />
                      ) : (
                        <Avatar name={otherName} size={48} /> 
                      )}
                    </View>
                    
                    {/* Thông tin Cuộc hẹn */}
                    <View style={styles.infoContainer}>
                      <Text style={styles.name}>{otherName}</Text>
                      <Text style={styles.serviceText}>{service}</Text>
                      <Text style={styles.timeText}>{timeStr}</Text>
                    </View>
                    
                    {/* Giá tiền đã thanh toán */}
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

// =================================================================
// STYLES (ĐỊNH NGHĨA GIAO DIỆN)
// =================================================================
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, paddingHorizontal: 16, backgroundColor: COLORS.background },
  title: {
    fontSize: 22, 
    fontWeight: '800',
    color: COLORS.textDark, 
    marginTop: 10,
    marginBottom: 15,
  },
  // --- Search Bar Styles ---
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.subtitle, 
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
  // --- List & Card Styles ---
  loading: { marginTop: 16 },
  listContent: { paddingBottom: 24 },
  empty: { textAlign: 'center', color: COLORS.textLight, marginTop: 18 },
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12, 
    borderLeftWidth: 5, // Viền trái tạo điểm nhấn
    shadowColor: COLORS.shadowColor,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  avatarWrapper: {
    marginRight: 12,
  },
  avatar: { width: 48, height: 48, borderRadius: 24 }, 
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
    color: COLORS.textLight, 
    fontSize: 13,
  },
  timeText: { 
    color: COLORS.subtitle, 
    fontSize: 11, 
    marginTop: 4 
  },
  price: { 
    color: COLORS.textDark, 
    fontWeight: '800', 
    fontSize: 16,
    backgroundColor: COLORS.background, // Tạo nền nổi bật cho giá tiền
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  
});