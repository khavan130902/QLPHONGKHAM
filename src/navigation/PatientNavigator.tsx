import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PatientHome from '@/screens/patient/HomeScreen';
import BookScreen from '@/screens/patient/BookScreen';
import BookingConfirm from '@/screens/patient/BookingConfirm';
import ProfileScreen from '@/screens/shared/ProfileScreen';
import SettingsScreen from '@/screens/shared/SettingsScreen';
import AppointmentsScreen from '@/screens/patient/AppointmentsScreen';
import AppointmentDetail from '@/screens/patient/AppointmentDetail';
import MedicalHistoryScreen from '@/screens/patient/MedicalHistoryScreen';
import MedicalRecordDetail from '@/screens/patient/MedicalRecordDetail';
import InvoicesScreen from '@/screens/patient/InvoicesScreen';
import InvoiceDetail from '@/screens/patient/InvoiceDetail';
import ListDoctor from '@/screens/patient/ListDoctor';

const Stack = createNativeStackNavigator();

export default function PatientNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="PatientHome"
        component={PatientHome}
        options={{ title: 'Bệnh nhân',
        headerStyle: { backgroundColor: '#2596be' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
         }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Hồ sơ',
        headerStyle: { backgroundColor: '#2596be' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
         }}
      />
      <Stack.Screen
        name="Appointments"
        component={AppointmentsScreen}
        options={{ title: 'Lịch đã đặt',
        headerStyle: { backgroundColor: '#2596be' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
         }}
      />
      <Stack.Screen
        name="AppointmentDetail"
        component={AppointmentDetail}
        options={{ title: 'Chi tiết lịch đã đặt',
        headerStyle: { backgroundColor: '#2596be' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
         }}
      />
      <Stack.Screen
        name="ListDoctor"
        component={ListDoctor}
        options={{ title: 'Danh sách khoa và bác sĩ',
        headerStyle: { backgroundColor: '#2596be' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
         }}
      />
      <Stack.Screen
        name="MedicalHistory"
        component={MedicalHistoryScreen}
        options={{ title: 'Hồ sơ bệnh án',
        headerStyle: { backgroundColor: '#2596be' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
         }}
      />
      <Stack.Screen
        name="MedicalRecordDetail"
        component={MedicalRecordDetail}
        options={{ title: 'Chi tiết hồ sơ',
        headerStyle: { backgroundColor: '#2596be' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
         }}
      />
      <Stack.Screen
        name="Invoices"
        component={InvoicesScreen}
        options={{ title: 'Hóa đơn',
        headerStyle: { backgroundColor: '#2596be' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
         }}
      />
      <Stack.Screen
        name="InvoiceDetail"
        component={InvoiceDetail}
        options={{ title: 'Hóa đơn',
        headerStyle: { backgroundColor: '#2596be' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
         }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Cài đặt',
        headerStyle: { backgroundColor: '#2596be' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
         }}
      />
      <Stack.Screen
        name="Book"
        component={BookScreen}
        options={{ title: 'Đặt lịch',
        headerStyle: { backgroundColor: '#2596be' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
         }}
      />
      <Stack.Screen
        name="BookingConfirm"
        component={BookingConfirm}
        options={{ title: 'Xác nhận',
        headerStyle: { backgroundColor: '#2596be' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
         }}
      />
    </Stack.Navigator>
  );
}
