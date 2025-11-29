import React, { useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    Image, // Thêm Image
    Platform, // Thêm Platform
    ScrollView // Thêm ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import db from '@/services/firestore';
import safeAlert from '@/utils/safeAlert'; // Import safeAlert

// --- BẢNG MÀU MỚI (LIGHT THEME) ---
const COLORS = {
  primary: '#2596be',      // Màu xanh chủ đạo
  background: '#f8f9fa',   // Nền tổng thể rất nhạt
  cardBackground: '#ffffff', // Nền card trắng
  textDark: '#1c1c1c',     // Chữ đen chính
  textLight: '#4a4a4a',    // Chữ xám phụ
  subtitle: '#777777',     // Chữ mô tả
  inputBorder: '#e0e0e0',  // Viền Input
  shadowColor: '#000000',
};

// --- MAIN COMPONENT ---
export default function PhoneOtpScreen({ navigation, route }: any) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { confirmCode } = useAuth();
  const { registering, profile, phoneNumber } = route.params || {}; // Lấy sđt từ params (nếu có)

  async function onConfirm() {
    setLoading(true);
    try {
      const credential = await confirmCode(code);
      // Nếu là flow đăng ký, tạo hồ sơ user trong Firestore
      if (registering && credential && credential.user) {
        const uid = credential.user.uid;
        await db
          .collection('users')
          .doc(uid)
          .set({
            uid,
            name: profile?.name || null,
            phoneNumber: credential.user.phoneNumber || null,
            role: 'patient',
            createdAt: new Date().toISOString(),
          });
      }
      // Điều hướng vào app chính (Patient stack)
      navigation.reset({ index: 0, routes: [{ name: 'Patient' }] });
    } catch (err) {
      console.warn('confirm failed', err);
      // Thêm safeAlert (nếu bạn có)
      safeAlert('Xác thực thất bại', 'Mã OTP không chính xác hoặc đã hết hạn.');
    } finally {
      setLoading(false);
    }
  }

  // Nút "Tiếp tục" bị vô hiệu hóa nếu mã không đủ 6 số
  const isButtonDisabled = loading || code.length < 6;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER (Đồng nhất với các màn hình khác) */}
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
        <Text style={styles.headerTitle}>Xác thực OTP</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.formTitle}>
          Nhập mã xác thực
        </Text>
        <Text style={styles.formSubtitle}>
          Mã OTP gồm 6 số đã được gửi đến số điện thoại của bạn.
          {/* Tùy chọn: Hiển thị SĐT (nếu được truyền qua) */}
          {/* {phoneNumber && <Text style={{fontWeight: '600', color: COLORS.textDark}}> {phoneNumber}</Text>} */}
        </Text>

        {/* INPUT OTP (Sửa lỗi: dùng Input thay vì codeBox) */}
        <View style={styles.form}>
            <Text style={styles.inputLabel}>Mã OTP</Text>
            <Input
              placeholder="Nhập 6 số"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6} // Giới hạn 6 ký tự
              style={styles.inputStyle}
            />

            {/* GỬI LẠI MÃ */}
            <TouchableOpacity style={styles.resendButton}>
                <Text style={styles.resendText}>
                    Không nhận được mã? <Text style={styles.linkText}>Gửi lại</Text>
                </Text>
            </TouchableOpacity>
        </View>

      </ScrollView>

      {/* NÚT TIẾP TỤC (Cố định ở dưới) */}
      <View style={styles.bottomBar}>
        <Button
          title={loading ? 'Đang xác thực...' : 'Tiếp tục'}
          onPress={onConfirm}
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
    lineHeight: 24, // Tăng khoảng cách dòng
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
    // Style riêng cho OTP input (nếu muốn)
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 8, // Tạo khoảng cách giữa các số
  },

  // --- RESEND LINK ---
  resendButton: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 10,
  },
  resendText: {
    color: COLORS.subtitle,
    fontSize: 14,
  },
  linkText: {
    color: COLORS.primary, // Màu xanh chủ đạo cho link
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
    opacity: 0.5, 
    backgroundColor: COLORS.primary 
  },
});