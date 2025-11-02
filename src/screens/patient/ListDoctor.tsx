// screens/ListDoctor.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  TextInput,
  ScrollView,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import db from '@/services/firestore';
import Avatar from '@/components/Avatar';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
const animate = () =>
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

export default function ListDoctor() {
  const navigation = useNavigation();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(
    null,
  );

  // collapsible
  const [specCollapsed, setSpecCollapsed] = useState(false);
  const [docCollapsed, setDocCollapsed] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const snapDocs = await db
          .collection('users')
          .where('role', '==', 'doctor')
          .get();
        setDoctors(
          snapDocs.docs.map(d => ({ id: d.id, ...(d.data() as any) })),
        );
        const snapSpec = await db
          .collection('specialties')
          .orderBy('name')
          .get();
        setSpecialties(
          snapSpec.docs.map(d => ({ id: d.id, ...(d.data() as any) })),
        );
      } catch (e) {
        console.warn('load list doctor', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const specialtyMap = useMemo(() => {
    const m: Record<string, string> = {};
    specialties.forEach(s => (m[s.id] = s.name));
    return m;
  }, [specialties]);

  const specialtyCounts = useMemo(() => {
    const c: Record<string, number> = {};
    doctors.forEach(d => {
      const name = specialtyMap[d.specialty_id || ''] || 'Khác';
      c[name] = (c[name] || 0) + 1;
    });
    return c;
  }, [doctors, specialtyMap]);

  const names = useMemo(
    () => Object.keys(specialtyCounts).sort(),
    [specialtyCounts],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return doctors.filter(d => {
      const bySpec =
        !selectedSpecialty ||
        (specialtyMap[d.specialty_id || ''] || 'Khác') === selectedSpecialty;
      const byQuery =
        !q ||
        (d.name || '').toLowerCase().includes(q) ||
        (specialtyMap[d.specialty_id || ''] || '').toLowerCase().includes(q);
      return bySpec && byQuery;
    });
  }, [doctors, selectedSpecialty, query, specialtyMap]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Danh sách khoa & bác sĩ</Text>
      <Text style={styles.subtitle}>
        Lọc theo chuyên khoa hoặc tìm theo tên
      </Text>

      <TextInput
        placeholder="Tìm bác sĩ, chuyên khoa..."
        value={query}
        onChangeText={setQuery}
        style={styles.search}
        placeholderTextColor="#9CA3AF"
      />

      {loading ? (
        <ActivityIndicator color="#1976d2" style={{ marginTop: 24 }} />
      ) : (
        <>
          {/* Chuyên khoa */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Chuyên khoa <Text style={styles.muted}>({names.length} mục)</Text>
            </Text>
            <Pressable
              onPress={() => {
                animate();
                setSpecCollapsed(v => !v);
              }}
              style={styles.collapseBtn}
            >
              <Text style={styles.collapseText}>
                {specCollapsed ? 'Mở' : 'Thu gọn'}
              </Text>
              <Text style={styles.caret}>{specCollapsed ? '▾' : '▴'}</Text>
            </Pressable>
          </View>

          {!specCollapsed && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipList}
              // quan trọng: tránh chiếm chỗ chiều dọc
              style={{ marginBottom: 8, flexGrow: 0 }}
            >
              {['Tất cả', ...names].map(item => {
                const selected =
                  (!selectedSpecialty && item === 'Tất cả') ||
                  selectedSpecialty === item;
                return (
                  <Pressable
                    key={item}
                    android_ripple={{
                      color: 'rgba(0,0,0,0.06)',
                      borderless: false,
                    }}
                    onPress={() =>
                      item === 'Tất cả'
                        ? setSelectedSpecialty(null)
                        : setSelectedSpecialty(prev =>
                            prev === item ? null : item,
                          )
                    }
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selected && styles.chipTextSelected,
                      ]}
                    >
                      {item}
                    </Text>
                    <View
                      style={[styles.badge, selected && styles.badgeSelected]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          selected && styles.badgeTextSelected,
                        ]}
                      >
                        {item === 'Tất cả'
                          ? doctors.length
                          : specialtyCounts[item] ?? 0}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {/* Bác sĩ */}
          <View style={[styles.sectionHeader, { marginTop: 6 }]}>
            <Text style={styles.sectionTitle}>
              Bác sĩ{' '}
              <Text style={styles.muted}>
                ({filtered.length}/{doctors.length})
              </Text>
            </Text>
            <Pressable
              onPress={() => {
                animate();
                setDocCollapsed(v => !v);
              }}
              style={styles.collapseBtn}
            >
              <Text style={styles.collapseText}>
                {docCollapsed ? 'Mở' : 'Thu gọn'}
              </Text>
              <Text style={styles.caret}>{docCollapsed ? '▾' : '▴'}</Text>
            </Pressable>
          </View>

          {!docCollapsed && (
            <View style={{ marginTop: 6 }}>
              {filtered.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyIcon}>🔍</Text>
                  <Text style={styles.emptyText}>
                    Không tìm thấy bác sĩ phù hợp
                  </Text>
                </View>
              ) : (
                filtered.map(item => (
                  <Pressable
                    key={item.id}
                    onPress={() =>
                      (navigation as any).navigate('Book', {
                        doctorId: item.id,
                      })
                    }
                    style={({ pressed }) => [
                      styles.card,
                      pressed && {
                        opacity: 0.95,
                        transform: [{ scale: 0.99 }],
                      },
                    ]}
                    android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
                  >
                    <Avatar uri={item.photoURL} name={item.name} size={52} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.name}>
                        {item.name || `Bác sĩ ${item.id}`}
                      </Text>
                      <Text style={styles.spec}>
                        {specialtyMap[item.specialty_id || ''] ||
                          'Chưa có chuyên khoa'}
                      </Text>
                    </View>
                    <Text style={styles.arrow}>›</Text>
                  </Pressable>
                ))
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const CHIP_HEIGHT = 34;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  title: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  subtitle: { color: '#6B7280', marginTop: 2, marginBottom: 10, fontSize: 13 },

  search: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 8,
    fontSize: 14,
  },

  sectionHeader: {
    marginTop: 4,
    marginBottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  muted: { color: '#6B7280', fontWeight: '600' },
  collapseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#EEF2F7',
  },
  collapseText: { fontSize: 12.5, color: '#111827', fontWeight: '600' },
  caret: { marginLeft: 4, color: '#64748B', fontSize: 12 },

  chipList: { paddingVertical: 4, flexGrow: 0 }, // tránh chiếm chỗ
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: CHIP_HEIGHT,
    paddingHorizontal: 10,
    marginRight: 8,
    borderRadius: 10,
    backgroundColor: '#EEF2F7',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipSelected: { backgroundColor: '#1976d2', borderColor: '#1976d2' },
  chipText: { color: '#111827', fontWeight: '600', fontSize: 13.5 },
  chipTextSelected: { color: '#fff' },
  badge: {
    marginLeft: 6,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 5,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSelected: { backgroundColor: 'rgba(255,255,255,0.25)' },
  badgeText: { fontSize: 10.5, fontWeight: '700', color: '#111827' },
  badgeTextSelected: { color: '#fff' },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 2,
  },
  name: { fontSize: 15.5, fontWeight: '700', color: '#0F172A' },
  spec: { color: '#2563EB', fontWeight: '600', fontSize: 13, lineHeight: 18 },
  arrow: { fontSize: 22, color: '#94A3B8', marginLeft: 6 },

  empty: { alignItems: 'center', marginTop: 24 },
  emptyIcon: { fontSize: 38 },
  emptyText: { marginTop: 4, color: '#6B7280' },
});
