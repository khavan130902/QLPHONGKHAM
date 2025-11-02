import React from 'react';
import { TextInput, View, StyleSheet } from 'react-native';

interface Props {
  placeholder?: string;
  value?: string;
  onChangeText?: (t: string) => void;
  keyboardType?: any;
  secureTextEntry?: boolean;
}

export default function Input({
  placeholder,
  value,
  onChangeText,
  keyboardType,
  secureTextEntry,
}: Props) {
  return (
    <View style={styles.wrap}>
      <TextInput
        placeholder={placeholder}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginVertical: 8 },
  input: { borderWidth: 1, borderColor: '#eee', padding: 12, borderRadius: 8 },
});
