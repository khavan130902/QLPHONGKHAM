import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Dimensions,
  StatusBar,
  // Thêm ListRenderItem nếu bạn muốn gán kiểu chính xác
} from 'react-native';
// Đảm bảo bạn đã cài đặt @react-navigation/native và các thư viện liên quan
import { useNavigation } from '@react-navigation/native';

// Màu sắc chủ đạo
const COLORS = {
  primary: '#2596be', // Màu xanh chủ đạo
  background: '#f8f9fa', // Nền tổng thể rất nhạt
  cardBackground: '#ffffff', // Nền card trắng
  textDark: '#1c1c1c',
  textLight: '#4a4a4a',
  subtitle: '#777777',
  shadowColor: '#000000',
};

const { width } = Dimensions.get('window');

// Để tránh lỗi TypeScript, chúng ta sẽ ép kiểu cho navigation (hoặc dùng interface như đã đề xuất trước đó)
export default function AdminDashboard() {
  const navigation = useNavigation<any>(); // Gán kiểu 'any' để tránh lỗi chữ

  // Admin feature list (giữ nguyên data logic)
  const ADMIN_ITEMS = [
    {
      key: 'today',
      title: 'Lịch hôm nay',
      route: 'Today',
      subtitle: 'Quản lý lịch khám hôm nay',
      icon: '📅',
      color: '#f44336', // Đỏ
    },
    {
      key: 'doctors',
      title: 'Quản lý tài khoản',
      route: 'ManageDoctors',
      subtitle: 'Thêm/Sửa/Xóa tài khoản',
      icon: '🧑‍⚕️',
      color: '#2196f3', // Xanh dương
    },
    {
      key: 'shifts',
      title: 'Quản lý ca làm',
      route: 'ManageShifts',
      subtitle: 'Định nghĩa các ca làm việc',
      icon: '⏰',
      color: '#ff9800', // Cam
    },
    {
      key: 'services',
      title: 'Quản lý dịch vụ',
      route: 'ManageServices',
      subtitle: 'Loại dịch vụ khám',
      icon: '💉',
      color: '#4caf50', // Xanh lá
    },
    {
      key: 'specialties',
      title: 'Quản lý chuyên khoa',
      route: 'ManageSpecialties',
      subtitle: 'Danh sách chuyên khoa',
      icon: '⭐',
      color: '#9c27b0', // Tím
    },
    {
      key: 'rooms',
      title: 'Quản lý phòng',
      route: 'ManageRooms',
      subtitle: 'Phòng khám',
      icon: '🏥',
      color: '#00bcd4', // Xanh ngọc
    },
    {
      key: 'revenue_day',
      title: 'Doanh thu',
      route: 'RevenueDaily',
      subtitle: 'Thống kê theo ngày, tuần, tháng, năm',
      icon: '💰',
      color: '#ffeb3b', // Vàng (icon vẫn là emoji)
    },
    {
      key: 'history',
      title: 'Lịch sử',
      route: 'History',
      subtitle: 'Lịch sử đặt / khám',
      icon: '📜',
      color: '#607d8b', // Xám xanh
    },
    {
      key: 'settings',
      title: 'Cài đặt',
      route: 'Settings',
      subtitle: 'Cài đặt tài khoản quản trị',
      icon: '⚙️',
      color: '#795548', // Nâu
    },
  ];

  // Định nghĩa renderItem bên trong component (vì nó sử dụng biến navigation)
  // Đã sửa lỗi chữ bằng cách loại bỏ ép kiểu 'as any' trên renderItem (vì nó không cần)
  // và chỉ giữ lại ép kiểu trên navigation.navigate (vì cần)
  const renderItem = ({ item }: { item: typeof ADMIN_ITEMS[0] }) => (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: item.color || COLORS.primary }]} // Dùng màu riêng cho mỗi card
      // Sử dụng navigation<any> đã gán ở trên
      onPress={() => navigation.navigate(item.route)} 
      activeOpacity={0.8}
    >
      <View style={[styles.iconCircle, { backgroundColor: item.color ? `${item.color}15` : `${COLORS.primary}15` }]}>
        <Text style={styles.cardIcon}>{item.icon}</Text>
      </View>
      <View style={styles.cardTextContainer}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        {item.subtitle ? (
          <Text style={styles.cardSubtitle} numberOfLines={2}>{item.subtitle}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <View style={styles.header}>
        <Image
          source={require('../../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.welcomeText}>Chào mừng trở lại, Admin!👋</Text>
      </View>

      <View style={styles.container}>
        <FlatList
          data={ADMIN_ITEMS}
          keyExtractor={i => i.key}
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
    paddingTop: 10, // Thêm padding trên để tách khỏi header
  },
  // --- Header mới ---
  header: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    backgroundColor: COLORS.primary, // Màu nền đậm
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 10,
    flexDirection: 'row', // Sắp xếp logo và text trên cùng 1 hàng
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    width: width * 0.25, // Nhỏ hơn một chút và nằm ở góc
    height: 90,
    tintColor: COLORS.cardBackground, // Đổi màu logo thành trắng nếu logo là vector/template
    marginRight: 10,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.cardBackground, // Chữ trắng
    flex: 1, // Chiếm phần còn lại
  },
  // --- Grid và Card ---
  row: {
    justifyContent: 'space-between',
    marginBottom: 16, // Tăng khoảng cách giữa các hàng
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 15, // Góc bo tròn hơn
    padding: 16,
    flex: 1,
    marginHorizontal: 6,
    // Shadow đẹp hơn (iOS)
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    // Elevation (Android)
    elevation: 8,
    minHeight: 140, // Tăng chiều cao tối thiểu
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderLeftWidth: 6, // Viền trái dày hơn
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardIcon: {
    fontSize: 24, // Icon lớn hơn
  },
  cardTextContainer: {
    // Để giữ cardTitle và cardSubtitle luôn ở dưới
  },
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
});