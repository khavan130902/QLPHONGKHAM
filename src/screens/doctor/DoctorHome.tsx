import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import Avatar from '@/components/Avatar';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import db from '@/services/firestore';

const ACTIONS = [
  {
    key: 'today',
    title: 'Lich khám hôm nay',
    route: 'Today',
  },
  { key: 'history', title: 'Lịch sử đã khám', route: 'DoctorHistory' },
  { key: 'profile', title: 'Hồ sơ cá nhân', route: 'Profile' },
  { key: 'settings', title: 'Cài đặt', route: 'Settings' },
];

export default function DoctorHome() {
  const navigation = useNavigation();
  const { user } = useAuth() as any;
  const [name, setName] = useState<string>('Bác sĩ');
  const [photoURL, setPhotoURL] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) return;
      try {
        const doc = await db.collection('users').doc(user.uid).get();
        const data = doc.data() as any;
        if (mounted) {
          setName(data?.name || 'Bác sĩ');
          setPhotoURL(data?.photoURL || null);
        }
      } catch (err) {
        console.warn('load doctor profile', err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.small}>Xin chào,</Text>
          <Text style={styles.title}>{name}</Text>
        </View>
        <View style={styles.avatar}>
          <Avatar
            uri={photoURL || undefined}
            name={name}
            size={56}
            onPress={() => (navigation as any).navigate('Profile')}
          />
        </View>
      </View>

      <FlatList
        data={ACTIONS}
        keyExtractor={i => i.key}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.cardFull}
            onPress={() => (navigation as any).navigate(item.route)}
            activeOpacity={0.9}
          >
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 18, backgroundColor: '#FBFBFF' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  small: { color: '#6B7280', fontSize: 14 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarImage: { width: 56, height: 56, borderRadius: 28 },
  avatarText: { fontWeight: '800', color: '#6D28D9' },
  cardFull: {
    width: '100%',
    minHeight: 72,
    marginVertical: 8,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  chevron: { fontSize: 26, color: '#999', fontWeight: '700' },
});
