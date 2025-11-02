import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DoctorHome from '@/screens/doctor/DoctorHome';
import TodayScreen from '@/screens/doctor/TodayScreen';
import AppointmentDetail from '@/screens/doctor/AppointmentDetail';
import DoctorHistoryScreen from '@/screens/doctor/DoctorHistoryScreen';
import ProfileScreen from '@/screens/shared/ProfileScreen';
import SettingsScreen from '@/screens/shared/SettingsScreen';

const Stack = createNativeStackNavigator();

export default function DoctorNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Home"
        component={DoctorHome}
        options={{ title: 'Trang quản lý của Bác sĩ' }}
      />
      <Stack.Screen
        name="Today"
        component={TodayScreen}
        options={{ title: 'Lịch khám hôm nay' }}
      />
      <Stack.Screen
        name="AppointmentDetail"
        component={AppointmentDetail}
        options={{ title: 'Chi tiết lịch' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Cài đặt' }}
      />
      <Stack.Screen
        name="DoctorHistory"
        component={DoctorHistoryScreen}
        options={{ title: 'Lịch sử đã khám' }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Hồ sơ' }}
      />
    </Stack.Navigator>
  );
}
