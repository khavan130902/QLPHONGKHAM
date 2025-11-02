import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';

interface Props {
  title: string;
  subtitle?: string;
  color?: string;
  icon?: string; // emoji fallback or char
  onPress?: () => void;
  accessibilityLabel?: string;
}

export default function CardItem({
  title,
  subtitle,
  color = '#1976d2',
  icon = '📅',
  onPress,
  accessibilityLabel,
}: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.card, { backgroundColor: color }]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
    >
      <View style={styles.left}>
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: 'rgba(255,255,255,0.18)' },
          ]}
        >
          <Text style={styles.iconText}>{icon}</Text>
        </View>
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    minHeight: 68,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    ...Platform.select({
      android: { elevation: 2 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
    }),
  },
  left: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 16 },
  title: { fontSize: 16, fontWeight: '600', color: '#fff' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  chevron: { fontSize: 22, color: 'rgba(255,255,255,0.95)', marginLeft: 12 },
});
