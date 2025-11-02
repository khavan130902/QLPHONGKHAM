import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import db from '@/services/firestore';

export default function PhoneOtpScreen({ navigation, route }: any) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { confirmCode } = useAuth();
  const { registering, profile } = route.params || {};

  async function onConfirm() {
    setLoading(true);
    try {
      const credential = await confirmCode(code);
      // Nếu là flow đăng ký, tạo hồ sơ user trong Firestore
      if (registering && credential && credential.user) {
        const uid = credential.user.uid;
        await db
          .collection('users')
          .doc(uid)
          .set({
            uid,
            name: profile?.name || null,
            phoneNumber: credential.user.phoneNumber || null,
            role: 'patient',
            createdAt: new Date().toISOString(),
          });
      }
      // Điều hướng vào app chính (Patient stack)
      navigation.reset({ index: 0, routes: [{ name: 'Patient' }] });
    } catch (err) {
      console.warn('confirm failed', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titleLarge}>
        Nhập mã xác thực đã được gửi{`\n`}đến số điện thoại
      </Text>

      <TouchableOpacity style={styles.resend}>
        <Text style={{ color: '#7A5CC6' }}>Gửi lại</Text>
      </TouchableOpacity>

      <View style={styles.codeRow}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={styles.codeBox} />
        ))}
      </View>

      <View style={{ flex: 1 }} />

      <Button
        title="Tiếp tục"
        onPress={onConfirm}
        disabled={loading}
        style={styles.continue}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  titleLarge: { fontSize: 20, fontWeight: '800', marginTop: 12 },
  resend: { marginTop: 12 },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  codeBox: {
    width: 40,
    height: 40,
    borderBottomWidth: 2,
    borderColor: '#D9B8FF',
  },
  continue: {
    borderRadius: 24,
    paddingVertical: 14,
    backgroundColor: '#E0B8FF',
  },
});
