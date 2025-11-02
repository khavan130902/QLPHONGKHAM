// screens/PatientHome.tsx - Giao diện mới cho MOONCARE

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
  Animated,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import safeAlert from '@/utils/safeAlert';
import { useAuth } from '@/context/AuthContext';
import db from '@/services/firestore';
import Avatar from '@/components/Avatar';

// Định nghĩa lại Palette màu sắc hiện đại và chuyên nghiệp hơn
const PRIMARY_COLOR = '#007BFF'; // Xanh dương chủ đạo
const ACCENT_COLOR = '#00C896'; // Xanh ngọc
const CARD_COLOR_LIGHT = '#FFFFFF';
const TEXT_COLOR_DARK = '#1C274C';

type ActionItem = {
  key: string;
  title: string;
  route: string | null;
  icon: string;
};

// Giữ nguyên các hành động
const ACTIONS: ActionItem[] = [
  {
    key: 'medical_history',
    title: 'Quản lý hồ sơ bệnh án',
    route: 'MedicalHistory',
    icon: '🗂️',
  },
  { key: 'book', title: 'Đặt lịch khám', route: 'Book', icon: '📅' },
  {
    key: 'appointments',
    title: 'Trạng thái lịch hẹn',
    route: 'Appointments',
    icon: '🗓️',
  },
  {
    key: 'list_doctor',
    title: 'Danh sách khoa & bác sĩ',
    route: 'ListDoctor',
    icon: '🩺',
  },
  { key: 'profile', title: 'Hồ sơ cá nhân', route: 'Profile', icon: '👤' },
  { key: 'invoices', title: 'Hóa đơn', route: 'Invoices', icon: '🧾' },
  { key: 'settings', title: 'Cài đặt', route: 'Settings', icon: '⚙️' },
];

// Định nghĩa lại màu sắc cho icon dựa trên key
const ICON_COLORS: Record<string, string> = {
  medical_history: ACCENT_COLOR, // Xanh ngọc
  book: PRIMARY_COLOR, // Xanh dương
  appointments: '#FF9500', // Cam
  list_doctor: '#5AC8FA', // Xanh nhạt
  profile: '#34C759', // Xanh lá
  invoices: '#FF3B30', // Đỏ
  settings: '#8E8E93', // Xám
};

export default function PatientHome() {
  const navigation = useNavigation();
  const { user } = useAuth() as any;
  const [profile, setProfile] = useState<any>(null);
  const [todayCount, setTodayCount] = useState<number>(0);

  // LOGIC CỦA BẠN (Animation, Load Profile, Load Appointments) được giữ nguyên
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 380, useNativeDriver: true }).start();
  }, []);
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) return;
      try {
        const doc = await db.collection('users').doc(user.uid).get();
        mounted && setProfile(doc.data() || null);
      } catch (e) {
        console.warn('profile', e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    (async () => {
      if (!user) return;
      try {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        const snap = await db
          .collection('appointments')
          .where('patientId', '==', user.uid)
          .where('start', '>=', start.toISOString())
          .where('start', '<=', end.toISOString())
          .get();
        setTodayCount(snap.size || 0);
      } catch (e) {
        console.warn('today count', e);
      }
    })();
  }, [user]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 11) return 'Chào buổi sáng';
    if (h < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  }, []);

  function open(item: ActionItem) {
    if (item.route) (navigation as any).navigate(item.route);
    else safeAlert('Chưa có', 'Chức năng này sẽ sớm có mặt!');
  }

  // --- RENDERING ---
  return (
    <Animated.View style={[styles.container, { opacity: fade }]}>
      
      {/* HEADER CARD MỚI */}
      <Pressable
        style={styles.headerCard}
        onPress={() => (navigation as any).navigate('Appointments')}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerGreeting}>{greeting}</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {profile?.name || 'Bệnh nhân'}
          </Text>
          <View style={styles.appointmentPill}>
            <Text style={styles.appointmentText}>
              **Hôm nay có {todayCount} lịch**
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.avatarButton}
          onPress={() => (navigation as any).navigate('Profile')}
        >
          <Avatar uri={profile?.photoURL} name={profile?.name} size={60} />
        </TouchableOpacity>
      </Pressable>

      <Text style={styles.sectionTitle}>Các chức năng chính</Text>

      {/* Grid actions MỚI */}
      <FlatList
        data={ACTIONS}
        keyExtractor={i => i.key}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.gridContainer}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        renderItem={({ item, index }) => (
          <ActionCard
            color={ICON_COLORS[item.key] || PRIMARY_COLOR}
            title={item.title}
            icon={item.icon}
            delay={80 * index}
            onPress={() => open(item)}
          />
        )}
      />
    </Animated.View>
  );
}

