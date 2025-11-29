// screens/PatientHome.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  Pressable,
  SafeAreaView,
  Image,
  StatusBar,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import db from '@/services/firestore';
import Avatar from '@/components/Avatar';
import safeAlert from '@/utils/safeAlert';

const COLORS = {
  primary: '#2596be',
  background: '#f8f9fa',
  cardBackground: '#ffffff',
  textDark: '#1c1c1c',
  subtitle: '#777777',
  shadowColor: '#000000',
};
const { width } = Dimensions.get('window');

const BANNERS = [
  { id: '1', image: require('../../../assets/banner4.png'), title: 'Khám sức khỏe định kỳ, bảo vệ bạn và gia đình' },
  { id: '2', image: require('../../../assets/banner5.png'), title: 'Đặt lịch khám nhanh chóng, không cần chờ đợi' },
  { id: '3', image: require('../../../assets/banner6.png'), title: 'Theo dõi hồ sơ bệnh án của bạn mọi lúc mọi nơi' },
];

const ACTIONS = [
  { key: 'medical_history', title: 'Hồ sơ bệnh án', route: 'MedicalHistory', icon: '🗂️', color: '#00C896' },
  { key: 'book', title: 'Đặt lịch khám', route: 'Book', icon: '📅', color: '#2596be' },
  { key: 'appointments', title: 'Lịch hẹn', route: 'Appointments', icon: '🗓️', color: '#FF9500' },
  { key: 'list_doctor', title: 'Khoa & Bác sĩ', route: 'ListDoctor', icon: '🩺', color: '#5AC8FA' },
  { key: 'profile', title: 'Hồ sơ cá nhân', route: 'Profile', icon: '👤', color: '#34C759' },
  { key: 'invoices', title: 'Hóa đơn', route: 'Invoices', icon: '🧾', color: '#FF3B30' },
  { key: 'settings', title: 'Cài đặt', route: 'Settings', icon: '⚙️', color: '#8E8E93' },
];

const AUTO_SCROLL_INTERVAL = 3000; // Tự động cuộn sau 3 giây

export default function PatientHome() {
  const navigation = useNavigation();
  const { user } = useAuth() as any;
  const [profile, setProfile] = useState<any>(null);
  const fade = useRef(new Animated.Value(0)).current;
  const scrollX = useRef(new Animated.Value(0)).current;
  
  // Ref cho ScrollView để thực hiện cuộn
  const flatListRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // LOGIC TỰ ĐỘNG CUỘN (AUTO-SCROLLING)
  useEffect(() => {
    // Kích thước banner = width màn hình trừ padding 16*2
    const bannerWidth = width;
    
    // Tự động chuyển banner
    const interval = setInterval(() => {
      setActiveIndex(prevIndex => {
        const nextIndex = (prevIndex + 1) % BANNERS.length;
        
        // Dùng ScrollView ref để cuộn tới vị trí mới
        flatListRef.current?.scrollTo({
          x: nextIndex * bannerWidth,
          animated: true,
        });

        return nextIndex;
      });
    }, AUTO_SCROLL_INTERVAL);

    // Dọn dẹp interval khi component unmount
    return () => clearInterval(interval);
  }, [BANNERS.length]); 

  // Cập nhật activeIndex khi người dùng tự cuộn
  const onScroll = Animated.event(
      [{ nativeEvent: { contentOffset: { x: scrollX } } }],
      { 
          useNativeDriver: false,
          listener: (event: any) => {
              const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
              if (newIndex !== activeIndex) {
                  setActiveIndex(newIndex);
              }
          }
      }
  );


  // LOGIC KHỞI TẠO VÀ LẤY DỮ LIỆU
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
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

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 11) return 'Chào buổi sáng';
    if (h < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  }, []);

  function open(item: any) {
    if (item.route) (navigation as any).navigate(item.route);
    else safeAlert('Chưa có', 'Chức năng này sẽ sớm có mặt!');
  }

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: item.color || COLORS.primary }]}
      onPress={() => open(item)}
      activeOpacity={0.85}
    >
      <View style={[styles.iconCircle, { backgroundColor: item.color + '15' }]}>
        <Text style={styles.cardIcon}>{item.icon}</Text>
      </View>
      <View style={styles.cardTextContainer}>
        <Text style={styles.cardTitle}>{item.title}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  // Điều chỉnh style banner để khớp với logic cuộn
  const BANNER_WIDTH = width - 32;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <Animated.View style={[styles.container, { opacity: fade }]}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.headerGreeting}>{greeting}</Text>
              <Text style={styles.headerName}>{profile?.name || 'Bệnh nhân'}</Text>
            </View>
          </View>
          <Pressable onPress={() => (navigation as any).navigate('Profile')}>
            <Avatar uri={profile?.photoURL} name={profile?.name} size={50} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* BANNER SLIDER */}
          <ScrollView
            ref={flatListRef} // Gán ref cho ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll} // Sử dụng onScroll mới
            scrollEventThrottle={16}
            style={styles.bannerContainer}
            contentContainerStyle={{ paddingRight: 16 }} // Đẩy item cuối cùng vào đúng vị trí
          >
            {BANNERS.map((b, index) => (
              // Điều chỉnh width để không bị tràn khi cuộn
              <View key={b.id} style={[styles.banner, { width: BANNER_WIDTH, marginRight: index === BANNERS.length - 1 ? 0 : 16 }]}> 
                <Image source={b.image} style={styles.bannerImage} resizeMode="cover" />
                <View style={styles.bannerOverlay} />
                <Text style={styles.bannerTitle}>{b.title}</Text>
              </View>
            ))}
          </ScrollView>

          {/* PAGE DOTS */}
          <View style={styles.dotContainer}>
            {BANNERS.map((_, i) => {
              // Dùng activeIndex để xác định dot đang active
              const isActive = i === activeIndex;
              return (
                <View 
                    key={i} 
                    style={[
                        styles.dot, 
                        isActive ? styles.dotActive : styles.dotInactive
                    ]} 
                />
              );
            })}
          </View>

          {/* FEATURE GRID */}
          <FlatList
            data={ACTIONS}
            keyExtractor={i => i.key}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.listContent}
            renderItem={renderItem}
            scrollEnabled={false}
          />
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  header: {
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: width * 0.20, height: 90, marginRight: 2, tintColor: COLORS.cardBackground },
  headerGreeting: { left: 16, color: '#EAF8FF', fontSize: 14, fontWeight: '500' },
  headerName: { left: 16, color: '#fff', fontSize: 20, fontWeight: '700' },

  // BANNER
  bannerContainer: { marginTop: 16, paddingLeft: 16 }, 
  banner: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 200,
  },
  bannerImage: { width: '100%', height: '100%' },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  bannerTitle: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    width: '90%',
  },
  dotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    marginHorizontal: 4,
  },
  dotActive: {
    width: 20, // Dot active rộng hơn
    backgroundColor: COLORS.primary,
  },
  dotInactive: {
    width: 6,
    backgroundColor: COLORS.primary + '50',
  },

  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  listContent: {
    paddingBottom: 24,
    paddingTop: 20,
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 14,
    padding: 16,
    flex: 1,
    marginHorizontal: 6,
    minHeight: 130,
    justifyContent: 'space-between',
    borderLeftWidth: 6,
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 4,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardIcon: { fontSize: 26 },
  cardTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textDark },
  chevron: { position: 'absolute', right: 12, bottom: 23, fontSize: 22, color: '#999' },
});