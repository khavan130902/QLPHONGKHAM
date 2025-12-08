import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import safeAlert from '../../utils/safeAlert';

// --- BẢNG MÀU MỚI (LIGHT THEME) ---
const COLORS = {
  primary: '#2596be',      // Màu xanh chủ đạo
  background: '#f8f9fa',   // Nền tổng thể rất nhạt
  cardBackground: '#ffffff', // Nền card trắng
  textDark: '#1c1c1c',     // Chữ đen chính
  textLight: '#4a4a4a',    // Chữ xám phụ
  subtitle: '#777777',     // Chữ mô tả
  inputBorder: '#e0e0e0',  // Viền Input
  shadowColor: '#000000',
  danger: '#EF4444',       // Đỏ (Rất yếu)
  warning: '#F59E0B',      // Vàng (Yếu)
  success: '#10B981',      // Xanh lá (Mạnh)
  info: '#3B82F6',         // Xanh dương (Trung bình)
};

// --- UTILITY FUNCTIONS (Hàm tiện ích mới) ---

/**
 * Kiểm tra độ mạnh của mật khẩu và trả về màu/text tương ứng
 */
const checkPasswordStrength = (password: string) => {
  if (!password || password.length === 0) return { strength: '', color: COLORS.inputBorder };
  
  if (password.length < 6) return { strength: 'Rất yếu', color: COLORS.danger }; 

  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password)) score += 1; // Chữ thường
  if (/[A-Z]/.test(password)) score += 1; // Chữ hoa
  if (/\d/.test(password)) score += 1;    // Số
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score += 1; // Ký tự đặc biệt

  if (score < 3) return { strength: 'Yếu', color: COLORS.warning }; 
  if (score < 5) return { strength: 'Trung bình', color: COLORS.info }; 
  return { strength: 'Mạnh', color: COLORS.success }; 
};

/**
 * Tạo mật khẩu ngẫu nhiên đảm bảo có đủ các loại ký tự
 */
