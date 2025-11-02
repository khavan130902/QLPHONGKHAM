import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

export default function LandingScreen({ navigation }: any) {
  const SocialBtn = ({ text, iconSource, onPress }: any) => (
    <TouchableOpacity style={styles.btn} onPress={onPress} activeOpacity={0.8}>
      <Image source={iconSource} style={styles.iconImage} resizeMode="contain" />
      <Text style={styles.btnText}>{text}</Text>
    </TouchableOpacity>
  );

  const PhoneBtn = ({ text, iconSource, onPress }: any) => (
    <TouchableOpacity
      style={[styles.btn, styles.phoneBtn]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Image source={iconSource} style={styles.iconImage} resizeMode="contain" />
      <Text style={styles.btnText}>{text}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        {/* ✅ Thêm logo MoonCare ở đây */}
        <Image
          source={require('../../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        {/* Giữ nguyên phần text */}
        <Text style={styles.brand}>Xin chào</Text>

      </View>

      <Text style={styles.subtitle}>
        Vào thôi{'\n'}Và xem xét hồ sơ của bạn nhé!
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.accountBtn}
          onPress={() => navigation.navigate('AccountLogin')}
          activeOpacity={0.8}
        >
          <Text style={styles.usernameBtnText}>Đăng nhập bằng tài khoản</Text>
        </TouchableOpacity>

        <SocialBtn
          text="Tiếp tục với Facebook"
          iconSource={require('../../../assets/facebook.png')}
          onPress={() => navigation.navigate('AccountLogin')}
        />
        <SocialBtn
          text="Tiếp tục với Google"
          iconSource={require('../../../assets/google.png')}
          onPress={() => navigation.navigate('AccountLogin')}
        />
        <Text style={styles.or}>Hoặc đăng nhập với</Text>

        <PhoneBtn
          text="Tiếp tục với số điện thoại"
          iconSource={require('../../../assets/phone.png')}
          onPress={() => {
            navigation.replace('Login');
          }}
        />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#35caefff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: {
    width: 220,
    height: 220,
    marginBottom: 10,
  },
  brand: { fontSize: 48, fontWeight: '900', color: '#000' },
  welcome: { marginTop: 4, fontSize: 14, color: '#333' },
  subtitle: { marginTop: 24, textAlign: 'center', color: '#FFFFFF' },
  actions: { padding: 20, paddingBottom: 40 },
  btn: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconImage: { width: 28, height: 28, marginRight: 12 },
  btnText: {
    flex: 1,
    textAlign: 'center',
    paddingRight: 12,
    fontWeight: '700',
    color: '#1B0B2A',
  },
  or: { textAlign: 'center', marginVertical: 8, color: '#FFFFFF' },
  phoneBtn: { backgroundColor: '#fff' },
  accountBtn: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  usernameBtnText: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '700',
    color: '#1B0B2A',
  },
});
