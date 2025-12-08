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
    ListRenderItem,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import db from '@/services/firestore';
import Avatar from '@/components/Avatar';
import safeAlert from '@/utils/safeAlert';
import Icon from '@react-native-vector-icons/feather';


// KHAI BÁO HẰNG SỐ CƠ BẢN
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
const { width } = Dimensions.get('window');

// ĐẢM BẢO ĐƯỜNG DẪN NÀY CHÍNH XÁC
const HOSPITAL_LOGO_SOURCE = require('../../../assets/logo.png'); 
const LOGO_HEIGHT = 40; 

interface Banner { id: string; image: any; title: string; }
const BANNERS: Banner[] = [
    { id: '1', image: require('../../../assets/banner4.png'), title: 'Khám sức khỏe định kỳ, bảo vệ bạn và gia đình' },
    { id: '2', image: require('../../../assets/banner5.png'), title: 'Đặt lịch khám nhanh chóng, không cần chờ đợi' },
    { id: '3', image: require('../../../assets/banner6.png'), title: 'Theo dõi hồ sơ bệnh án của bạn mọi lúc mọi nơi' },
];

// ✅ CẬP NHẬT ICON DÙNG TÊN CỦA FEATHER
const PRIMARY_ACTIONS = [
    { key: 'book', title: 'Đặt lịch khám', route: 'Book', icon: 'calendar', color: COLORS.primary },
    { key: 'appointments', title: 'Lịch hẹn', route: 'Appointments', icon: 'clock', color: COLORS.secondary }, // Hoặc 'bell'
    { key: 'medical_history', title: 'Hồ sơ bệnh án', route: 'MedicalHistory', icon: 'file-text', color: COLORS.success },
];

const UTILITY_ACTIONS = [
    { key: 'list_doctor', title: 'Khoa & Bác sĩ', route: 'ListDoctor', icon: 'user-plus', color: COLORS.info }, // Hoặc 'heart'
    { key: 'invoices', title: 'Hóa đơn', route: 'Invoices', icon: 'credit-card', color: COLORS.danger }, // Hoặc 'dollar-sign'
    { key: 'profile', title: 'Hồ sơ cá nhân', route: 'Profile', icon: 'user', color: COLORS.iconDefault },
    { key: 'settings', title: 'Cài đặt', route: 'Settings', icon: 'settings', color: COLORS.iconDefault },
];

const AUTO_SCROLL_INTERVAL = 3000;

const SHADOW_STYLE = {
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, 
    shadowRadius: 5,
    elevation: 2,
};