const generateRandomPassword = () => {
  const length = 12;
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
  let password = '';
  // Đảm bảo có ít nhất 1 chữ thường, 1 chữ hoa, 1 số, 1 ký tự đặc biệt
  password += 'a'; 
  password += 'A'; 
  password += '1'; 
  password += '@'; 
  
  for (let i = 4; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Trộn ngẫu nhiên
  return password.split('').sort(() => 0.5 - Math.random()).join(''); 
};


// --- MAIN COMPONENT ---
export default function AccountRegisterScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // THÊM STATE XÁC NHẬN MẬT KHẨU
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  // THÊM STATE ĐÁNH GIÁ ĐỘ MẠNH
  const [passwordStrengthInfo, setPasswordStrengthInfo] = useState(
    checkPasswordStrength('')
  ); 
  const { registerWithEmail } = useAuth(); 

  // HANDLER MỚI CHO MẬT KHẨU (cập nhật độ mạnh)
  const handlePasswordChange = useCallback((text: string) => {
    setPassword(text);
    setPasswordStrengthInfo(checkPasswordStrength(text));
  }, []);

  // HANDLER TẠO MẬT KHẨU NGẪU NHIÊN
  const handleGeneratePassword = () => {
    const randomPass = generateRandomPassword();
    setPassword(randomPass);
    setConfirmPassword(randomPass); // Tự động điền vào Xác nhận Mật khẩu
    setPasswordStrengthInfo(checkPasswordStrength(randomPass));
    safeAlert('Mật khẩu ngẫu nhiên', 'Mật khẩu đã được tạo và điền vào cả hai trường. Vui lòng ghi nhớ!');
  };

  async function onRegister() {
    setLoading(true);
    try {
      if (!email || !password || !name || !confirmPassword) { // THÊM CHECK confirmPassword
        return safeAlert('Thông tin thiếu', 'Vui lòng nhập đủ Họ tên, email, mật khẩu và xác nhận mật khẩu.');
      }

      if (password !== confirmPassword) { // CHECK KHỚP MẬT KHẨU
        return safeAlert('Lỗi Mật khẩu', 'Mật khẩu và Xác nhận mật khẩu không khớp.');
      }
      
      if (passwordStrengthInfo.strength === 'Rất yếu') { // CHECK ĐỘ MẠNH
        return safeAlert('Mật khẩu quá yếu', 'Vui lòng chọn mật khẩu tối thiểu 6 ký tự.');
      }

      // LOGIC BÀI CŨ ĐƯỢC GIỮ NGUYÊN
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

  // CẬP NHẬT CHECK ĐIỀU KIỆN NÚT
  const isButtonDisabled = loading || !email || !password || !name || password !== confirmPassword;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <View style={styles.backIconContainer}>
            <Image
              source={require('../../../assets/arrow_back.png')} 
              style={styles.backIcon}
              resizeMode="contain"
            />
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tạo tài khoản mới</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.formTitle}>
            Hãy bắt đầu hành trình sức khỏe của bạn!
        </Text>
        <Text style={styles.formSubtitle}>
            Đăng ký bằng email để theo dõi hồ sơ của bạn.
        </Text>

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
                  onChangeText={handlePasswordChange} // Dùng handler mới
                  secureTextEntry
                  style={{ ...styles.inputStyle, ...styles.passwordInput }} // Gộp style
              />
              <TouchableOpacity 
                onPress={handleGeneratePassword} // Nút tạo mật khẩu
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
                      // FIX LỖI GẠCH ĐỎ: Dùng Template Literal
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
                // Highlight màu đỏ nếu không khớp
                style={{ 
                    ...styles.inputStyle,
                    ...(!!confirmPassword && password !== confirmPassword ? styles.inputError : {})
                }}
            />
            {!!confirmPassword && password !== confirmPassword && (
              <Text style={styles.errorText}>Mật khẩu không khớp.</Text>
            )}

        </View>

        <Text style={styles.privacyNote}>
            Việc đăng ký đồng nghĩa với việc bạn đồng ý với các Điều khoản Dịch vụ và Chính sách Bảo mật của chúng tôi.
        </Text>
      </ScrollView>

      {/* NÚT ĐĂNG KÝ CỐ ĐỊNH Ở DƯỚI */}
      <View style={styles.bottomBar}>
        <Button
          title={loading ? 'Đang xử lý...' : 'Đăng ký'}
          onPress={onRegister}
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
    paddingBottom: 100, 
  },
  
  // --- HEADER & NAVIGATION ---
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 12,
    backgroundColor: COLORS.cardBackground, 
    borderBottomWidth: 1,
    borderBottomColor: COLORS.inputBorder,
    ...Platform.select({
        ios: { shadowColor: COLORS.shadowColor, shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { height: 1, width: 0 } },
        android: { elevation: 2 },
    }),
  },
  backBtn: { 
    padding: 10,
    marginLeft: -5,
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
  inputStyle: {
    backgroundColor: COLORS.cardBackground, 
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 55,
    borderColor: COLORS.inputBorder,
    borderWidth: 1,
    paddingRight: 15, 
  },
  // STYLE MỚI: Highlight lỗi
  inputError: {
    borderColor: COLORS.danger,
    borderWidth: 2,
  },
  // STYLE MỚI: Text báo lỗi
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 5,
    fontWeight: '500',
  },
  privacyNote: {
    fontSize: 12,
    color: COLORS.subtitle,
    textAlign: 'center',
    marginTop: 30,
    lineHeight: 18,
  },
  
  // --- PASSWORD FIELDS (STYLE MỚI) ---
  passwordContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 50, // Đảm bảo input chừa chỗ cho button
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
    color: COLORS.primary, 
  },

  // --- STRENGTH INDICATOR (STYLE MỚI) ---
  strengthIndicatorContainer: {
    height: 6,
    backgroundColor: COLORS.inputBorder,
    borderRadius: 3,
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
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
    // Thêm shadow nhẹ để chữ nổi lên trên thanh bar
    textShadowColor: 'rgba(255, 255, 255, 0.75)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 10,
  },

  // --- BOTTOM BUTTON ---
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20, 
    backgroundColor: COLORS.cardBackground, 
    borderTopWidth: 1,
    borderTopColor: COLORS.inputBorder,
  },
  bottomButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
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
    opacity: 0.6,
    backgroundColor: COLORS.primary 
  },
});