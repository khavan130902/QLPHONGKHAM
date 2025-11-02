import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminDashboard from '@/screens/admin/DashboardScreen';
import TodayAppointmentsScreen from '@/screens/admin/TodayAppointmentsScreen';
import ManageDoctorsScreen from '@/screens/admin/ManageDoctorsScreen';
import ManageShiftsScreen from '@/screens/admin/ManageShiftsScreen';
import ManageServicesScreen from '@/screens/admin/ManageServicesScreen';
import ManageSpecialtiesScreen from '@/screens/admin/ManageSpecialtiesScreen';
import ManageRoomsScreen from '@/screens/admin/ManageRoomsScreen';
import RevenueScreen from '@/screens/admin/RevenueScreen';
import HistoryScreen from '@/screens/admin/HistoryScreen';
import SettingsScreen from '@/screens/shared/SettingsScreen';

const Stack = createNativeStackNavigator();

export default function AdminNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Dashboard"
        component={AdminDashboard}
        options={{ title: 'Quản trị' }}
      />
      <Stack.Screen
        name="Today"
        component={TodayAppointmentsScreen}
        options={{ title: 'Lịch hôm nay' }}
      />
      <Stack.Screen
        name="ManageDoctors"
        component={ManageDoctorsScreen}
        options={{ title: 'Quản lý tài khoản' }}
      />
      <Stack.Screen
        name="ManageShifts"
        component={ManageShiftsScreen}
        options={{ title: 'Quản lý ca' }}
      />
      <Stack.Screen
        name="ManageServices"
        component={ManageServicesScreen}
        options={{ title: 'Dịch vụ' }}
      />
      <Stack.Screen
        name="ManageSpecialties"
        component={ManageSpecialtiesScreen}
        options={{ title: 'Chuyên khoa' }}
      />
      <Stack.Screen
        name="ManageRooms"
        component={ManageRoomsScreen}
        options={{ title: 'Phòng khám' }}
      />
      <Stack.Screen
        name="RevenueDaily"
        component={RevenueScreen}
        options={{ title: 'Doanh thu (ngày)' }}
      />
      <Stack.Screen
        name="History"
        component={HistoryScreen}
        options={{ title: 'Lịch sử' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Cài đặt' }}
      />
    </Stack.Navigator>
  );
}
