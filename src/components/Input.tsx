import React from 'react';
import { 
  TextInput, 
  View, 
  StyleSheet, 
  ViewStyle,       // Kiểu cho style của View (wrap)
  TextStyle,       // Kiểu cho style của TextInput (input)
  TextInputProps   // Sử dụng tất cả các props tiêu chuẩn của TextInput
} from 'react-native';

// Khai báo lại Props để kế thừa tất cả các props tiêu chuẩn của TextInput
// và bổ sung thêm các props style mà bạn muốn cho phép bên ngoài tùy chỉnh.

interface Props extends TextInputProps {
  // Thay thế các props riêng lẻ bằng cách kế thừa TextInputProps
  // Thêm định nghĩa cho style của View bọc ngoài (nếu cần)
  wrapStyle?: ViewStyle | ViewStyle[]; 
  // Thêm định nghĩa cho style của TextInput bên trong (thường là style)
  // Props 'style' đã có sẵn trong TextInputProps, nhưng ta khai báo lại để nhắc nhở.
  // style?: TextStyle | TextStyle[]; // Đã có trong TextInputProps

  // Bổ sung các props mà bạn đã khai báo thủ công trước đó
  placeholder?: string;
  value?: string;
  onChangeText?: (t: string) => void;
  // Các props khác như keyboardType, secureTextEntry đã có sẵn trong TextInputProps
}

export default function Input({
  placeholder,
  value,
  onChangeText,
  keyboardType,
  secureTextEntry,
  // Thêm props style và các props khác của TextInputProps
  style,          // <--- Lấy prop 'style' ra
  wrapStyle,      // <--- Lấy prop 'wrapStyle' ra (nếu dùng)
  ...rest         // <--- Lấy tất cả props còn lại (ví dụ: onBlur, multiline, v.v.)
}: Props) {
  return (
    // Áp dụng wrapStyle vào View bọc
    <View style={[styles.wrap, wrapStyle]}> 
      <TextInput
        placeholder={placeholder}
        // Áp dụng props style (là TextStyle) vào TextInput
        // Props 'style' nhận được từ file gọi sẽ được hợp nhất với styles.input
        style={[styles.input, style]} 
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        // Truyền các props còn lại
        {...rest} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Giữ nguyên style hiện tại hoặc cập nhật style cơ bản
  wrap: { 
      marginVertical: 8 
  },
  input: { 
      borderWidth: 1, 
      borderColor: '#eee', 
      padding: 12, 
      borderRadius: 8,
      // Đảm bảo Text Color mặc định
      color: '#1c1c1c' 
  },
});