// screens/DoctorScheduleScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  SectionList,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  RefreshControl,
  SafeAreaView, // Thêm SafeAreaView
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import db from '@/services/firestore';
// Import Icon để dùng trong Card (Feather Icons - giả định đã cài)
import Icon from '@react-native-vector-icons/feather'; 

// --- Color Palette mới (Tương tự như phiên bản trước) ---
const COLORS = {
  primary: '#2596be', // Xanh dương trung tính
  background: '#F9FAFB', // Nền sáng
  cardBackground: '#FFFFFF',
  textDark: '#1F2937', // Text tối
  textMuted: '#6B7280', // Text phụ
  border: '#E5E7EB',
  pending: '#F59E0B', // Vàng (pending)
  accepted: '#10B981', // Xanh lá (accepted)
  completed: '#1976d2', // Xanh dương (completed)
  danger: '#EF4444',
};

// --- Utils (Giữ nguyên logic) ---

type Tab = 'pending' | 'today' | 'upcoming';

const toIso = (v: any) => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (v?.toDate) return v.toDate().toISOString();
  try {
    return new Date(v).toISOString();
  } catch {
    return null;
  }
};

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;

const parseMoney = (n?: any) => {
  if (typeof n === 'number') return isFinite(n) ? n : 0;
  if (typeof n === 'string') {
    const v = Number(n.replace(/[^\d.-]/g, ''));
    return isFinite(v) ? v : 0;
  }
  return 0;
};

// --- Component Button Tối giản để thay thế cho Button import (đảm bảo code hoạt động) ---
// Tôi giả định bạn không muốn sử dụng component Button được import, nên tôi thay bằng SimpleButton
const SimpleButton = ({ title, onPress, disabled, style, color = COLORS.primary, outlined = false }: any) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    style={({ pressed }) => [
      styles.simpleBtn,
      { backgroundColor: outlined ? 'transparent' : (disabled ? COLORS.textMuted : color) },
      outlined && { borderColor: color, borderWidth: 1 },
      pressed && !disabled && { opacity: 0.8 },
      style,
    ]}
  >
    <Text style={[styles.simpleBtnText, { color: outlined ? color : '#fff' }]}>
      {title}
    </Text>
  </Pressable>
);
// --- End SimpleButton ---

