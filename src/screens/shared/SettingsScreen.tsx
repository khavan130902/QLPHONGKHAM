import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import Button from '@/components/Button';
import safeAlert from '@/utils/safeAlert';
import { useAuth } from '@/context/AuthContext';
import { useNavigation } from '@react-navigation/native';

export default function SettingsScreen() {
  const { signOut } = useAuth() as any;
  const navigation = useNavigation();

  async function handleSignOut() {
    Alert.alert('Xác nhận', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            safeAlert('Đã đăng xuất', 'Bạn đã đăng xuất thành công');
          } catch (err) {
            console.warn('signOut failed', err);
            safeAlert('Lỗi', 'Không thể đăng xuất');
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cài đặt</Text>

      <View style={{ marginTop: 12 }}>
        <Button title="Đăng xuất" onPress={handleSignOut} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
});
