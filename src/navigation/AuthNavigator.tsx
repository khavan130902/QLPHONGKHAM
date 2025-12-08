import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LandingScreen from '@/screens/auth/LandingScreen';
import LoginScreen from '@/screens/auth/LoginScreen';
import AccountLoginScreen from '@/screens/auth/AccountLoginScreen';
import AccountRegisterScreen from '@/screens/auth/AccountRegisterScreen';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Landing"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: 'Đăng nhập' }}
      />
      <Stack.Screen
        name="AccountLogin"
        component={AccountLoginScreen}
        options={{ title: 'Đăng nhập tài khoản' }}
      />
      <Stack.Screen
        name="AccountRegister"
        component={AccountRegisterScreen}
        options={{ title: 'Đăng ký tài khoản' }}
      />
    </Stack.Navigator>
  );
}
