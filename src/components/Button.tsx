import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  StyleProp,
  TextStyle, 
} from 'react-native';

// Giả sử COLORS được import từ '@/theme/colors' (đã xóa import không cần thiết trong hàm)

interface Props {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  // Style cho TouchableOpacity (View) - đã có
  style?: StyleProp<ViewStyle>;
  
  // THÊM: Định nghĩa prop textStyle
  textStyle?: StyleProp<TextStyle>; 
  
  // THÊM: Định nghĩa prop color (nếu bạn muốn truyền màu nền qua prop này)
  color?: string; 
}

export default function Button({ 
  title, 
  onPress, 
  disabled, 
  style, 
  textStyle, // Lấy prop textStyle ra
  color,     // Lấy prop color ra
}: Props) {
  
  // Tạo style cho nút, ưu tiên style truyền vào hoặc prop color
  const buttonStyle = [
    styles.button, 
    disabled && styles.disabled, 
    color && { backgroundColor: color }, // Áp dụng màu nếu có
    style // Style tùy chỉnh từ bên ngoài có độ ưu tiên cao nhất
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled}
    >
      {/* Áp dụng textStyle vào component Text */}
      <Text style={[styles.text, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    // Lưu ý: COLORS.primary không được định nghĩa trong file này. 
    // Tôi để màu mặc định là 'grey' nếu không có COLORS.primary. 
    // Nếu bạn muốn dùng màu mặc định, hãy chắc chắn import COLORS hoạt động.
    backgroundColor: '#999999', 
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.6 },
  text: { 
    color: '#fff', 
    fontWeight: '600' 
  },
});