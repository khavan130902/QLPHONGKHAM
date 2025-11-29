import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// Giả định các component Input và Button đã được import và hoạt động tốt
import Input from '@/components/Input';
import Button from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import safeAlert from '@/utils/safeAlert';

// --- BẢNG MÀU MỚI (LIGHT THEME) ---
const COLORS = {
  primary: '#2596be',      // Màu xanh chủ đạo
  background: '#f8f9fa',   // Nền tổng thể rất nhạt
  cardBackground: '#ffffff', // Nền card trắng
  textDark: '#1c1c1c',     // Chữ đen chính
  textLight: '#4a4a4a',    // Chữ xám phụ
  subtitle: '#777777',     // Chữ mô tả
  shadowColor: '#000000',
  inputBorder: '#e0e0e0',  // Viền Input
};

// --- SIMPLIFIED COUNTRY CODE COMPONENT ---
function CountryCode({ onPress }: { onPress?: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.codeBox}>
      <Text style={styles.codeBoxText}>(+84)</Text>
    </TouchableOpacity>
  );
}

// --- MAIN COMPONENT ---
export default function LoginScreen({ navigation }: any) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const { signInWithPhoneNumber } = useAuth(); // Giả định hook Auth hoạt động

  async function onSend() {
    setLoading(true);
    try {
      let raw = (phone || '').toString().trim().replace(/\s+/g, '');
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

  const isButtonDisabled = loading || !consentChecked || phone.length < 9; // Thêm điều kiện độ dài SĐT

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* TIÊU ĐỀ */}
        <Text style={styles.titleLarge}>
          Chào mừng bạn đã đến và{`\n`}bắt đầu thôi nào!
        </Text>
        <Text style={styles.subtitleText}>
          Vui lòng nhập số điện thoại để tiếp tục.
        </Text>

        {/* INPUT SỐ ĐIỆN THOẠI */}
        <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Số điện thoại</Text>
            <View style={styles.inputRow}>
              <CountryCode />
              <View style={{ flex: 1 }}>
                {/* Giả định component Input của bạn sẽ được style bên trong */}
                <Input
                  placeholder="Nhập số điện thoại"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  // Bổ sung style để Input tương thích với thiết kế mới
                  style={styles.inputStyle} 
                />
              </View>
            </View>
        </View>


        {/* ĐỒNG Ý VỚI ĐIỀU KHOẢN */}
        <View style={styles.consentRow}>
          <TouchableOpacity
            style={[
              styles.checkbox,
              consentChecked && styles.checkboxChecked,
            ]}
            onPress={() => setConsentChecked(v => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consentChecked }}
          >
            {consentChecked ? <Text style={styles.checkMark}>✓</Text> : null}
          </TouchableOpacity>

          <Text style={styles.note}>
            Bằng cách nhấn nút Tiếp tục, bạn đã đồng ý với các{' '}
            <Text style={styles.linkText}>Điều kiện và Điều khoản</Text>
          </Text>
        </View>

        {/* NÚT TIẾP TỤC */}
        <View style={{ flex: 1 }} />

        <Button
          title={loading ? 'Đang gửi...' : 'Tiếp tục'}
          onPress={onSend}
          disabled={isButtonDisabled}
          style={[
            styles.continue,
            isButtonDisabled && styles.continueDisabled,
          ]}
          textStyle={styles.continueText}
        />
        
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Quay lại màn hình đăng nhập</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  container: { 
    flex: 1, 
    padding: 20, 
    backgroundColor: COLORS.background 
  },
  titleLarge: { 
    fontSize: 26, 
    fontWeight: '800', 
    color: COLORS.textDark,
    marginTop: 20,
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: COLORS.subtitle,
    marginBottom: 30,
  },
  inputContainer: {
    marginTop: 15,
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 8,
  },
  inputRow: { 
    flexDirection: 'row', 
    alignItems: 'center',
  },
  // Giả định style này áp dụng cho component Input
  inputStyle: {
      backgroundColor: COLORS.cardBackground, 
      borderRadius: 12,
      paddingHorizontal: 15,
      height: 55,
      borderColor: COLORS.inputBorder,
      borderWidth: 1,
  },
  codeBox: {
    paddingVertical: 15,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: COLORS.inputBorder, // Dùng màu viền làm nền nhẹ
    marginRight: 12,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70, // Đảm bảo độ rộng
  },
  codeBoxText: { 
    fontWeight: '700', 
    color: COLORS.textDark,
    fontSize: 16,
  },
  
  // --- CHECKBOX & CONSENT ---
  consentRow: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', // Căn chỉnh top cho checkbox
    marginTop: 20, 
    paddingHorizontal: 5,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2, // Viền dày hơn
    borderColor: COLORS.textLight, 
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: COLORS.cardBackground,
    marginTop: 2, // Căn chỉnh cho vị trí text
  },
  checkboxChecked: { 
    backgroundColor: COLORS.primary, 
    borderColor: COLORS.primary 
  },
  checkMark: { 
    color: COLORS.cardBackground, // Chữ trắng
    fontWeight: '900',
    fontSize: 14,
  },
  note: { 
    flex: 1, 
    color: COLORS.subtitle, 
    fontSize: 13,
    lineHeight: 20,
  },
  linkText: {
    color: COLORS.primary, // Màu xanh chủ đạo cho link
    fontWeight: '600',
  },

  // --- BUTTON CONTINUTE ---
  continue: {
    borderRadius: 14, // Góc bo lớn hơn
    paddingVertical: 16,
    backgroundColor: COLORS.primary,
    // Thêm shadow nhẹ
    ...Platform.select({
        ios: {
            shadowColor: COLORS.shadowColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 5,
        },
        android: {
            elevation: 4,
        },
    }),
  },
  continueText: {
    fontWeight: '800', // Chữ đậm hơn
    fontSize: 16,
  },
  continueDisabled: { 
    opacity: 0.5, 
    backgroundColor: COLORS.primary 
  },
  
  // --- BACK BUTTON ---
  backButton: {
    marginTop: 15,
    paddingVertical: 10,
    alignItems: 'center',
  },
  backButtonText: {
    color: COLORS.textLight,
    fontSize: 14,
    fontWeight: '600',
  }
});