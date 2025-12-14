import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, Dimensions, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Kích thước màn hình để tính toán chiều cao sóng
const { height } = Dimensions.get('window');
const WAVE_HEIGHT = height * 0.35;

// Bảng màu giống LoginScreen
const COLORS = {
  primary: '#2596be',
  background: '#f8f9fa',
  cardBackground: '#ffffff',
  textDark: '#1c1c1c',
  textLight: '#4a4a4a',
  subtitle: '#777777',
  shadowColor: '#000000',
  socialBorder: '#e0e0e0',
  waveBackground: '#2596be',
};

export default function LandingScreen({ navigation }: any) {

  // Nút chính (Primary)
  const PrimaryBtn = ({ text, onPress }: any) => (
    <TouchableOpacity
      style={styles.primaryBtn}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.primaryBtnText}>{text}</Text>
    </TouchableOpacity>
  );
  
  // Nút phụ (Secondary) - ĐÃ THÊM
  const SecondaryBtn = ({ text, onPress }: any) => (
    <TouchableOpacity
      style={styles.secondaryBtn}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.secondaryBtnText}>{text}</Text>
    </TouchableOpacity>
  );


  return (
    <SafeAreaView style={styles.container}>

      {/* --- WAVE HEADER --- */}
      <View style={styles.waveBackground}>
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

      {/* --- SCROLL CONTENT --- */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* CARD CHÍNH */}
        <View style={styles.formCard}>

          <Text style={styles.formTitle}>Xin chào!</Text>
          <Text style={styles.formSubtitle}>
            Hồ sơ sức khỏe cá nhân trong tầm tay bạn.
          </Text>

          {/* Nút hành động */}
          <View style={styles.actions}>
            
            {/* Nút đăng ký (PRIMARY) */}
            <PrimaryBtn
              text="Tạo Tài Khoản Mới (Đăng Ký)"
              onPress={() => navigation.navigate('Login')} // Giữ nguyên logic điều hướng
            />

            {/* Nút đăng nhập (SECONDARY) - ĐÃ CHUYỂN TỪ LINK THÀNH BUTTON */}
            <SecondaryBtn
              text="Đã có tài khoản? Đăng nhập"
              onPress={() => navigation.navigate('AccountLogin')} // Giữ nguyên logic điều hướng
            />

          </View>
        </View>

        <Text style={styles.privacyNote}>
          Khi tiếp tục, bạn đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của chúng tôi.
        </Text>
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // --- HEADER SÓNG ---
  waveBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: WAVE_HEIGHT,
    backgroundColor: COLORS.waveBackground,
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

  // --- LOGO ---
  logoContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 40 : 20,
    width: '100%',
    alignItems: 'center',
  },
  appTitleWrapper: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoImage: {
    width: 140,
    height:140,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 25,
  },

  // --- CONTENT ---
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: WAVE_HEIGHT - 100,
    paddingBottom: 60,
  },

  formCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 20,
    padding: 30,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadowColor,
        shadowOpacity: 0.1,
        shadowRadius: 10,
        shadowOffset: { height: 5, width: 0 },
      },
      android: { elevation: 8 },
    }),
  },

  formTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 5,
  },

  formSubtitle: {
    fontSize: 16,
    color: COLORS.subtitle,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 40,
    lineHeight: 24,
  },

  actions: {},

  // --- PRIMARY BUTTON (Đăng Ký) ---
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 15, // Giảm khoảng cách nhẹ
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
      },
      android: { elevation: 4 },
    }),
  },
  primaryBtnText: {
    fontWeight: '800',
    fontSize: 16,
    color: COLORS.cardBackground,
  },

  // --- SECONDARY BUTTON (Đăng Nhập) ---
  secondaryBtn: {
    backgroundColor: COLORS.cardBackground, // Nền trắng
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1, // Thêm viền
    borderColor: COLORS.socialBorder, // Viền màu xám nhạt
    marginBottom: 10, // Tạo khoảng cách với phần note
  },
  secondaryBtnText: {
    fontWeight: '700',
    fontSize: 16,
    color: COLORS.textLight, // Chữ màu xám phụ
  },
  
  // --- LOGIN LINK (KHÔNG DÙNG NỮA) ---
  loginLink: {
    marginTop: 10,
    alignItems: 'center',
    display: 'none', // Ẩn link text cũ nếu cần
  },
  loginText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  loginLinkText: {
    fontWeight: '700',
    color: COLORS.primary,
  },

  privacyNote: {
    fontSize: 12,
    textAlign: 'center',
    color: COLORS.subtitle,
    marginTop: 25,
    paddingHorizontal: 10,
    lineHeight: 18,
  },
});