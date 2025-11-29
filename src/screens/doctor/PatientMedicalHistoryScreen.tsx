// screens/doctor/PatientMedicalHistoryScreen.tsx
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
  SafeAreaView,
} from 'react-native';
import { useRoute, useNavigation, NavigationProp, RouteProp } from '@react-navigation/native';
import Icon from '@react-native-vector-icons/feather';
import db from '@/services/firestore';
import { useAuth } from '@/context/AuthContext';

// Định nghĩa kiểu dữ liệu cho Route (giúp TypeScript hoạt động tốt)
type PatientMedicalHistoryRouteProp = RouteProp<
  { PatientMedicalHistory: { focusedPatientId: string } },
  'PatientMedicalHistory'
>;

// --- Global Functions (Sử dụng lại) ---

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

// --- Color Palette mới (Sử dụng lại) ---
const COLORS = {
  primary: '#1976D2', 
  background: '#F4F7F9', 
  cardBackground: '#FFFFFF',
  textDark: '#121212',
  textMuted: '#6B7280',
  success: '#16A34A',
  borderColor: '#E0E0E0',
  searchBackground: '#f0f0f0',
};

// --- Component Chính ---

export default function PatientMedicalHistoryScreen() {
  // 🌟 Lấy patientId từ route params
  const route = useRoute<PatientMedicalHistoryRouteProp>();
  const focusedPatientId = route.params?.focusedPatientId;

  const navigation = useNavigation<NavigationProp<any>>();
  const [items, setItems] = useState<any[]>([]);
  // 🌟 Đổi tên map thành doctorsMap để lưu trữ thông tin bác sĩ
  const [doctorsMap, setDoctorsMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [patientProfile, setPatientProfile] = useState<any>(null); // Để hiển thị tên bệnh nhân
  const [q, setQ] = useState('');

  // 🌟 HÀM TẢI DỮ LIỆU ĐÃ ĐIỀU CHỈNH VÀ SỬA LỖI
  const load = useCallback(async () => {
    if (!focusedPatientId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Tải thông tin bệnh nhân (để hiển thị tiêu đề)
      const pdoc = await db.collection('users').doc(focusedPatientId).get();
      
      // 🌟 SỬA LỖI GẠCH ĐỎ: Kiểm tra dữ liệu trả về tồn tại
      const patientData = pdoc.data();
      if (patientData) {
        setPatientProfile({ id: pdoc.id, ...patientData });
      }

      // 2. Query lịch sử khám bệnh của bệnh nhân đó
      const snap = await db
        .collection('appointments')
        .where('patientId', '==', focusedPatientId)
        .get();

      const all = snap.docs
        .map(d => ({ id: d.id, ...(d.data() as any) }))
        .map(it => ({ ...it, startISO: toIso(it.start) }))
        .filter(it => it.status === 'completed' && !!it.startISO)
        .sort((a, b) => +new Date(b.startISO) - +new Date(a.startISO));

      setItems(all);

      // 3. Tải thông tin các Bác sĩ đã khám cho bệnh nhân
      const doctorIds = Array.from(
        new Set(all.map(i => i.doctorId).filter(Boolean)),
      );
      if (doctorIds.length) {
        const docs = await Promise.all(
          doctorIds.map(id => db.collection('users').doc(id).get()),
        );
        const m: Record<string, any> = {};
        docs.forEach(d => {
          const dd = d.data();
          if (dd) m[d.id] = dd;
        });
        setDoctorsMap(m);
      }
    } catch (err) {
      console.warn('load patient history failed', err);
    } finally {
      setLoading(false);
    }
  }, [focusedPatientId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(it => {
      const d = doctorsMap[it.doctorId];
      const name = (d?.name || it.doctorId || '').toLowerCase();
      const svc = (it.meta?.serviceName || '').toLowerCase();
      return name.includes(needle) || svc.includes(needle);
    });
  }, [items, q, doctorsMap]);
  
  // 🌟 HÀM XEM CHI TIẾT LỊCH KHÁM
  const handlePressDetail = (appointmentId: string) => {
    // Điều hướng đến AppointmentDetail, truyền ID lịch khám
    navigation.navigate('AppointmentDetail', { appointmentId: appointmentId });
  };

  const patientName = patientProfile?.name || focusedPatientId || 'Bệnh nhân';

  const renderItem = ({ item }: { item: any }) => {
    // 🌟 Lấy thông tin Bác sĩ
    const doctor = doctorsMap[item.doctorId];
    const name = doctor?.name || item.doctorId || 'Bác sĩ';
    const photo = doctor?.photoURL;
    const initials = (() => {
      const parts = (name || '').trim().split(/\s+/);
      if (!parts.length) return 'BS';
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
        onPress={() => handlePressDetail(item.id)} // 🌟 THÊM ONPRESS
        android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
      >
        <View style={styles.cardContent}>
          {/* Cột trái: Avatar + Tên Bác sĩ */}
          <View style={styles.patientInfo}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.initialsText}>{initials}</Text>
              </View>
            )}
            <View style={{ marginLeft: 12, flexShrink: 1 }}>
              <Text style={styles.name} numberOfLines={1}>
                {name}
              </Text>
              <Text style={styles.service} numberOfLines={1}>
                {service}
              </Text>
            </View>
          </View>

          {/* Cột phải: Thời gian & Tiền */}
          <View style={styles.details}>
            <View style={styles.dateTimeContainer}>
              <Icon name="calendar" size={14} color={COLORS.textMuted} />
              <Text style={styles.dateTimeText}>{dateText}</Text>
            </View>
            <View style={styles.dateTimeContainer}>
              <Icon name="clock" size={14} color={COLORS.textMuted} />
              <Text style={styles.dateTimeText}>{timeText}</Text>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.amount}>{VNCurrency(amount)}</Text>
            </View>
          </View>
        </View>

        {/* Footer: Trạng thái */}
        <View style={styles.cardFooter}>
          <Text style={styles.status}>
            <Icon name="check-circle" size={12} color={COLORS.success} /> Đã hoàn thành
          </Text>
          {item.roomId ? (
            <Text style={styles.meta}>
              <Icon name="home" size={12} color={COLORS.textMuted} /> {`Phòng ${item.roomId}`}
            </Text>
          ) : null}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={styles.container}>
        <Text style={styles.title}>Lịch sử khám của {patientName}</Text>
        
        {!focusedPatientId ? (
            <Text style={styles.empty}>Không tìm thấy ID bệnh nhân.</Text>
        ) : (
          <>
            <View style={styles.searchContainer}>
              <Icon name="search" size={20} color={COLORS.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Tìm theo tên bác sĩ hoặc dịch vụ..."
                placeholderTextColor={COLORS.textMuted}
                style={styles.search}
              />
            </View>

            {loading ? (
              <ActivityIndicator style={{ marginTop: 20 }} color={COLORS.primary} size="large" />
            ) : filtered.length === 0 ? (
              <Text style={styles.empty}>Bệnh nhân này chưa có lịch sử khám bệnh nào đã hoàn thành.</Text>
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={i => i.id}
                renderItem={renderItem}
                contentContainerStyle={{ paddingBottom: 24, paddingTop: 10 }}
                ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                showsVerticalScrollIndicator={false}
              />
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

// --- Stylesheet (Giữ nguyên) ---

const AVATAR = 50;

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, backgroundColor: COLORS.background },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 16,
    paddingTop: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.searchBackground,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 48,
  },
  search: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textDark,
    paddingVertical: 0,
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.borderColor,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderColor,
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2 },
  avatarPlaceholder: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: '#C5CAE9', 
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontWeight: '800', 
    color: COLORS.textDark, 
    fontSize: 18,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textDark,
    marginRight: 8,
  },
  service: { 
    color: COLORS.primary, 
    fontWeight: '600', 
    marginTop: 2, 
    fontSize: 14 
  },
  details: {
    alignItems: 'flex-end',
    marginLeft: 10,
    marginTop: 5,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  dateTimeText: { 
    color: COLORS.textMuted, 
    fontSize: 13, 
    marginLeft: 4,
  },
  priceContainer: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#F3F4F6', 
    borderRadius: 6,
  },
  amount: { 
    fontWeight: '800', 
    color: COLORS.textDark, 
    fontSize: 16 
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    marginTop: 5,
  },
  status: { 
    color: COLORS.success, 
    fontWeight: '700', 
    fontSize: 13 
  },
  meta: { 
    color: COLORS.textMuted, 
    fontWeight: '500', 
    fontSize: 13 
  },
  empty: { 
    textAlign: 'center', 
    color: COLORS.textMuted, 
    marginTop: 30, 
    fontSize: 15 
  },
});