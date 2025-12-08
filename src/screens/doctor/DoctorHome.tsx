// screens/DoctorHome.tsx (Đã refactor và đồng bộ với PatientHome/HomeScreen)
import React, { useEffect, useMemo, useRef, useState } from 'react'; // Thêm useRef
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  StatusBar,
  SafeAreaView,
  Dimensions,
  Platform,
  ListRenderItem, // Thêm ListRenderItem
} from 'react-native';
import Icon from '@react-native-vector-icons/feather';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import db from '@/services/firestore';
import safeAlert from '@/utils/safeAlert'; // Thêm để dùng cho chức năng chưa có

const { width } = Dimensions.get('window');

/** ====== BẢNG MÀU ĐỒNG BỘ VỚI HomeScreen.tsx ====== */
const COLORS = {
    primary: '#2596be',
    secondary: '#FF9500', 
    background: '#f4f4f8', 
    cardBackground: '#ffffff', 
    textDark: '#1c1c1c',
    subtitle: '#6b6b6b', 
    shadowColor: '#000000',
    success: '#34C759',
    info: '#1DA1F2',
    danger: '#FF3B30',
    iconDefault: '#4a4a4a',
};
const SHADOW_STYLE = {
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, 
    shadowRadius: 5,
    elevation: 2,
};
// ĐẢM BẢO ĐƯỜNG DẪN NÀY CHÍNH XÁC
// GIẢ SỬ ĐƯỜNG DẪN NÀY ĐÃ ĐƯỢC THÊM VÀO THƯ MỤC ASSETS
const HOSPITAL_LOGO_SOURCE = require('../../../assets/logo.png'); 
const LOGO_HEIGHT = 40; 


// --- CONSTANTS VÀ TYPES CHO BANNER (Được sao chép từ HomeScreen.tsx) ---
interface Banner { id: string; image: any; title: string; }
const BANNERS: Banner[] = [
    // Nội dung banner phù hợp hơn với Bác sĩ
    { id: '1', image: require('../../../assets/banner4.png'), title: 'Cập nhật phác đồ điều trị mới nhất từ Bộ Y Tế' },
    { id: '2', image: require('../../../assets/banner5.png'), title: 'Theo dõi chỉ số sức khỏe của bệnh nhân từ xa' },
    { id: '3', image: require('../../../assets/banner6.png'), title: 'Thông báo: Hội thảo y khoa chuyên đề tuần này' },
];

const AUTO_SCROLL_INTERVAL = 4000;
const BANNER_WIDTH = width - 32;
// --- END BANNER CONSTANTS ---


// 1. CHỨC NĂNG CHÍNH (TƯƠNG ĐƯƠNG PRIMARY_ACTIONS của PatientHome) - 3 cột
const PRIMARY_ACTIONS = [
    { key: 'today', title: 'Lịch khám hôm nay', route: 'Today', icon: 'calendar', color: COLORS.primary },
    { key: 'history', title: 'Lịch sử đã khám', route: 'DoctorHistory', icon: 'clock', color: COLORS.success },
];

// 2. TIỆN ÍCH (TƯƠNG ĐƯƠNG UTILITY_ACTIONS của PatientHome) - 1 cột danh sách
const UTILITY_ACTIONS = [
    { key: 'profile', title: 'Hồ sơ cá nhân', route: 'Profile', icon: 'user', color: COLORS.iconDefault },
    { key: 'settings', title: 'Cài đặt', route: 'Settings', icon: 'settings', color: COLORS.iconDefault },
];


