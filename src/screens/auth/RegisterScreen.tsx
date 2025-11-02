import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { useAuth } from '@/context/AuthContext';

export default function RegisterScreen({ navigation }: any) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithPhoneNumber } = useAuth();

  async function onRegister() {
    setLoading(true);
    try {
      await signInWithPhoneNumber(phone);
      // Chuyển sang màn OTP kèm thông tin đăng ký
      navigation.navigate('PhoneOtp', { registering: true, profile: { name } });
    } catch (err) {
      console.warn('register failed', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đăng ký tài khoản</Text>
      <Input placeholder="Họ và tên" value={name} onChangeText={setName} />
      <Input
        placeholder="+84 9xxxxxxxx"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      <Button title="Gửi mã OTP" onPress={onRegister} disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
});