/* ---------- Action Card (New Style: White background, Color Icon) ---------- */
function ActionCard({
  title,
  color,
  icon,
  onPress,
  delay = 0,
}: {
  title: string;
  color: string;
  icon: string;
  onPress: () => void;
  delay?: number;
}) {
  // Giữ nguyên animation vào (enter animation) và hiệu ứng press
  const scale = useRef(new Animated.Value(0.95)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: 240,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 240,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, opacity, scale]);

  const pressIn = () =>
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      friction: 7,
    }).start();
  const pressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 7,
    }).start();

  return (
    <Animated.View
      style={[
        styles.actionCardContainer, // Sử dụng style mới
        { transform: [{ scale }], opacity },
      ]}
    >
      <Pressable
        android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
        style={styles.actionCardInner}
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={onPress}
      >
        <View style={[styles.actionIconWrap, { backgroundColor: color + '15' }]}>
          <Text style={[styles.actionIconText, { color: color }]}>
            {icon}
          </Text>
        </View>
        <Text style={styles.actionCardTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.actionChevron}>›</Text>
      </Pressable>
    </Animated.View>
  );
}

/* -------------------------------- Styles MỚI -------------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#F4F5F9' }, // Nền xám nhạt

  // --- Header Card Styles ---
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CARD_COLOR_LIGHT, // Nền trắng
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    // Shadow cho Header Card
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
      },
      android: { elevation: 3 },
    }),
  },
  headerContent: { flex: 1, marginRight: 15 },
  headerGreeting: { color: '#8E8E93', fontSize: 14, fontWeight: '500' },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: TEXT_COLOR_DARK,
    marginTop: 4,
  },
  appointmentPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#E6F0FF', // Xanh dương rất nhạt
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 10,
  },
  appointmentText: {
    color: PRIMARY_COLOR, // Chữ màu xanh dương chủ đạo
    fontSize: 13,
    fontWeight: '700',
  },
  avatarButton: {
    borderRadius: 30, // Avatar lớn hơn
  },
  
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_COLOR_DARK,
    marginBottom: 10,
    marginTop: 5,
  },

  // --- Grid Action Styles ---
  gridContainer: { paddingBottom: 28 },
  columnWrapper: { gap: 16 }, // Khoảng cách giữa các cột

  // Card chứa Action
  actionCardContainer: {
    flex: 1,
    minHeight: 120, // Cao hơn
    borderRadius: 16,
    backgroundColor: CARD_COLOR_LIGHT, // Nền trắng
    overflow: 'hidden',
    // Shadow nhẹ hơn cho Action Card
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  actionCardInner: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between', // Căn trên dưới
    alignItems: 'flex-start',
  },
  actionIconWrap: {
    width: 48, // Icon lớn hơn
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionIconText: { fontSize: 28, opacity: 0.9 },
  actionCardTitle: {
    color: TEXT_COLOR_DARK,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    lineHeight: 22,
  },
  actionChevron: {
    color: '#999999',
    fontSize: 24,
    fontWeight: '800',
    position: 'absolute', // Đẩy xuống góc dưới bên phải
    bottom: 10,
    right: 16,
  },
});