export default function DoctorHome() {
  const navigation = useNavigation<any>();
  const { user } = useAuth() as any;
  const [name, setName] = useState('Bác sĩ');
  const [photoURL, setPhotoURL] = useState<string | null>(null);

  // --- START BANNER LOGIC (Được sao chép từ HomeScreen.tsx) ---
  const flatListRef = useRef<FlatList<Banner> | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // HIỆU ỨNG TỰ ĐỘNG CUỘN
  useEffect(() => {
      const interval = setInterval(() => {
          setActiveIndex(prevIndex => {
              const nextIndex = (prevIndex + 1) % BANNERS.length;
              
              if (flatListRef.current) {
                  flatListRef.current.scrollToIndex({
                      index: nextIndex,
                      animated: true,
                  });
              }
              return nextIndex;
          });
      }, AUTO_SCROLL_INTERVAL);

      return () => clearInterval(interval);
  }, [BANNERS.length]); 

  // THEO DÕI INDEX KHI NGƯỜI DÙNG KÉO
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
      if (viewableItems.length > 0) {
          const index = viewableItems[0].index;
          if (index !== undefined && index !== activeIndex) {
              setActiveIndex(index);
          }
      }
  }).current;

  const viewabilityConfig = {
      itemVisiblePercentThreshold: 50, 
  };
  // --- END BANNER LOGIC ---

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) return;
      try {
        const doc = await db.collection('users').doc(user.uid).get();
        const data = doc.data() as any;
        if (mounted) {
          setName(data?.name || 'Bác sĩ');
          setPhotoURL(data?.photoURL || null);
        }
      } catch (err) {
        console.warn('load doctor profile', err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  // CHÀO BUỔI SÁNG/CHIỀU/TỐI (Từ HomeScreen)
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 11) return 'Chào buổi sáng';
    if (h < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  }, []);

  // HÀM CHUYỂN TRANG (Từ HomeScreen)
  function open(item: any) {
        if (item.route) navigation.navigate(item.route);
        else safeAlert('Chưa có', 'Chức năng này sẽ sớm có mặt!');
    }


  // RENDER ITEM CHO PRIMARY ACTIONS (Từ HomeScreen)
  const renderPrimaryItem = ({ item }: { item: typeof PRIMARY_ACTIONS[0] }) => (
    <TouchableOpacity
        style={styles.primaryCard}
        onPress={() => open(item)}
        activeOpacity={0.8}
    >
        <View style={[styles.primaryIconCircle, { backgroundColor: item.color + '15' }]}>
            {/* KHẮC PHỤC LỖI GẠCH ĐỎ: Ép kiểu icon name thành any */}
            <Icon name={item.icon as any} size={28} color={item.color} /> 
        </View>
        <Text style={styles.primaryCardTitle}>{item.title}</Text>
    </TouchableOpacity>
  );

  // RENDER ITEM CHO UTILITY ACTIONS (Từ HomeScreen)
  const renderUtilityItem = ({ item }: { item: typeof UTILITY_ACTIONS[0] }) => (
    <TouchableOpacity
        style={styles.utilityCard}
        onPress={() => open(item)}
        activeOpacity={0.85}
    >
        <View style={[styles.utilityIconCircle, { backgroundColor: item.color + '10' }]}>
            {/* KHẮC PHỤC LỖI GẠCH ĐỎ: Ép kiểu icon name thành any */}
            <Icon name={item.icon as any} size={22} color={item.color} /> 
        </View>
        <Text style={styles.utilityCardTitle}>{item.title}</Text>
        {/* Sử dụng icon 'chevron-right' của Feather */}
        <Icon name="chevron-right" size={20} color={COLORS.subtitle} />
    </TouchableOpacity>
  );

  // RENDER ITEM CHO BANNER (Được sao chép từ HomeScreen.tsx)
  const renderBannerItem: ListRenderItem<Banner> = ({ item, index }) => (
    <View 
        style={[
            styles.banner, 
            { width: BANNER_WIDTH, marginRight: index === BANNERS.length - 1 ? 0 : 16 }
        ]}
    > 
        <Image source={item.image} style={styles.bannerImage} resizeMode="cover" />
        {index === 1 && ( 
            <Image 
                source={HOSPITAL_LOGO_SOURCE} 
                style={styles.bannerLogoOverlay} 
                resizeMode="contain" 
            />
        )}
        <View style={styles.bannerOverlay} />
        <Text style={styles.bannerTitle}>{item.title}</Text>
    </View>
);


  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* HEADER CỐ ĐỊNH (Sử dụng cấu trúc TOP BAR từ HomeScreen) */}
      <View style={styles.topBar}>
        
        {/* KHU VỰC THÔNG TIN (LOGO + TÊN/LỜI CHÀO) */}
        <View style={styles.infoContainer}>
          <View style={styles.logoContainer}> 
            <Image
              source={HOSPITAL_LOGO_SOURCE}
              style={styles.topBarLogo}
              resizeMode="contain"
            />
          </View>
          <View style={styles.greetingTextContainer}>
            <Text style={styles.topBarGreeting}>{greeting},</Text>
            <Text style={styles.topBarName} numberOfLines={1}>{name}</Text>
          </View>
        </View>
        
        {/* KHU VỰC AVATAR */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.8}
        >
          {/* Giữ lại logic hiển thị avatar của bác sĩ */}
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Icon name="user" size={24} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Body - Dùng FlatList bọc nội dung để cuộn được */}
      <FlatList
          data={[{ key: 'main_content' }]} 
          keyExtractor={(item) => item.key}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{paddingBottom: 20}}
          renderItem={() => (
            <View style={styles.contentContainer}>
                
                {/* CHỨC NĂNG CHÍNH */}
                <Text style={styles.sectionTitle}>Chức năng chính</Text>
                <FlatList
                    data={PRIMARY_ACTIONS}
                    keyExtractor={i => i.key}
                    numColumns={3}
                    columnWrapperStyle={styles.primaryRow}
                    contentContainerStyle={styles.primaryListContent}
                    renderItem={renderPrimaryItem}
                    scrollEnabled={false}
                />
                {/* BANNER SLIDER */}
                <FlatList
                    ref={flatListRef}
                    data={BANNERS}
                    keyExtractor={i => i.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    pagingEnabled={false} 
                    decelerationRate="fast"
                    snapToInterval={BANNER_WIDTH + 16} 
                    snapToAlignment="start"
                    contentContainerStyle={styles.bannerListContent}
                    renderItem={renderBannerItem}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig}
                />

                {/* PAGE DOTS (Được thêm vào) */}
                <View style={styles.dotContainer}>
                    {BANNERS.map((_, i) => (
                        <View 
                            key={i} 
                            style={[
                                styles.dot, 
                                i === activeIndex ? styles.dotActive : styles.dotInactive
                            ]} 
                        />
                    ))}
                </View>


                {/* TIỆN ÍCH */}
                <Text style={styles.sectionTitle}>Tiện ích & Hồ sơ</Text>
                <FlatList
                    data={UTILITY_ACTIONS}
                    keyExtractor={i => i.key}
                    numColumns={1}
                    contentContainerStyle={styles.utilityListContent}
                    renderItem={renderUtilityItem}
                    scrollEnabled={false}
                />
            </View>
        )}
    />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    paddingHorizontal: 16,
  },
  
  /** ====== TOP BAR (HEADER) - Đồng bộ với HomeScreen.tsx ====== */
    topBar: {
        paddingTop: 10,
        paddingHorizontal: 16,
        paddingBottom: 15,
        backgroundColor: COLORS.primary, 
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        // Bỏ borderBottomLeftRadius/RightRadius để đồng bộ hoàn toàn với HomeScreen (đã bỏ trong PatientHome)
        ...Platform.select({
            ios: {
                shadowColor: COLORS.shadowColor,
                shadowOffset: { width: 0, height: 1 }, // Giảm shadow để đồng bộ SHADOW_STYLE
                shadowOpacity: 0.08,
                shadowRadius: 5,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    infoContainer: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        flex: 1, 
        marginRight: 10,
    },
    logoContainer: {
        backgroundColor: COLORS.cardBackground, 
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 5,
        marginRight: 12, 
        alignSelf: 'center', 
    },
    greetingTextContainer: {
        flexDirection: 'column',
        justifyContent: 'center', 
    },
    topBarLogo: {
        width: LOGO_HEIGHT * 1.5, 
        height: LOGO_HEIGHT * 1.5, 
        resizeMode: 'contain',
        tintColor: COLORS.primary, 
    },
    topBarGreeting: { color: '#EAF8FF', fontSize: 13, fontWeight: '500' },
    topBarName: { 
        color: COLORS.cardBackground, 
        fontSize: 18, 
        fontWeight: '700', 
        maxWidth: width * 0.45, 
    },
  
  // AVATAR
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E0F2FE',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3AB0E2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E0F2FE',
  },
  
  /** ====== PRIMARY ACTIONS (3 CỘT) - Đồng bộ với HomeScreen.tsx ====== */
  sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: COLORS.textDark,
      paddingHorizontal: 0, // Đã có paddingX trong contentContainer
      marginTop: 20,
      marginBottom: 10,
  },
  primaryListContent: { paddingHorizontal: -6, }, // Đã có paddingX trong contentContainer, điều chỉnh margin/padding
  primaryRow: { justifyContent: 'space-between', marginBottom: 12, },
  primaryCard: {
      flex: 1,
      marginHorizontal: 6,
      backgroundColor: COLORS.cardBackground,
      borderRadius: 16, 
      padding: 10,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 110,
      ...SHADOW_STYLE, 
  },
  primaryIconCircle: {
      width: 50, 
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 6, 
  },
  primaryCardTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textDark, textAlign: 'center' },


  /** ====== SUMMARY CARD (Thay thế Fast Book Card) ====== */
    summaryCard: {
        marginVertical: 10,
        ...SHADOW_STYLE, 
        backgroundColor: COLORS.cardBackground,
        borderRadius: 16,
        padding: 18,
        borderLeftWidth: 5,
        borderLeftColor: COLORS.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 15,
    },
    summaryContent: { flex: 1, },
    summaryTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textDark, marginBottom: 4, },
    summarySubtitle: { fontSize: 13, color: COLORS.subtitle, },
    summaryButton: {
        padding: 8,
        backgroundColor: COLORS.primary + '10',
        borderRadius: 8,
    },

  /** ====== BANNER SLIDER - Copy từ HomeScreen.tsx ====== */
  bannerListContent: { paddingHorizontal: 0, paddingRight: 0, marginTop: 10, paddingLeft: 16, }, 
  banner: {
      borderRadius: 16,
      overflow: 'hidden',
      height: 180,
  },
  bannerImage: { width: '100%', height: '100%' },
  bannerOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.35)',
  },
  bannerTitle: {
      position: 'absolute',
      bottom: 16,
      left: 16,
      color: '#fff',
      fontSize: 17,
      fontWeight: '700',
      width: '80%',
  },
  bannerLogoOverlay: {
      position: 'absolute',
      top: 10,
      left: 10,
      width: 80, 
      height: 40,
      resizeMode: 'contain',
  },

  // PAGE DOTS 
  dotContainer: { flexDirection: 'row', justifyContent: 'center', marginVertical: 10, }, 
  dot: { height: 8, borderRadius: 4, marginHorizontal: 4, },
  dotActive: { width: 24, backgroundColor: COLORS.primary, },
  dotInactive: { width: 8, backgroundColor: COLORS.subtitle + '50', },


  /** ====== UTILITY ACTIONS (1 CỘT) - Đồng bộ với HomeScreen.tsx ====== */
  utilityListContent: { paddingHorizontal: 0, }, // Đã có paddingX trong contentContainer
  utilityCard: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8, 
      ...SHADOW_STYLE, 
  },
  utilityIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 10, 
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 15,
  },
  utilityCardTitle: { flex: 1, fontSize: 16, fontWeight: '500', color: COLORS.textDark },
});