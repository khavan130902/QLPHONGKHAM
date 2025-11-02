import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import safeAlert from '@/utils/safeAlert';

export default function AccountRegisterScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { registerWithEmail } = useAuth();

  async function onRegister() {
    setLoading(true);
    try {
      if (!email || !password) {
        safeAlert('Thông tin thiếu', 'Vui lòng nhập email và mật khẩu');
        return;
      }
      await registerWithEmail?.(email.trim(), password, { name });
      // createUserWithEmailAndPassword signs the user in automatically.
      // Reset navigation into the main app so user starts authenticated.
      safeAlert('Hoàn tất', 'Tài khoản đã được tạo. Đang vào ứng dụng...');
      // Reset navigation after alert replacement
      navigation.reset({ index: 0, routes: [{ name: 'Patient' }] });
    } catch (err) {
      console.warn('register failed', err);
      safeAlert('Đăng ký thất bại', (err as any)?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Image
            source={require('../../../assets/arrow_back.png')}
            style={styles.backIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tạo tài khoản mới</Text>
      </View>

      <View style={styles.form}>
        <Input placeholder="Họ và tên" value={name} onChangeText={setName} />
        <Input placeholder="Email" value={email} onChangeText={setEmail} />
        <Input
          placeholder="Mật khẩu"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      <Button
        title="Đăng ký"
        onPress={onRegister}
        disabled={loading}
        style={styles.bottomButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 12,
  },
  backBtn: { padding: 6 },
  backIcon: {
    width: 24,
    height: 24,
    backgroundColor: '#35caefff',
    borderRadius: 50,
    padding: 14,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', marginLeft: 8 },
  form: { padding: 16, paddingTop: 8 },
  bottomButton: {
    backgroundColor: '#35caefff',
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 50,
    borderRadius: 10,
    paddingVertical: 14,
  },
});
