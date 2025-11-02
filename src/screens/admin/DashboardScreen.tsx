import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function AdminDashboard() {
  const navigation = useNavigation();

  // Admin feature list (cards shown on dashboard)
  const ADMIN_ITEMS = [
    {
      key: 'today',
      title: 'Lịch hôm nay',
      route: 'Today',
      subtitle: 'Quản lý lịch khám hôm nay',
    },
    {
      key: 'doctors',
      title: 'Quản lý tài khoản',
      route: 'ManageDoctors',
      subtitle: 'Thêm/Sửa/Xóa tài khoản',
    },
    {
      key: 'shifts',
      title: 'Quản lý ca làm',
      route: 'ManageShifts',
      subtitle: 'Định nghĩa các ca làm việc',
    },
    {
      key: 'services',
      title: 'Quản lý dịch vụ',
      route: 'ManageServices',
      subtitle: 'Loại dịch vụ khám',
    },
    {
      key: 'specialties',
      title: 'Quản lý chuyên khoa',
      route: 'ManageSpecialties',
      subtitle: 'Danh sách chuyên khoa',
    },
    {
      key: 'rooms',
      title: 'Quản lý phòng',
      route: 'ManageRooms',
      subtitle: 'Phòng khám',
    },
    {
      key: 'revenue_day',
      title: 'Doanh thu',
      route: 'RevenueDaily',
      subtitle: 'Thống kê theo ngày, tuần, tháng, năm',
    },
    {
      key: 'history',
      title: 'Lịch sử',
      route: 'History',
      subtitle: 'Lịch sử đặt / khám',
    },
    {
      key: 'settings',
      title: 'Cài đặt',
      route: 'Settings',
      subtitle: 'Cài đặt tài khoản quản trị',
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Dashboard</Text>

      {/* Grid of admin features only - management happens in separate screens */}
      <FlatList
        data={ADMIN_ITEMS}
        keyExtractor={i => i.key}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        contentContainerStyle={{ paddingBottom: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => (navigation as any).navigate(item.route)}
            activeOpacity={0.85}
          >
            <Text style={styles.cardTitle}>{item.title}</Text>
            {item.subtitle ? (
              <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
            ) : null}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flex: 1,
    marginHorizontal: 6,
    // subtle shadow (iOS) / elevation (Android)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 72,
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  cardSubtitle: { fontSize: 12, color: '#666' },
});
