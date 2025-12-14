import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, ScrollView, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// Giả định các components Input và Button đã được import đúng cách
import Input from '../../components/Input';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import safeAlert from '../../utils/safeAlert';

// Kích thước màn hình để tính toán chiều cao của sóng
const { height } = Dimensions.get('window');
const WAVE_HEIGHT = height * 0.35; // Chiếm khoảng 35% chiều cao

// --- BẢNG MÀU ĐÃ ĐỒNG BỘ VỚI LandingScreen.tsx (XANH CHỦ ĐẠO) ---
const COLORS = {
  primary: '#2596be',      // Màu XANH chủ đạo
  
  background: '#f8f9fa',   // Nền tổng thể rất nhạt
  cardBackground: '#ffffff', // Nền card trắng
  textDark: '#1c1c1c',     // Chữ đen chính
  textLight: '#4a4a4a',    // Chữ xám phụ
  subtitle: '#777777',     // Chữ mô tả
  inputBorder: '#e0e0e0',  // Viền Input
  shadowColor: '#000000',
  
  // Màu sắc cho độ mạnh mật khẩu và lỗi (Giữ nguyên cho tính năng)
  danger: '#EF4444',       // Đỏ (Rất yếu)
  warning: '#F59E0B',      // Vàng (Yếu)
  success: '#10B981',      // Xanh lá (Mạnh)
  info: '#3B82F6',         // Xanh dương (Trung bình)
  
  // Màu cho phần sóng
  waveBackground: '#2596be',   // Xanh chủ đạo
};

// --- UTILITY FUNCTIONS (Giữ nguyên) ---
const checkPasswordStrength = (password: string) => {
  if (!password || password.length === 0) return { strength: '', color: COLORS.inputBorder };
  
  if (password.length < 6) return { strength: 'Rất yếu', color: COLORS.danger }; 

  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password)) score += 1; 
  if (/[A-Z]/.test(password)) score += 1; 
  if (/\d/.test(password)) score += 1;    
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score += 1; 

  if (score < 3) return { strength: 'Yếu', color: COLORS.warning }; 
  if (score < 5) return { strength: 'Trung bình', color: COLORS.info }; 
  return { strength: 'Mạnh', color: COLORS.success }; 
};

