import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import safeAlert from '@/utils/safeAlert';

const { height } = Dimensions.get('window');
const WAVE_HEIGHT = height * 0.32;

// ----- COLORS -----
const COLORS = {
  primary: '#2596be',
  background: '#f8f9fa',
  cardBackground: '#ffffff',
  textDark: '#1c1c1c',
  textLight: '#4a4a4a',
  subtitle: '#777777',
  inputBorder: '#e0e0e0',
  shadowColor: '#000000',

  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  info: '#3B82F6',

  waveBackground: '#2596be',
};

// ----- PASSWORD CHECK -----
const checkPasswordStrength = (password: string) => {
  if (!password) return { strength: '', color: COLORS.inputBorder };
  if (password.length < 6) return { strength: 'Rất yếu', color: COLORS.danger };

  let s = 0;
  if (password.length >= 8) s++;
  if (/[a-z]/.test(password)) s++;
  if (/[A-Z]/.test(password)) s++;
  if (/\d/.test(password)) s++;
  if (/[^a-zA-Z0-9]/.test(password)) s++;

  if (s < 3) return { strength: 'Yếu', color: COLORS.warning };
  if (s < 5) return { strength: 'Trung bình', color: COLORS.info };
  return { strength: 'Mạnh', color: COLORS.success };
};

const generateRandomPassword = () => {
  const length = 12;
  const chars =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
  let password = '';

  password += 'a';
  password += 'A';
  password += '1';
  password += '@';

  for (let i = 4; i < length; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }

  return password
    .split('')
    .sort(() => 0.5 - Math.random())
    .join('');
};

