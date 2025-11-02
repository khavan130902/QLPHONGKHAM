import React from 'react';
import { TouchableOpacity, View, Text, Image, StyleSheet } from 'react-native';

interface Props {
  uri?: string | null;
  name?: string;
  size?: number;
  onPress?: () => void;
}

export default function Avatar({ uri, name, size = 56, onPress }: Props) {
  const initials = (() => {
    const n = name || '';
    if (!n) return '??';
    const parts = n.trim().split(/\s+/);
    return (
      (parts.length === 1
        ? parts[0].slice(0, 2)
        : (parts[0][0] || '') + (parts[parts.length - 1][0] || '')) || '??'
    ).toUpperCase();
  })();

  const Wrapper: any = onPress ? TouchableOpacity : View;
  return (
    <Wrapper onPress={onPress} style={{ width: size, height: size }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[
            styles.image,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        >
          <Text style={[styles.initials, { fontSize: Math.max(12, size / 3) }]}>
            {initials}
          </Text>
        </View>
      )}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  image: { borderRadius: 999, backgroundColor: '#EEE' },
  placeholder: {
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontWeight: '800', color: '#6D28D9' },
});