const generateRandomPassword = () => {
  const length = 12;
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
  let password = '';
  password += 'a'; 
  password += 'A'; 
  password += '1'; 
  password += '@'; 
  
  for (let i = 4; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password.split('').sort(() => 0.5 - Math.random()).join(''); 
};


// --- MAIN COMPONENT ---
export default function AccountRegisterScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); 
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordStrengthInfo, setPasswordStrengthInfo] = useState(
    checkPasswordStrength('')
  ); 
  const { registerWithEmail } = useAuth(); 

  const handlePasswordChange = useCallback((text: string) => {
    setPassword(text);
    setPasswordStrengthInfo(checkPasswordStrength(text));
  }, []);

  const handleGeneratePassword = () => {
    const randomPass = generateRandomPassword();
    setPassword(randomPass);
    setConfirmPassword(randomPass);
    setPasswordStrengthInfo(checkPasswordStrength(randomPass));
    safeAlert('Mật khẩu ngẫu nhiên', 'Mật khẩu đã được tạo và điền vào cả hai trường. Vui lòng ghi nhớ!');
  };

  async function onRegister() {
    setLoading(true);
    try {
      if (!email || !password || !name || !confirmPassword) {
        return safeAlert('Thông tin thiếu', 'Vui lòng nhập đủ Họ tên, email, mật khẩu và xác nhận mật khẩu.');
      }

      if (password !== confirmPassword) {
        return safeAlert('Lỗi Mật khẩu', 'Mật khẩu và Xác nhận mật khẩu không khớp.');
      }
      
      if (passwordStrengthInfo.strength === 'Rất yếu') {
        return safeAlert('Mật khẩu quá yếu', 'Vui lòng chọn mật khẩu tối thiểu 6 ký tự.');
      }

      await registerWithEmail?.(email.trim(), password, { name });
      safeAlert('Hoàn tất', 'Tài khoản đã được tạo. Đang vào ứng dụng...');
      navigation.reset({ index: 0, routes: [{ name: 'Patient' }] });
    } catch (err) {
      console.warn('register failed', err);
      safeAlert('Đăng ký thất bại', (err as any)?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  const isButtonDisabled = loading || !email || !password || !name || password !== confirmPassword || passwordStrengthInfo.strength === 'Rất yếu';


  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.waveBackground}>
        {/* LOGO ở giữa phần sóng trên cùng */}
        <View style={styles.logoContainer}>
            <View style={styles.appTitleWrapper}>
              <Image
                source={require('../../../assets/logo.png')} 
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
        </View>
        <View style={styles.waveShape} />
      </View>

      {/* NÚT BACK */}
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
        showsVerticalScrollIndicator={false}
      >
        {/* BẮT ĐẦU VỚI formCard */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Chào mừng!</Text>
          <Text style={styles.formSubtitle}>Tạo tài khoản mới để bắt đầu.</Text>
          <View style={styles.form}>
            {/* INPUT HỌ VÀ TÊN */}
            <Text style={styles.inputLabel}>Họ và tên</Text>
            <Input 
              placeholder="Nhập họ và tên của bạn" 
              value={name} 
              onChangeText={setName} 
              style={styles.inputStyle}
            />
            
            {/* INPUT EMAIL */}
            <Text style={styles.inputLabel}>Địa chỉ Email</Text>
            <Input 
              placeholder="Ví dụ: tenban@example.com" 
              value={email} 
              onChangeText={setEmail} 
              keyboardType="email-address"
              style={styles.inputStyle}
            />
            
            {/* INPUT MẬT KHẨU + TẠO NGẪU NHIÊN */}
            <Text style={styles.inputLabel}>Mật khẩu</Text>
            <View style={styles.passwordContainer}>
              <Input
                placeholder="Tối thiểu 6 ký tự"
                value={password}
                onChangeText={handlePasswordChange}
                secureTextEntry
                style={{ ...styles.inputStyle, ...styles.passwordInput }}
              />
              <TouchableOpacity 
                onPress={handleGeneratePassword}
                style={styles.generateButton}
              >
                <Text style={styles.generateButtonText}>⚡</Text> 
              </TouchableOpacity>
            </View>
            
            {/* THANH BÁO ĐỘ MẠNH */}
            {passwordStrengthInfo.strength ? (
              <View style={styles.strengthIndicatorContainer}>
                <View 
                  style={[
                    styles.strengthBar, 
                    { 
                      width: `${(['Rất yếu', 'Yếu', 'Trung bình', 'Mạnh'].indexOf(passwordStrengthInfo.strength) + 1) * 25}%`,
                      backgroundColor: passwordStrengthInfo.color
                    }
                  ]} 
                />
                <Text style={[styles.strengthText, { color: passwordStrengthInfo.color }]}>
                  Độ mạnh: {passwordStrengthInfo.strength}
                </Text>
              </View>
            ) : null}


            {/* INPUT XÁC NHẬN MẬT KHẨU */}
            <Text style={styles.inputLabel}>Xác nhận mật khẩu</Text>
            <Input
              placeholder="Nhập lại mật khẩu"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              style={{ 
                ...styles.inputStyle,
                ...(!!confirmPassword && password !== confirmPassword ? styles.inputError : {})
              }}
            />
            {!!confirmPassword && password !== confirmPassword && (
              <Text style={styles.errorText}>Mật khẩu không khớp.</Text>
            )}

          </View>

          {/* NÚT ĐĂNG KÝ */}
          <Button
            title={loading ? 'Đang xử lý...' : 'Tạo tài khoản'}
            onPress={onRegister}
            disabled={isButtonDisabled}
            style={[
              styles.registerButton,
              isButtonDisabled && styles.registerButtonDisabled,
            ]}
            textStyle={styles.registerButtonText}
          />

          {/* CHUYỂN ĐẾN ĐĂNG NHẬP */}
          <TouchableOpacity 
            onPress={() => navigation.navigate('Login')}
            style={styles.loginLink}
          >
            <Text style={styles.loginText}>
              Đã có tài khoản? <Text style={styles.loginLinkText}>Đăng nhập</Text>
            </Text>
          </TouchableOpacity>

        </View>

        {/* PRIVACY NOTE Cần nằm ngoài formCard nhưng bên trong ScrollView */}
        <Text style={styles.privacyNote}>
          Việc đăng ký đồng nghĩa với việc bạn đồng ý với các Điều khoản Dịch vụ và Chính sách Bảo mật của chúng tôi.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  
  // --- HEADER SÓNG ---
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
  
  // LOGO 
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
    height:110,
    borderRadius: 25, 
    marginRight: 10,
    backgroundColor: COLORS.cardBackground, 
  },
  
  // NÚT BACK 
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
    paddingHorizontal: 20,
    paddingTop: WAVE_HEIGHT - 120, 
    paddingBottom: 60, // ĐÃ TĂNG paddingBottom
  },
  
  // Card bao quanh form 
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
  
  // --- FORM TYPOGRAPHY (Giữ nguyên) ---
  formTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 10,
    marginBottom: 4,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 15,
    color: COLORS.subtitle,
    marginBottom: 25,
    textAlign: 'center',
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
  inputStyle: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 55,
    borderColor: COLORS.inputBorder,
    borderWidth: 1,
    paddingRight: 15, 
  },
  
  // --- PASSWORD FIELDS ---
  passwordContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 50, 
  },
  generateButton: {
    position: 'absolute',
    right: 0,
    padding: 10,
    height: 55,
    justifyContent: 'center',
    paddingRight: 15,
  },
  generateButtonText: { 
    fontSize: 22, 
    color: COLORS.primary, // Màu Xanh chủ đạo
    fontWeight: 'bold',
  },

  // --- STRENGTH INDICATOR (Giữ nguyên logic màu) ---
  strengthIndicatorContainer: {
    height: 6,
    backgroundColor: COLORS.inputBorder,
    borderRadius: 3,
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden', 
  },
  strengthBar: {
    position: 'absolute',
    left: 0,
    height: '100%',
    borderRadius: 3,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '700',
    position: 'absolute',
    right: 0,
    marginRight: 5,
    backgroundColor: COLORS.cardBackground,
    paddingHorizontal: 4,
    borderRadius: 4,
    overflow: 'hidden',
    textShadowColor: 'rgba(255, 255, 255, 0.75)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 10,
  },
  
  // STYLE LỖI (Giữ nguyên)
  inputError: {
    borderColor: COLORS.danger,
    borderWidth: 2,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 5,
    fontWeight: '500',
  },

  // --- REGISTER BUTTON ---
  registerButton: {
    backgroundColor: COLORS.primary, // Màu Xanh chủ đạo
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 30,
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
  registerButtonText: {
    fontWeight: '800',
    fontSize: 16,
  },
  registerButtonDisabled: { 
    opacity: 0.6,
    backgroundColor: COLORS.primary 
  },
  
  // --- LOGIN LINK ---
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  loginLinkText: {
    fontWeight: '700',
    color: COLORS.primary, // Màu Xanh chủ đạo
  },

  // --- PRIVACY NOTE ---
  privacyNote: {
    fontSize: 12,
    color: COLORS.subtitle,
    textAlign: 'center',
    marginTop: 30,
    lineHeight: 18,
    paddingHorizontal: 10,
  },
});