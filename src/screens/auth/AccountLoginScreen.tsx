import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import safeAlert from '@/utils/safeAlert';

export default function AccountLoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithEmail } = useAuth();

  async function onLogin() {
    setLoading(true);
    try {
      if (!email || !password) {
        safeAlert('Thông tin thiếu', 'Vui lòng nhập email và mật khẩu');
        return;
      }
      await signInWithEmail?.(email.trim(), password);
      // onAuthStateChanged will update user and redirect via RootNavigator
    } catch (err) {
      console.warn('email login failed', err);
      safeAlert('Đăng nhập thất bại', (err as any)?.message || String(err));
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
        <Text style={styles.headerTitle}>Đăng nhập bằng tài khoản</Text>
      </View>

      <View style={styles.form}>
        <Input placeholder="Email" value={email} onChangeText={setEmail} />
        <Input
          placeholder="Mật khẩu"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          onPress={() => navigation.navigate('AccountRegister')}
        >
          <Text style={styles.link}>Chưa có tài khoản? Đăng ký</Text>
        </TouchableOpacity>
      </View>

      <Button
        title="Đăng nhập"
        onPress={onLogin}
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
  link: { color: '#35caefff', marginTop: 8, fontWeight: '600' },
  bottomButton: {
    position: 'absolute',
    backgroundColor: '#35caefff',
    left: 12,
    right: 12,
    bottom: 50,
    borderRadius: 10,
    paddingVertical: 14,
  },
});