export default function DoctorScheduleScreen() {
  const { user } = useAuth() as any;
  const navigation = useNavigation();
  const [tab, setTab] = useState<Tab>('pending');
  const [sections, setSections] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [patientsMap, setPatientsMap] = useState<Record<string, any>>({});
  const [roomsMap, setRoomsMap] = useState<Record<string, string>>({});

  // nạp tên phòng 1 lần (Giữ nguyên)
  useEffect(() => {
    (async () => {
      try {
        const snap = await db.collection('rooms').get();
        const m: Record<string, string> = {};
        snap.docs.forEach(d => {
          const data = d.data() as any;
          m[d.id] = data?.name || data?.label || d.id;
        });
        setRoomsMap(m);
      } catch {
        setRoomsMap({});
      }
    })();
  }, []);

  // Logic reload/lọc (GIỮ NGUYÊN LOGIC CŨ CỦA BẠN - VÌ BẠN KHÔNG MUỐN SỬA LOGIC)
  const reload = useCallback(async () => {
    if (!user) return;

    const now = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 30); // 30 ngày tới

    const snap = await db
      .collection('appointments')
      .where('doctorId', '==', user.uid)
      .get();

    let list = snap.docs
      .map(d => ({ id: d.id, ...(d.data() as any) }))
      .map(it => ({ ...it, startISO: toIso(it.start), endISO: toIso(it.end) }))
      .filter(it => !!it.startISO)
      .sort((a, b) => +new Date(a.startISO) - +new Date(b.startISO));

    if (tab === 'pending') {
      // LOGIC CŨ: chỉ lọc lịch pending trong 30 ngày tới
      list = list.filter(
        it =>
          (it.status ?? 'pending') === 'pending' &&
          new Date(it.startISO) <= end,
      );
    } else if (tab === 'today') {
      const s = new Date(now);
      s.setHours(0, 0, 0, 0);
      const e = new Date(now);
      e.setHours(23, 59, 59, 999);
      list = list.filter(it => {
        const t = new Date(it.startISO).getTime();
        return t >= s.getTime() && t <= e.getTime();
      });
    } else {
      // upcoming: đã duyệt trong 30 ngày tới
      list = list.filter(
        it =>
          it.status === 'accepted' &&
          new Date(it.startISO) >= now &&
          new Date(it.startISO) <= end,
      );
    }

    // prefetch tên bệnh nhân (Giữ nguyên)
    const patientIds = Array.from(
      new Set(list.map(x => x.patientId ?? x.meta?.patientId).filter(Boolean)),
    ) as string[];
    if (patientIds.length) {
      try {
        const docs = await Promise.all(
          patientIds.map(id => db.collection('users').doc(id).get()),
        );
        const m: Record<string, any> = {};
        docs.forEach(d => {
          const data = d.data();
          if (data) m[d.id] = data;
        });
        setPatientsMap(prev => ({ ...prev, ...m }));
      } catch {}
    }

    const groups: Record<string, any[]> = {};
    list.forEach(it => {
      const k = dayKey(new Date(it.startISO));
      (groups[k] ||= []).push(it);
    });
    const secs = Object.keys(groups)
      .sort()
      .map(k => ({
        title: k,
        data: groups[k].sort(
          (a, b) => +new Date(a.startISO) - +new Date(b.startISO),
        ),
      }));
    setSections(secs);
  }, [tab, user]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Hành động Chấp nhận (Giữ nguyên)
  async function accept(appointmentId: string) {
    try {
      await db.collection('appointments').doc(appointmentId).update({
        status: 'accepted',
        acceptedAt: firestore.FieldValue.serverTimestamp(),
      });
      reload();
    } catch {
        Alert.alert('Lỗi', 'Không thể chấp nhận lịch hẹn.');
    }
  }

  // Hành động Hoàn thành + Tạo Hóa đơn (Giữ nguyên)
  async function complete(item: any) {
    try {
        // 1) cập nhật appointment
        await db.collection('appointments').doc(item.id).update({
          status: 'completed',
          completedAt: firestore.FieldValue.serverTimestamp(),
        });

        // 2) tạo/cập nhật invoice
        const meta = item?.meta || {};
        const total = parseMoney(meta?.servicePrice ?? item?.price);

        const existing = await db
          .collection('invoices')
          .where('appointmentId', '==', item.id)
          .limit(1)
          .get();

        const payload = {
          appointmentId: item.id,
          doctorId: item.doctorId,
          patientId: item.patientId ?? meta?.patientId ?? null,
          title: meta?.serviceName
            ? `Hóa đơn dịch vụ: ${meta.serviceName}`
            : 'Hóa đơn dịch vụ',
          status: 'unpaid',
          total,
          createdAt: firestore.FieldValue.serverTimestamp(),
        };

        if (!existing.empty) {
          await existing.docs[0].ref.set(payload, { merge: true });
        } else {
          await db.collection('invoices').add(payload);
        }
        Alert.alert('Hoàn thành', 'Lịch hẹn đã hoàn thành và hóa đơn đã được tạo.');
    } catch (e) {
        console.warn('Complete appointment or create invoice failed', e);
        Alert.alert('Lỗi', 'Không thể hoàn thành lịch hẹn và tạo hóa đơn.');
    } finally {
        reload();
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  }, [reload]);

  // Tabs mới với icon và style hiện đại
  const headerTabs = (
    <View style={styles.tabsContainer}>
      {[
        { k: 'pending', label: 'Chờ duyệt', icon: 'clock' },
        { k: 'today', label: 'Hôm nay', icon: 'calendar' },
        { k: 'upcoming', label: 'Sắp tới', icon: 'arrow-right-circle' },
      ].map(t => {
        const active = tab === (t.k as Tab);
        return (
          <Pressable
            key={t.k}
            onPress={() => setTab(t.k as Tab)}
            style={[styles.tab, active && styles.tabActive]}
          >
            <Icon
              name={t.icon as any}
              size={16}
              color={active ? '#fff' : COLORS.textDark}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabText, active && styles.tabTextActive]}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={styles.container}>
        <Text style={styles.pageTitle}>Quản lý Lịch khám</Text>
        
        {headerTabs}

        <SectionList
          sections={sections}
          keyExtractor={i => i.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {new Date(title).toLocaleDateString('vi-VN', {
                  weekday: 'long', // Hiển thị đầy đủ thứ trong tuần
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </Text>
            </View>
          )}
          renderItem={({ item }) => {
            const start = new Date(item.startISO);
            const hhmm = start.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            const service = item.meta?.serviceName ?? 'Lịch khám';
            const patientId = item.patientId ?? item.meta?.patientId ?? '';
            const patientName =
              patientsMap[patientId]?.name || patientId || 'Bệnh nhân';
            const roomName = item.roomId
              ? roomsMap[item.roomId] || item.roomId
              : null;

            const status = item.status ?? 'pending';
            const statusColor =
              status === 'pending'
                ? COLORS.pending
                : status === 'accepted'
                ? COLORS.accepted
                : COLORS.completed;

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                    {/* Thời gian */}
                    <View style={styles.timePill}>
                        <Icon name="clock" size={16} color="#fff" style={{ marginRight: 4 }} />
                        <Text style={styles.timeText}>{hhmm}</Text>
                    </View>

                    {/* Trạng thái */}
                    <View style={[styles.statusPill, { backgroundColor: statusColor + '15' }]}>
                      <Icon
                        name={status === 'pending' ? 'help-circle' : status === 'accepted' ? 'check-circle' : 'activity'}
                        size={12}
                        color={statusColor}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {status === 'pending'
                          ? 'Chờ duyệt'
                          : status === 'accepted'
                          ? 'Đã duyệt'
                          : 'Đã khám'}
                      </Text>
                    </View>
                </View>
                
                {/* Thông tin chính */}
                <Text style={styles.service} numberOfLines={1}>
                  <Icon name="tag" size={14} color={COLORS.textMuted} /> {service}
                </Text>

                <View style={[styles.rowBetween, { marginTop: 4, marginBottom: 12 }]}>
                  <Text style={styles.patient} numberOfLines={1}>
                    <Icon name="user" size={14} color={COLORS.textMuted} /> BN: {patientName}
                  </Text>
                  {roomName ? (
                    <View style={styles.roomPill}>
                      <Icon name="home" size={12} color={COLORS.textMuted} style={{ marginRight: 4 }} />
                      <Text style={styles.roomText}>Phòng {roomName}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Hành động */}
                <View style={styles.actionRow}>
                  {status === 'pending' && (
                    <SimpleButton
                      title="Chấp nhận"
                      onPress={() =>
                        Alert.alert('Chấp nhận', 'Xác nhận chấp nhận lịch này?', [
                          { text: 'Hủy', style: 'cancel' },
                          { text: 'Chấp nhận', onPress: () => accept(item.id), style: 'default' },
                        ])
                      }
                      style={{ flex: 1, marginRight: 8 }}
                      color={COLORS.accepted}
                    />
                  )}
                  {status === 'accepted' && (
                    <SimpleButton title="Hoàn thành" onPress={() => complete(item)} style={{ flex: 1, marginRight: 8 }} color={COLORS.completed} />
                  )}
                  {status === 'completed' && (
                    <SimpleButton title="Đã Hoàn thành" disabled style={{ flex: 1, marginRight: 8 }} />
                  )}

                  <Pressable
                    onPress={() =>
                      (navigation as any).navigate('AppointmentDetail', {
                        appointmentId: item.id,
                      })
                    }
                    style={[styles.simpleBtn, { flex: 1, backgroundColor: COLORS.border }]}
                  >
                    <Text style={[styles.simpleBtnText, { color: COLORS.textDark }]}>Xem chi tiết</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {tab === 'pending'
                ? 'Không có lịch chờ duyệt trong 30 ngày tới'
                : tab === 'today'
                ? 'Hôm nay chưa có lịch'
                : 'Chưa có lịch đã duyệt trong 30 ngày tới'}
            </Text>
          }
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      </View>
    </SafeAreaView>
  );
}

// --- Stylesheet mới và sạch sẽ ---

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, backgroundColor: COLORS.background },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textDark,
    paddingTop: 8,
    marginBottom: 16,
  },

  // Tabs
  tabsContainer: { 
    flexDirection: 'row', 
    gap: 8, 
    marginBottom: 20, 
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: { 
    backgroundColor: COLORS.primary, 
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 5,
  },
  tabText: { fontWeight: '600', color: COLORS.textDark, fontSize: 13 },
  tabTextActive: { color: '#fff' },

  // Section header
  sectionHeader: { paddingVertical: 10, backgroundColor: COLORS.background },
  sectionTitle: { fontWeight: '700', color: COLORS.textDark, fontSize: 16 },

  // Card
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Time & Status Pills
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  timeText: { fontSize: 16, fontWeight: '800', color: '#fff' },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: { fontSize: 12, fontWeight: '700' },

  // Info
  service: { 
    marginTop: 4, 
    color: COLORS.textDark, 
    fontWeight: '700', 
    fontSize: 15,
  },
  patient: { 
    color: COLORS.textMuted, 
    fontWeight: '600', 
    flex: 1, 
    marginRight: 8, 
    fontSize: 13 
  },

  roomPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roomText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 12 },

  // Action Buttons
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 8,
  },
  simpleBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simpleBtnText: {
    fontWeight: '700',
    fontSize: 14,
  },

  empty: { textAlign: 'center', color: COLORS.textMuted, marginTop: 28, fontSize: 15 },
});