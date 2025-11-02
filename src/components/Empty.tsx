import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function Empty({
  text = 'Không có dữ liệu',
}: {
  text?: string;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, alignItems: 'center' },
  text: { color: '#999' },
});
