import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import Icon from '@react-native-vector-icons/feather';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import db from '@/services/firestore';

const { width } = Dimensions.get('window');

// Màu sắc đồng bộ với AdminDashboard
const COLORS = {
  primary: '#2596be',
  background: '#f8f9fa',
  cardBackground: '#ffffff',
  textDark: '#1c1c1c',
  textLight: '#4a4a4a',
  subtitle: '#777777',
  shadowColor: '#000000',
};

const ACTIONS = [
  {
    key: 'today',
    title: 'Lịch khám hôm nay',
    subtitle: 'Danh sách bệnh nhân hôm nay',
    route: 'Today',
    icon: 'calendar',
    color: '#2196f3',
  },
  {
    key: 'history',
    title: 'Lịch sử đã khám',
    subtitle: 'Xem lại các lịch hẹn cũ',
    route: 'DoctorHistory',
    icon: 'clock',
    color: '#4caf50',
  },
  {
    key: 'profile',
    title: 'Hồ sơ cá nhân',
    subtitle: 'Cập nhật thông tin bác sĩ',
    route: 'Profile',
    icon: 'user',
    color: '#ff9800',
  },
  {
    key: 'settings',
    title: 'Cài đặt',
    subtitle: 'Thiết lập tài khoản',
    route: 'Settings',
    icon: 'settings',
    color: '#9c27b0',
  },
];

export default function DoctorHome() {
  const navigation = useNavigation<any>();
  const { user } = useAuth() as any;
  const [name, setName] = useState('Bác sĩ');
  const [photoURL, setPhotoURL] = useState<string | null>(null);

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

  const renderItem = ({ item }: { item: typeof ACTIONS[0] }) => (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: item.color || COLORS.primary }]}
      activeOpacity={0.8}
      onPress={() => navigation.navigate(item.route)}
    >
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: item.color ? `${item.color}15` : `${COLORS.primary}15` },
        ]}
      >
        <Icon name={item.icon as any} size={26} color={item.color || COLORS.primary} />
      </View>
      <View style={styles.cardTextContainer}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        {item.subtitle ? (
          <Text style={styles.cardSubtitle} numberOfLines={2}>
            {item.subtitle}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}> {/* New View for logo and text */}
          <Image
            source={require('../../../assets/logo.png')} // Update this path to your logo
            style={styles.logo}
            
          />
          <View style={styles.headerTextContainer}>
            <Text style={styles.greeting}>Xin chào 👋</Text>
            <Text style={styles.name}>{name}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.8}
        >
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Icon name="user" size={28} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Body */}
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Tác vụ nhanh</Text>
        <FlatList
          data={ACTIONS}
          keyExtractor={(i) => i.key}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  listContent: {
    paddingBottom: 24,
    paddingTop: 10,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  header: {
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  headerLeft: { // New style for logo and text container
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: { // New style for the logo
    width: 90, // Adjust size as needed
    height: 90, // Adjust size as needed
    marginRight: 10,
    resizeMode: 'contain',
    tintColor: COLORS.cardBackground,
  },
  headerTextContainer: {
    flexDirection: 'column',
  },
  greeting: {
    color: '#E0F2FE',
    fontSize: 16,
  },
  name: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 4,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#E0F2FE',
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3AB0E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 15,
    padding: 16,
    flex: 1,
    marginHorizontal: 6,
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
    minHeight: 140,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderLeftWidth: 6,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTextContainer: {},
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: COLORS.subtitle,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 16,
  },
});