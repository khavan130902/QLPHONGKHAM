import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthNavigator from '@/navigation/AuthNavigator';
import PatientNavigator from '@/navigation/PatientNavigator';
import DoctorNavigator from '@/navigation/DoctorNavigator';
import AdminNavigator from '@/navigation/AdminNavigator';
import { useAuth } from '@/context/AuthContext';
import db from '@/services/firestore';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user, loading } = useAuth();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadRole() {
      if (!user) return setRole(null);
      try {
        const doc = await db.collection('users').doc(user.uid).get();
        const data = doc.data();
        if (mounted) setRole((data && (data as any).role) || 'patient');
      } catch (err) {
        console.warn('failed to load user role', err);
        if (mounted) setRole('patient');
      }
    }
    loadRole();
    return () => {
      mounted = false;
    };
  }, [user]);
  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );

  return (
    <NavigationContainer>
      {user ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {role === 'admin' ? (
            <Stack.Screen name="Admin" component={AdminNavigator} />
          ) : role === 'doctor' ? (
            <Stack.Screen name="Doctor" component={DoctorNavigator} />
          ) : (
            <Stack.Screen name="Patient" component={PatientNavigator} />
          )}
        </Stack.Navigator>
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Auth" component={AuthNavigator} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}