export default function PatientHome() {
    const navigation = useNavigation();
    const { user } = useAuth() as any;
    const [profile, setProfile] = useState<any>(null);
    const fade = useRef(new Animated.Value(0)).current;
    
    const flatListRef = useRef<FlatList<Banner> | null>(null); 
    const [activeIndex, setActiveIndex] = useState(0);

    const BANNER_WIDTH = width - 32;

    // HIỆU ỨNG TỰ ĐỘNG CUỘN (Giữ nguyên)
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

    // THEO DÕI INDEX KHI NGƯỜI DÙNG KÉO (Giữ nguyên)
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

    // FADE IN EFFECT (Giữ nguyên)
    useEffect(() => {
        Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, [fade]);

    // FETCH PROFILE (Giữ nguyên)
    useEffect(() => {
        let mounted = true;
        (async () => {
            if (!user) return;
            try {
                const doc = await db.collection('users').doc(user.uid).get();
                mounted && setProfile(doc.data() || null);
            } catch (e) {
                console.warn('Lỗi fetch profile:', e);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [user]);

    // CHÀO BUỔI SÁNG/CHIỀU/TỐI (Giữ nguyên)
    const greeting = useMemo(() => {
        const h = new Date().getHours();
        if (h < 11) return 'Chào buổi sáng';
        if (h < 18) return 'Chào buổi chiều';
        return 'Chào buổi tối';
    }, []);

    // HÀM CHUYỂN TRANG (Giữ nguyên)
    function open(item: any) {
        if (item.route) (navigation as any).navigate(item.route);
        else safeAlert('Chưa có', 'Chức năng này sẽ sớm có mặt!');
    }

    // RENDER ITEM FUNCTIONS (Giữ nguyên cấu trúc, Icon component được dùng lại)
    const renderPrimaryItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.primaryCard}
            onPress={() => open(item)}
            activeOpacity={0.8}
        >
            <View style={[styles.primaryIconCircle, { backgroundColor: item.color + '15' }]}>
                <Icon name={item.icon} size={28} color={item.color} /> 
            </View>
            <Text style={styles.primaryCardTitle}>{item.title}</Text>
        </TouchableOpacity>
    );

    const renderUtilityItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.utilityCard}
            onPress={() => open(item)}
            activeOpacity={0.85}
        >
            <View style={[styles.utilityIconCircle, { backgroundColor: item.color + '10' }]}>
                <Icon name={item.icon} size={22} color={item.color} /> 
            </View>
            <Text style={styles.utilityCardTitle}>{item.title}</Text>
            {/* Sử dụng icon 'chevron-right' của Feather */}
            <Icon name="chevron-right" size={20} color={COLORS.subtitle} />
        </TouchableOpacity>
    );

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
            <Animated.View style={[styles.container, { opacity: fade }]}>
                
                {/* HEADER CỐ ĐỊNH */}
                <View style={styles.topBar}>
                    
                    {/* KHU VỰC THÔNG TIN (LOGO + TÊN/LỜI CHÀO) */}
                    <View style={styles.infoContainer}>
                        
                        {/* 1. CONTAINER NỀN TRẮNG cho Logo */}
                        <View style={styles.logoContainer}> 
                            <Image
                                source={HOSPITAL_LOGO_SOURCE}
                                style={styles.topBarLogo}
                                resizeMode="contain"
                            />
                        </View>
                        
                        {/* 2. CHÀO HỎI VÀ TÊN */}
                        <View style={styles.greetingTextContainer}>
                            <Text style={styles.topBarGreeting}>{greeting},</Text>
                            <Text style={styles.topBarName} numberOfLines={1}>{profile?.name || 'Bạn'}</Text>
                        </View>
                    </View>
                    
                    {/* KHU VỰC AVATAR */}
                    <View style={styles.topBarRight}>
                        <Pressable onPress={() => (navigation as any).navigate('Profile')}>
                            <Avatar uri={profile?.photoURL} name={profile?.name} size={40} />
                        </Pressable>
                    </View>
                </View>

                <FlatList
                    data={[{ key: 'main_content' }]} 
                    keyExtractor={(item) => item.key}
                    showsVerticalScrollIndicator={false}
                    renderItem={() => (
                        <View style={{paddingBottom: 20}}> 
                            {/* THẺ ĐẶT LỊCH NHANH */}
                            <View style={styles.fastBookCard}>
                                <View style={styles.fastBookContent}>
                                    <Text style={styles.fastBookTitle}>Bạn cần khám gì?</Text>
                                    <Text style={styles.fastBookSubtitle}>Đặt lịch khám chỉ với vài bước đơn giản, không cần chờ đợi.</Text>
                                </View>
                                <TouchableOpacity 
                                    style={styles.fastBookButton} 
                                    onPress={() => open(PRIMARY_ACTIONS[0])} 
                                >
                                    <Text style={styles.fastBookButtonText}>Đặt lịch ngay</Text>
                                    {/* Sử dụng icon 'arrow-right' của Feather */}
                                    <Icon name="arrow-right" size={20} color="#fff" style={{marginLeft: 5}}/>
                                </TouchableOpacity>
                            </View>

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

                            {/* PAGE DOTS */}
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
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: COLORS.background },
    container: { flex: 1 },
    
    // TOP BAR
    topBar: {
        paddingTop: 10,
        paddingHorizontal: 16,
        paddingBottom: 15,
        backgroundColor: COLORS.primary, 
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    
    // INFO CONTAINER
    infoContainer: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        flex: 1, 
        marginRight: 10,
    },
    
    // CONTAINER CHO LOGO
    logoContainer: {
        backgroundColor: COLORS.cardBackground, 
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 5,
        marginRight: 12, 
        alignSelf: 'center', 
    },
    
    // CONTAINER CHO CHỮ (LỜI CHÀO + TÊN)
    greetingTextContainer: {
        flexDirection: 'column',
        justifyContent: 'center', 
    },

    topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    
    // STYLE CHO LOGO BÊN TRONG CONTAINER
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

    // FAST BOOKING CARD
    fastBookCard: {
        marginHorizontal: 16,
        marginTop: 20,
        marginBottom: 10,
        ...SHADOW_STYLE, 
        backgroundColor: COLORS.cardBackground,
        borderRadius: 16,
        padding: 18,
        borderLeftWidth: 5,
        borderLeftColor: COLORS.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    fastBookContent: { flex: 1, marginRight: 10, },
    fastBookTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textDark, marginBottom: 4, },
    fastBookSubtitle: { fontSize: 13, color: COLORS.subtitle, },
    fastBookButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 15,
        backgroundColor: COLORS.primary,
        borderRadius: 10,
    },
    fastBookButtonText: { color: '#fff', fontWeight: '600', fontSize: 14, },


    // PRIMARY ACTIONS
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textDark,
        paddingHorizontal: 16,
        marginTop: 20,
        marginBottom: 10,
    },
    primaryListContent: { paddingHorizontal: 10, },
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


    // BANNER 
    bannerListContent: { paddingHorizontal: 16, paddingRight: 0, }, 
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

    // UTILITY ACTIONS
    utilityListContent: { paddingHorizontal: 16, },
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