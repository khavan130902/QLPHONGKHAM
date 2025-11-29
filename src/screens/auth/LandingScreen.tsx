import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- BẢNG MÀU MỚI (LIGHT THEME) ---
const COLORS = {
  primary: '#2596be',      // Màu xanh chủ đạo
  background: '#f8f9fa',   // Nền tổng thể rất nhạt
  cardBackground: '#ffffff', // Nền card trắng
  textDark: '#1c1c1c',     // Chữ đen chính
  textLight: '#4a4a4a',    // Chữ xám phụ
  subtitle: '#777777',     // Chữ mô tả
  shadowColor: '#000000',
  // Thêm màu cho các hành động (nhất quán với màu xanh primary)
  socialBorder: '#e0e0e0', // Viền cho nút xã hội
};

// --- COMPONENT CHÍNH ---
export default function LandingScreen({ navigation }: any) {
  
  // Component Nút Xã hội (Dùng nền trắng và viền)
  const SocialBtn = ({ text, iconSource, onPress }: any) => (
    <TouchableOpacity style={styles.socialBtn} onPress={onPress} activeOpacity={0.8}>
      <Image source={iconSource} style={styles.socialIconImage} resizeMode="contain" />
      <Text style={styles.socialBtnText}>{text}</Text>
    </TouchableOpacity>
  );

  // Component Nút Điện thoại (Nút chính - Màu Primary)
  const PhoneBtn = ({ text, onPress }: any) => (
    <TouchableOpacity
      style={styles.phoneBtn}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.phoneBtnText}>{text}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* KHU VỰC LOGO & TIÊU ĐỀ */}
      <View style={styles.header}>
        <Image
          source={require('../../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.brand}>Xin chào</Text> 
        <Text style={styles.subtitleText}>
          Hồ sơ sức khỏe cá nhân trong tầm tay bạn.
        </Text>
      </View>

      {/* KHU VỰC HÀNH ĐỘNG */}
      <View style={styles.actions}>
        
        {/* Nút Đăng nhập/Tiếp tục bằng SĐT (Nút chính) */}
        <PhoneBtn
          text="Tiếp tục với Số điện thoại"
          onPress={() => {
            navigation.navigate('Login'); 
          }}
        />

        {/* Hoặc */}
        <View style={styles.orContainer}>
          <View style={styles.divider} />
          <Text style={styles.orText}>Hoặc</Text>
          <View style={styles.divider} />
        </View>
        
        {/* Nút Đăng nhập bằng tài khoản (Nút phụ) */}
        <TouchableOpacity
          style={styles.accountBtn}
          onPress={() => navigation.navigate('AccountLogin')}
          activeOpacity={0.8}
        >
          <Text style={styles.accountBtnText}>Đăng nhập bằng Email/Tài khoản</Text>
        </TouchableOpacity>

        <Text style={styles.socialTitle}>Tiếp tục với mạng xã hội</Text>
        <View style={styles.socialGroup}>
            {/* Nút Xã hội 1 */}
            <SocialBtn
                text="Facebook"
                iconSource={require('../../../assets/facebook.png')}
                onPress={() => navigation.navigate('AccountLogin')}
            />
            <View style={{ width: 12 }} /> 
            {/* Nút Xã hội 2 */}
            <SocialBtn
                text="Google"
                iconSource={require('../../../assets/google.png')}
                onPress={() => navigation.navigate('AccountLogin')}
            />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background, // Nền rất nhạt
    paddingHorizontal: 20,
  },
  header: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingTop: 50,
  },
  logo: {
    width: 200, 
    height:200,
    marginBottom: 5,
  },
  brand: { 
    fontSize: 48, 
    fontWeight: '900', 
    color: COLORS.textDark, // Chữ đen đậm
  },
  subtitleText: { 
    marginTop: 10, 
    fontSize: 16,
    textAlign: 'center', 
    color: COLORS.subtitle, // Chữ xám subtitle
    marginBottom: 30,
  },
  actions: { 
    paddingBottom: Platform.OS === 'ios' ? 0 : 20, 
  },
  
  // --- PHONE BUTTON (PRIMARY) ---
  phoneBtn: {
    backgroundColor: COLORS.primary, // Màu xanh chủ đạo
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  phoneBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.cardBackground, // Chữ trắng
  },

  // --- ACCOUNT BUTTON (SECONDARY) ---
  accountBtn: {
    backgroundColor: COLORS.cardBackground, // Nền trắng
    borderWidth: 1,
    borderColor: COLORS.socialBorder,
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  accountBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textLight, // Chữ xám phụ
  },

  // --- OR DIVIDER ---
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.socialBorder,
  },
  orText: { 
    marginHorizontal: 10, 
    color: COLORS.subtitle, // Chữ xám subtitle
    fontSize: 14,
    fontWeight: '500',
  },

  // --- SOCIAL BUTTONS ---
  socialTitle: {
    textAlign: 'center', 
    marginVertical: 10, 
    color: COLORS.subtitle,
    fontSize: 14,
  },
  socialGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  socialBtn: {
    flex: 1,
    backgroundColor: COLORS.cardBackground, // Nền trắng
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.socialBorder, // Viền nhẹ
  },
  socialIconImage: { 
    width: 24, 
    height: 24, 
    marginRight: 8 
  },
  socialBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textLight, // Chữ xám phụ
  },
});