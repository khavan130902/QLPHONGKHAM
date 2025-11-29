import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DoctorHome from '@/screens/doctor/DoctorHome';
import TodayScreen from '@/screens/doctor/TodayScreen';
import AppointmentDetail from '@/screens/doctor/AppointmentDetail';
import DoctorHistoryScreen from '@/screens/doctor/DoctorHistoryScreen';
import ProfileScreen from '@/screens/shared/ProfileScreen';
import SettingsScreen from '@/screens/shared/SettingsScreen';
import PatientMedicalHistoryScreen from '@/screens/doctor/PatientMedicalHistoryScreen';

const Stack = createNativeStackNavigator();

export default function DoctorNavigator() {
  // Biến headerOptions vẫn được giữ, nhưng không dùng Spread Operator
  // const headerOptions = {
  //   headerStyle: { backgroundColor: '#2596be' },
  //   headerTintColor: '#fff',
  //   headerTitleStyle: { fontWeight: 'bold' },
  // };

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Home"
        component={DoctorHome}
        options={{
          // Thay thế ...headerOptions bằng việc copy toàn bộ thuộc tính
          headerStyle: { backgroundColor: '#2596be' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          title: 'Bác sĩ',
        }}
      />
      <Stack.Screen
        name="Today"
        component={TodayScreen}
        options={{
          headerStyle: { backgroundColor: '#2596be' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          title: 'Lịch khám hôm nay',
        }}
      />
      <Stack.Screen
        name="AppointmentDetail"
        component={AppointmentDetail}
        options={{
          headerStyle: { backgroundColor: '#2596be' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          title: 'Chi tiết lịch',
        }}
      />
      <Stack.Screen
        name="DoctorHistory"
        component={DoctorHistoryScreen}
        options={{
          headerStyle: { backgroundColor: '#2596be' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          title: 'Lịch sử đã khám',
        }}
      />
      
      {/* 🌟 MÀN HÌNH MỚI ĐÃ THÊM 🌟 */}
      <Stack.Screen
        name="PatientMedicalHistory"
        component={PatientMedicalHistoryScreen}
        options={{
          headerStyle: { backgroundColor: '#2596be' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          title: 'Lịch sử khám bệnh của bệnh nhân',
        }}
      />
      
      {/* Các màn hình chung */}
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerStyle: { backgroundColor: '#2596be' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          title: 'Hồ sơ',
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerStyle: { backgroundColor: '#2596be' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          title: 'Cài đặt',
        }}
      />
    </Stack.Navigator>
  );
}