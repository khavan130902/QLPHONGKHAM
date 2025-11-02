import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '@/theme/colors';

interface Props {
  title: string;
  subtitle?: string;
  onPress?: () => void;
}

export default function ListItem({ title, subtitle, onPress }: Props) {
  const Container: any = onPress ? TouchableOpacity : View;
  return (
    <Container style={styles.row} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  row: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 16, color: '#222' },
  sub: { color: '#666', marginTop: 4 },
});
