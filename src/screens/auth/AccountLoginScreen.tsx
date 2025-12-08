import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Input from '@/components/Input';
import Button from '@/components/Button';
// Cần đảm bảo AuthContext có hàm sendPasswordResetEmail
import { useAuth } from '@/context/AuthContext'; 
import safeAlert from '@/utils/safeAlert'; 
// Giả định bạn dùng Icon từ thư viện, nếu không có thì bỏ qua dòng import này
import Icon from '@react-native-vector-icons/feather';

// --- BẢNG MÀU MỚI (LIGHT THEME) ---
const COLORS = {
  primary: '#2596be',      // Màu xanh chủ đạo
  background: '#f8f9fa',   // Nền tổng thể rất nhạt
  cardBackground: '#ffffff', // Nền card trắng
  textDark: '#1c1c1c',     // Chữ đen chính
  textLight: '#4a4a4a',    // Chữ xám phụ
  subtitle: '#777777',     // Chữ mô tả
  inputBorder: '#e0e0e0',  // Viền Input
  shadowColor: '#000000',
  success: '#10B981', // Thêm màu xanh lá cho thông báo thành công
};

// --- MAIN COMPONENT ---
export default function AccountLoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  // Lấy hàm signInWithEmail và sendPasswordResetEmail từ useAuth
  const { signInWithEmail, sendPasswordResetEmail } = useAuth(); 

  async function onLogin() {
    if (!email || !password) {
      safeAlert('Thông tin thiếu', 'Vui lòng nhập email và mật khẩu');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmail?.(email.trim(), password);
      // onAuthStateChanged will update user and redirect via RootNavigator
    } catch (err) {
      console.warn('email login failed', err);
      safeAlert('Đăng nhập thất bại', (err as any)?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  /**    * LOGIC XỬ LÝ QUÊN MẬT KHẨU
   */
  async function handleForgotPassword() {
    if (!email.trim()) {
      safeAlert('Thiếu Email', 'Vui lòng nhập địa chỉ Email của bạn để nhận liên kết đặt lại mật khẩu.');
      return;
    }

    if (!sendPasswordResetEmail) {
      safeAlert('Lỗi hệ thống', 'Chức năng đặt lại mật khẩu chưa được thiết lập.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(email.trim());
      Alert.alert(
        'Thành công!',
        `Liên kết đặt lại mật khẩu đã được gửi tới email: ${email.trim()}. Vui lòng kiểm tra hộp thư của bạn.`,
        [{ text: 'Đã hiểu' }]
      );
    } catch (err) {
      console.warn('Forgot password failed', err);
      safeAlert(
        'Lỗi', 
        (err as any)?.message || 'Không thể gửi email đặt lại mật khẩu. Vui lòng kiểm tra lại địa chỉ email.'
      );
    } finally {
      setLoading(false);
    }
  }

  const isButtonDisabled = loading || !email || !password;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <View style={styles.backIconContainer}>
            {/* Giả định icon này là Feather Icon nếu bạn đã cài */}
            {Icon ? (
              <Icon name="arrow-left" size={20} color={COLORS.textDark} />
            ) : (
              <Image
                source={require('../../../assets/arrow_back.png')} 
                style={[styles.backIcon, { tintColor: COLORS.textDark }]}
                resizeMode="contain"
              />
            )}
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đăng nhập bằng tài khoản</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.formTitle}>
            Chào mừng trở lại!
        </Text>
        <Text style={styles.formSubtitle}>
            Đăng nhập vào tài khoản của bạn để tiếp tục.
        </Text>

        <View style={styles.form}>
            {/* INPUT EMAIL */}
            <Text style={styles.inputLabel}>Địa chỉ Email</Text>
            <Input 
                placeholder="Ví dụ: tenban@example.com" 
                value={email} 
                onChangeText={setEmail} 
                keyboardType="email-address"
                style={styles.inputStyle}
                autoCapitalize="none" // Quan trọng cho email
            />
            
            {/* INPUT MẬT KHẨU */}
            <Text style={styles.inputLabel}>Mật khẩu</Text>
            <Input
                placeholder="Nhập mật khẩu của bạn"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.inputStyle}
            />

            {/* QUÊN MẬT KHẨU */}
            <TouchableOpacity 
                style={styles.forgotPasswordBtn}
                onPress={handleForgotPassword} // GỌI HÀM MỚI Ở ĐÂY
                disabled={loading}
            >
                <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
            </TouchableOpacity>
        </View>

        {/* CHƯA CÓ TÀI KHOẢN? ĐĂNG KÝ */}
        <TouchableOpacity
            onPress={() => navigation.navigate('AccountRegister')}
            style={styles.registerLinkContainer}
        >
            <Text style={styles.registerText}>
                Chưa có tài khoản? <Text style={styles.linkText}>Đăng ký ngay</Text>
            </Text>
        </TouchableOpacity>

      </ScrollView>

      {/* NÚT ĐĂNG NHẬP CỐ ĐỊNH Ở DƯỚI */}
      <View style={styles.bottomBar}>
        <Button
          title={loading ? 'Đang xử lý...' : 'Đăng nhập'}
          onPress={onLogin}
          disabled={isButtonDisabled}
          style={[
            styles.bottomButton,
            isButtonDisabled && styles.bottomButtonDisabled,
          ]}
          textStyle={styles.bottomButtonText}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100, // Để chừa chỗ cho nút cố định
  },
  
  // --- HEADER & NAVIGATION ---
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 12,
    backgroundColor: COLORS.cardBackground, // Đảm bảo thanh header có nền trắng
    borderBottomWidth: 1,
    borderBottomColor: COLORS.inputBorder,
    // Thêm shadow nhẹ cho thanh header (tùy chọn)
    ...Platform.select({
        ios: { shadowColor: COLORS.shadowColor, shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { height: 1, width: 0 } },
        android: { elevation: 2 },
    }),
  },
  backBtn: { 
    padding: 10,
    marginLeft: -5, // Để icon căn chỉnh tốt hơn
  },
  backIconContainer: {
    backgroundColor: 'transparent',
    borderRadius: 50,
    padding: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    width: 20,
    height: 20,
    tintColor: COLORS.textDark,
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: COLORS.textDark,
    marginLeft: 8 
  },
  
  // --- FORM CONTENT ---
  formTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: COLORS.textDark,
      marginTop: 20,
      marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 16,
    color: COLORS.subtitle,
    marginBottom: 25,
  },
  form: { 
    width: '100%',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 8,
    marginTop: 15,
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
  forgotPasswordBtn: {
    alignSelf: 'flex-end',
    marginTop: 10,
    paddingVertical: 5, // Tăng vùng chạm
    paddingHorizontal: 5,
  },
  forgotPasswordText: {
    color: COLORS.primary, // Đổi màu xanh chủ đạo để nổi bật hơn
    fontSize: 14,
    fontWeight: '600',
  },
  
  // --- REGISTER LINK ---
  registerLinkContainer: {
    marginTop: 30,
    alignItems: 'center',
    paddingVertical: 10,
  },
  registerText: {
    color: COLORS.subtitle,
    fontSize: 14,
  },
  linkText: {
    color: COLORS.primary, // Màu xanh chủ đạo cho link Đăng ký
    fontWeight: '700',
  },

  // --- BOTTOM BUTTON ---
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20, // Tăng padding bottom cho iOS/Android
    backgroundColor: COLORS.cardBackground, // Nền trắng cho thanh bottom
    borderTopWidth: 1,
    borderTopColor: COLORS.inputBorder,
  },
  bottomButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    // Shadow nổi bật hơn
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
  bottomButtonText: {
    fontWeight: '800',
    fontSize: 16,
  },
  bottomButtonDisabled: { 
    opacity: 0.5, 
    backgroundColor: COLORS.primary 
  },
});