export default function AccountRegisterScreen({ navigation }: any) {
  const { registerWithEmail } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [passwordStrengthInfo, setPasswordStrengthInfo] = useState(
    checkPasswordStrength('')
  );

  const handlePasswordChange = useCallback((t: string) => {
    setPassword(t);
    setPasswordStrengthInfo(checkPasswordStrength(t));
  }, []);

  const handleGeneratePassword = () => {
    const newPass = generateRandomPassword();
    setPassword(newPass);
    setConfirmPassword(newPass);
    setPasswordStrengthInfo(checkPasswordStrength(newPass));
    safeAlert('Mật khẩu ngẫu nhiên', 'Đã tạo mật khẩu mạnh tự động.');
  };

  async function onRegister() {
    setLoading(true);
    try {
      if (!name || !email || !password || !confirmPassword) {
        return safeAlert('Thiếu thông tin', 'Vui lòng nhập đầy đủ các trường.');
      }

      if (password !== confirmPassword) {
        return safeAlert('Lỗi', 'Mật khẩu xác nhận không khớp.');
      }

      if (passwordStrengthInfo.strength === 'Rất yếu') {
        return safeAlert('Mật khẩu quá yếu', 'Tối thiểu 6 ký tự.');
      }

      await registerWithEmail?.(email.trim(), password, { name });

      safeAlert('Thành công', 'Tạo tài khoản thành công.');
      navigation.reset({ index: 0, routes: [{ name: 'Patient' }] });
    } catch (err) {
      safeAlert('Lỗi đăng ký', String(err));
    } finally {
      setLoading(false);
    }
  }

  const disabled =
    loading ||
    !name ||
    !email ||
    !password ||
    !confirmPassword ||
    password !== confirmPassword ||
    passwordStrengthInfo.strength === 'Rất yếu';

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* --- WAVE HEADER GIỐNG LOGIN SCREEN --- */}
      <View style={styles.waveBackground}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <View style={styles.waveShape} />
      </View>

      {/* BACK BUTTON */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backBtnAbsolute}
      >
        <Image
          source={require('../../../assets/arrow_back.png')}
          style={styles.backIcon}
        />
      </TouchableOpacity>

      {/* --- CONTENT --- */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* FORM CARD (như LoginScreen) */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Tạo tài khoản</Text>
          <Text style={styles.formSubtitle}>
            Nhập thông tin để bắt đầu sử dụng ứng dụng.
          </Text>

          {/* NAME */}
          <Text style={styles.inputLabel}>Họ và tên</Text>
          <Input
            placeholder="Nhập họ và tên"
            value={name}
            onChangeText={setName}
            style={styles.inputStyle}
          />

          {/* EMAIL */}
          <Text style={styles.inputLabel}>Email</Text>
          <Input
            placeholder="email@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            style={styles.inputStyle}
          />

          {/* PASSWORD */}
          <Text style={styles.inputLabel}>Mật khẩu</Text>
          <View style={styles.passwordContainer}>
            <Input
              placeholder="Tối thiểu 6 ký tự"
              value={password}
              onChangeText={handlePasswordChange}
              secureTextEntry
              style={[styles.inputStyle, styles.passwordInput]}
            />
            <TouchableOpacity
              onPress={handleGeneratePassword}
              style={styles.generateButton}
            >
              <Text style={styles.generateButtonText}>⚡</Text>
            </TouchableOpacity>
          </View>

          {/* STRENGTH BAR */}
          {passwordStrengthInfo.strength ? (
            <View style={styles.strengthIndicatorContainer}>
              <View
                style={[
                  styles.strengthBar,
                  {
                    width: `${
                      (['Rất yếu', 'Yếu', 'Trung bình', 'Mạnh'].indexOf(
                        passwordStrengthInfo.strength
                      ) +
                        1) *
                      25
                    }%`,
                    backgroundColor: passwordStrengthInfo.color,
                  },
                ]}
              />
            </View>
          ) : null}

          {/* CONFIRM */}
          <Text style={styles.inputLabel}>Xác nhận mật khẩu</Text>
          <Input
            placeholder="Nhập lại mật khẩu"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            style={[
              styles.inputStyle,
              confirmPassword && password !== confirmPassword
                ? styles.inputError
                : {},
            ]}
          />

          {/* BUTTON */}
          <Button
            title={loading ? 'Đang xử lý...' : 'Tạo tài khoản'}
            onPress={onRegister}
            disabled={disabled}
            style={[styles.registerButton, disabled && { opacity: 0.5 }]}
            textStyle={styles.registerButtonText}
          />

          {/* LOGIN LINK */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={{ marginTop: 18 }}
          >
            <Text style={styles.loginText}>
              Đã có tài khoản?{' '}
              <Text style={styles.loginLinkText}>Đăng nhập</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.privacyNote}>
          Khi đăng ký, bạn đồng ý với Điều khoản & Chính sách Bảo mật.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },

  // --- WAVE HEADER (copy từ LoginScreen) ---
  waveBackground: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: WAVE_HEIGHT,
    backgroundColor: COLORS.primary,
  },
  waveShape: {
    position: 'absolute',
    bottom: -20,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 80,
    borderTopRightRadius: 80,
    transform: [{ translateY: 30 }],
  },

  logoContainer: {
    marginTop: Platform.OS === 'ios' ? 45 : 25,
    alignItems: 'center',
  },
  logo: {
    width: 110,
    height: 110,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 20,
  },

  backBtnAbsolute: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 12,
    zIndex: 10,
    padding: 10,
  },
  backIcon: {
    width: 20,
    height: 20,
    tintColor: COLORS.cardBackground,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: WAVE_HEIGHT - 90,
    paddingBottom: 60,
  },

  // CARD giống LoginScreen
  formCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 20,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadowColor,
        shadowOpacity: 0.12,
        shadowRadius: 15,
        shadowOffset: { height: 5 },
      },
      android: { elevation: 6 },
    }),
  },

  formTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  formSubtitle: {
    textAlign: 'center',
    color: COLORS.subtitle,
    marginBottom: 25,
  },

  inputLabel: {
    fontWeight: '600',
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  inputStyle: {
    height: 55,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    paddingHorizontal: 15,
  },

  passwordContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 50,
  },
  generateButton: {
    position: 'absolute',
    right: 10,
    padding: 10,
  },
  generateButtonText: {
    fontSize: 22,
    color: COLORS.primary,
    fontWeight: '700',
  },

  strengthIndicatorContainer: {
    height: 6,
    backgroundColor: COLORS.inputBorder,
    borderRadius: 3,
    marginVertical: 10,
    overflow: 'hidden',
  },
  strengthBar: {
    position: 'absolute',
    left: 0,
    height: '100%',
  },

  inputError: {
    borderColor: COLORS.danger,
    borderWidth: 2,
  },

  registerButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 30,
  },
  registerButtonText: { fontWeight: '800', fontSize: 16 },

  loginText: {
    textAlign: 'center',
    color: COLORS.textLight,
    fontSize: 14,
  },
  loginLinkText: { color: COLORS.primary, fontWeight: '700' },

  privacyNote: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.subtitle,
    marginTop: 20,
  },
});
