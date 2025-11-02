import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import safeAlert from '@/utils/safeAlert';

// Simplified country code button component
function CountryCode({ onPress }: { onPress?: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.codeBox}>
      <Text style={{ fontWeight: '700' }}>(+84)</Text>
    </TouchableOpacity>
  );
}

export default function LoginScreen({ navigation }: any) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const { signInWithPhoneNumber } = useAuth();

  async function onSend() {
    setLoading(true);
    try {
      // Normalize phone to E.164. App uses (+84) as country code in UI.
      let raw = (phone || '').toString().trim();
      // remove spaces
      raw = raw.replace(/\s+/g, '');
      // remove leading 0 (e.g. 09xxxx -> 9xxxx) when not already in E.164
      if (!raw.startsWith('+')) {
        if (raw.startsWith('0')) raw = raw.slice(1);
        raw = `+84${raw}`;
      }

      await signInWithPhoneNumber(raw);
      navigation.navigate('PhoneOtp');
    } catch (err) {
      console.warn('send otp failed', err);
      safeAlert('Lỗi gửi mã', (err as any)?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titleLarge}>
        Chào mừng bạn đã đến và{`\n`}bắt đầu thôi nào!
      </Text>

      <View style={styles.inputRow}>
        <CountryCode />
        <View style={{ flex: 1 }}>
          <Input
            placeholder="Nhập số điện thoại"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>
      </View>

      <View style={styles.consentRow}>
        <TouchableOpacity
          style={[styles.checkbox, consentChecked && styles.checkboxChecked]}
          onPress={() => setConsentChecked(v => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: consentChecked }}
        >
          {consentChecked ? <Text style={styles.checkMark}>✓</Text> : null}
        </TouchableOpacity>

        <Text style={styles.note}>
          Bằng cách nhấn nút Tiếp tục, bạn đã đồng ý với các Điều kiện và Điều
          khoản
        </Text>
      </View>

      <View style={{ flex: 1 }} />

      <Button
        title="Tiếp tục"
        onPress={onSend}
        disabled={loading || !consentChecked}
        style={[
          styles.continue,
          (!consentChecked || loading) && styles.continueDisabled,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  titleLarge: { fontSize: 22, fontWeight: '800', marginTop: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 24 },
  codeBox: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#35caefff',
    marginRight: 12,
  },
  input: { flex: 1 },
  consentRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '##35caefff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#FFF',
  },
  checkboxChecked: { backgroundColor: '#35caefff', borderColor: '#35caefff' },
  checkMark: { color: '#fff', fontWeight: '700' },
  note: { flex: 1, color: '#777', fontSize: 12 },
  continue: {
    borderRadius: 24,
    paddingVertical: 14,
    backgroundColor: '#35caefff',
  },
  continueDisabled: { opacity: 0.6 },
});
