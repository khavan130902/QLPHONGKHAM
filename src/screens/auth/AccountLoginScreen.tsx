import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, ScrollView, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// Giả định các component này được import đúng
import Input from '@/components/Input'; 
import Button from '@/components/Button';
import { useAuth } from '@/context/AuthContext'; 
import safeAlert from '@/utils/safeAlert'; 
import Icon from '@react-native-vector-icons/feather'; 

// Kích thước màn hình để tính toán chiều cao của sóng
const { height } = Dimensions.get('window');
const WAVE_HEIGHT = height * 0.35; // Chiếm khoảng 35% chiều cao (Đồng bộ với LoginScreen)

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
  success: '#10B981', 
};

// --- MAIN COMPONENT ---
export default function AccountLoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithEmail, sendPasswordResetEmail } = useAuth(); 

  // --- LOGIC ĐĂNG NHẬP (Giữ nguyên) ---
  async function onLogin() {
    if (!email || !password) {
      safeAlert('Thông tin thiếu', 'Vui lòng nhập email và mật khẩu');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmail?.(email.trim(), password);
    } catch (err) {
      console.warn('email login failed', err);
      safeAlert('Đăng nhập thất bại', (err as any)?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  // --- LOGIC XỬ LÝ QUÊN MẬT KHẨU (Giữ nguyên) ---
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
      
      {/* --- HEADER SÓNG (ĐỒNG BỘ VỚI LOGINSCREEN) --- */}
      <View style={styles.waveBackground}>
        {/* LOGO ở giữa phần sóng trên cùng */}
        <View style={styles.logoContainer}>
            <View style={styles.appTitleWrapper}>
              <Image
                source={require('../../../assets/logo.png')} // Giả định path này đúng
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
        </View>
        <View style={styles.waveShape} />
      </View>

      {/* NÚT BACK (Đồng bộ, màu trắng) */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backBtnAbsolute}
      >
        <Image
          source={require('../../../assets/arrow_back.png')} 
          style={styles.backIcon}
          resizeMode="contain"
        />
      </TouchableOpacity>


      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formCard}>
            <Text style={styles.formTitle}>👋 Chào mừng trở lại!</Text>
          <Text style={styles.formSubtitle}>Đăng nhập vào tài khoản của bạn để tiếp tục</Text>
          {/* FORM ĐĂNG NHẬP */}
          <View style={styles.form}>
              {/* INPUT EMAIL */}
              <Text style={styles.inputLabel}>Địa chỉ Email</Text>
              <Input 
                  placeholder="Nhập email của bạn" 
                  value={email} 
                  onChangeText={setEmail} 
                  keyboardType="email-address"
                  style={styles.inputStyle}
                  autoCapitalize="none" 
                  // iconName="mail" // Giả định component Input hỗ trợ icon
              />
              
              {/* INPUT MẬT KHẨU */}
              <Text style={styles.inputLabel}>Mật khẩu</Text>
              <Input
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  style={styles.inputStyle}
                  // iconName="lock" // Giả định component Input hỗ trợ icon
              />

              {/* QUÊN MẬT KHẨU */}
              <TouchableOpacity 
                  style={styles.forgotPasswordBtn}
                  onPress={handleForgotPassword} 
                  disabled={loading}
              >
                  <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
              </TouchableOpacity>
          </View>

          {/* NÚT ĐĂNG NHẬP (Đồng bộ với style nút chính của LoginScreen) */}
          <Button
            title={loading ? 'Đang xử lý...' : 'Đăng nhập'}
            onPress={onLogin}
            disabled={isButtonDisabled}
            style={[
              styles.loginButton,
              isButtonDisabled && styles.loginButtonDisabled,
            ]}
            textStyle={styles.loginButtonText}
          />

          {/* CHƯA CÓ TÀI KHOẢN? ĐĂNG KÝ (Đồng bộ với style liên kết) */}
          <TouchableOpacity
              onPress={() => navigation.navigate('AccountRegister')}
              style={styles.registerLinkContainer}
          >
              <Text style={styles.registerText}>
                  Chưa có tài khoản? <Text style={styles.linkText}>Đăng ký ngay</Text>
              </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}

// --- STYLES MỚI (Đã đồng bộ) ---
const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  
  // --- HEADER SÓNG (COPY từ LoginScreen) ---
  waveBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: WAVE_HEIGHT, 
    backgroundColor: COLORS.primary, // Màu Xanh chủ đạo
    borderBottomRightRadius: 0, 
    borderBottomLeftRadius: 0,
  },
  waveShape: {
    position: 'absolute',
    bottom: -1, 
    left: 0,
    right: 0,
    height: 100, 
    backgroundColor: COLORS.background, 
    borderTopLeftRadius: 80, 
    borderTopRightRadius: 80, 
    transform: [{ translateY: 50 }], 
  },
  
  // LOGO (COPY từ LoginScreen)
  logoContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 40 : 20,
    width: '100%',
    alignItems: 'center',
  },
  appTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20, 
  },
  logoImage: {
    width: 110,
    height: 110,
    borderRadius: 25, 
    marginRight: 10,
    backgroundColor: COLORS.cardBackground, 
  },
  
  // NÚT BACK (COPY từ LoginScreen)
  backBtnAbsolute: { 
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 10,
    zIndex: 10, 
    padding: 10,
  },
  backIcon: {
    width: 20,
    height: 20,
    tintColor: COLORS.cardBackground, 
  },

  // --- FORM CONTENT WRAPPER ---
  scrollContent: {
    // flexGrow: 1, // Bỏ flexGrow để scrollview chỉ chiếm nội dung
    paddingHorizontal: 20,
    paddingTop: WAVE_HEIGHT - 120, // Kéo form nổi lên
    paddingBottom: 60, // Đồng bộ với LoginScreen.tsx
  },

  // Card bao quanh form (COPY từ LoginScreen)
  formCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 20,
    padding: 20,
    paddingBottom: 30,
    ...Platform.select({
      ios: { 
        shadowColor: COLORS.shadowColor, 
        shadowOpacity: 0.1, 
        shadowRadius: 10, 
        shadowOffset: { height: 5, width: 0 } 
      },
      android: { elevation: 8 },
    }),
  },

  // --- FORM TYPOGRAPHY ---
  formTitle: {
      fontSize: 24, // Nhỏ hơn so với bản cũ của LoginScreen, đồng bộ với LoginScreen.tsx mới
      fontWeight: '800',
      color: COLORS.textDark,
      marginTop: 10,
      marginBottom: 4,
      textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 15, // Đồng bộ với LoginScreen.tsx
    color: COLORS.subtitle,
    marginBottom: 25,
    textAlign: 'center',
  },
  form: { 
    width: '100%',
  },
  inputLabel: {
    fontSize: 14, // Đồng bộ với LoginScreen.tsx
    fontWeight: '600', // Đồng bộ với LoginScreen.tsx
    color: COLORS.textLight,
    marginBottom: 8, // Đồng bộ với LoginScreen.tsx
    marginTop: 15, // Đồng bộ với LoginScreen.tsx
  },
  inputStyle: {
    backgroundColor: COLORS.background, // Đồng bộ với LoginScreen.tsx
    borderRadius: 12, // Đồng bộ với LoginScreen.tsx
    paddingHorizontal: 15, // Đồng bộ với LoginScreen.tsx
    height: 55, // Đồng bộ với LoginScreen.tsx
    borderColor: COLORS.inputBorder,
    borderWidth: 1,
    paddingRight: 15, 
    // Bỏ shadow nhẹ cho input của bản AccountLoginScreen cũ để đồng bộ với LoginScreen
  },
  forgotPasswordBtn: {
    alignSelf: 'flex-end',
    marginTop: 15,
    paddingVertical: 5, 
    paddingHorizontal: 5,
  },
  forgotPasswordText: {
    color: COLORS.primary, 
    fontSize: 14, // Giảm về 14 để đồng bộ với font chữ chung
    fontWeight: '700', 
    textDecorationLine: 'underline', 
  },
  
  // --- LOGIN BUTTON (Sử dụng style của registerButton từ LoginScreen) ---
  loginButton: {
    backgroundColor: COLORS.primary, 
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 30,
    // Đảm bảo shadow đồng bộ
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
  loginButtonText: {
    fontWeight: '800',
    fontSize: 16,
    color: COLORS.cardBackground,
  },
  loginButtonDisabled: { 
    opacity: 0.6, 
    backgroundColor: COLORS.primary 
  },
  
  // --- REGISTER LINK ---
  registerLinkContainer: {
    marginTop: 20, // Đồng bộ với LoginScreen
    alignItems: 'center',
    paddingVertical: 0, // Bỏ padding vertical
  },
  registerText: {
    color: COLORS.textLight, 
    fontSize: 14, // Đồng bộ với LoginScreen
  },
  linkText: {
    color: COLORS.primary, 
    fontWeight: '700', // Đồng bộ với LoginScreen
  },

  // Xóa các styles cũ không cần thiết (header, bottomBar...)
});