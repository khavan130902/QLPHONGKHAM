import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  Dimensions,
  ScrollView,
} from 'react-native';
// Sử dụng SafeAreaView để đảm bảo nội dung không bị che bởi notch/status bar
import { SafeAreaView } from 'react-native-safe-area-context'; 
import { useAuth } from '@/context/AuthContext';
import db from '@/services/firestore';

// @ts-ignore (optional native datepicker)
let DateTimePicker: any = null;
try {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
} catch (_) {}

import { BarChart, LineChart } from 'react-native-chart-kit';

type RangeTab = 'day' | 'week' | 'month' | 'year';

const SCREEN = Dimensions.get('window');
const CHART_W = SCREEN.width - 32; // padding 16 * 2
const CHART_H = 240; // Tăng chiều cao biểu đồ lên một chút

// --- BẢNG MÀU MỚI ---
const COLORS = {
  primary: '#2596be', // Xanh dương sáng - Cho Tabs Active, Chart Line
  secondary: '#28A745', // Xanh lá - Có thể dùng cho Stat Value hoặc biểu đồ
  background: '#F8F9FA', // Nền chung của màn hình
  cardBackground: '#FFFFFF', // Nền Card/Item/Stat
  textPrimary: '#343A40', // Chữ đậm chính
  textSecondary: '#6C757D', // Chữ phụ/Label
  divider: '#E9ECEF', // Đường kẻ/Border
  dateButtonBorder: '#CED4DA',
};


// --- helpers (Giữ nguyên các hàm helper) ---
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
const parseMoney = (val: any) => {
  const s = String(val ?? '')
    .replace(/[^\d.-]/g, '')
    .replace(/,/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;

const startOfWeek = (d: Date) => {
  const x = new Date(d);
  const w = x.getDay(); 
  x.setHours(0, 0, 0, 0);
  const offset = w === 0 ? -6 : 1 - w;
  x.setDate(x.getDate() + offset);
  return x;
};
const endOfWeek = (d: Date) => {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
};
const startOfMonth = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
const endOfMonth = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
const startOfYear = (d: Date) => new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0);
const endOfYear = (d: Date) =>
  new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);
// --- end helpers ---


export default function RevenueScreen() {
  const { user } = useAuth() as any;
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [tab, setTab] = useState<RangeTab>('day');
  const [rows, setRows] = useState<
    { id: string; startISO: string; amount: number }[]
  >([]);

  // ... (Giữ nguyên logic load dữ liệu và tính toán Sums)
  useEffect(() => {
    (async () => {
      if (!user) return;
      setLoading(true);
      try {
        // Tối ưu: Chỉ tải dữ liệu của bác sĩ hiện tại (nếu cần) và chỉ những cuộc hẹn có thể tạo doanh thu
        // Hiện tại: Tải tất cả và lọc ở client
        const snap = await db.collection('appointments').get(); 

        const list = snap.docs
          .map(d => ({ id: d.id, ...(d.data() as any) }))
          .map(it => {
            const startISO = toIso(it.start);
            const amount = parseMoney(it?.meta?.servicePrice ?? it?.price ?? 0);
            const status = String(it?.status ?? '')
              .trim()
              .toLowerCase();
            // Lọc các cuộc hẹn đã "completed" (hoàn thành)
            return { id: it.id, startISO, amount, status };
          })
          .filter(x => !!x.startISO && x.status === 'completed')
          .map(x => ({ id: x.id, startISO: x.startISO!, amount: x.amount }));

        setRows(list);
      } catch (e) {
        console.warn('load revenue failed', e);
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const { daySum, weekSum, monthSum, yearSum } = useMemo(() => {
    const dayS = new Date(selectedDate);
    dayS.setHours(0, 0, 0, 0);
    const dayE = new Date(selectedDate);
    dayE.setHours(23, 59, 59, 999);

    const wS = startOfWeek(selectedDate);
    const wE = endOfWeek(selectedDate);

    const mS = startOfMonth(selectedDate);
    const mE = endOfMonth(selectedDate);

    const yS = startOfYear(selectedDate);
    const yE = endOfYear(selectedDate);

    let d = 0, w = 0, m = 0, y = 0;
    rows.forEach(r => {
      const t = new Date(r.startISO).getTime();
      const amt = Number(r.amount) || 0;
      if (t >= dayS.getTime() && t <= dayE.getTime()) d += amt;
      if (t >= wS.getTime() && t <= wE.getTime()) w += amt;
      if (t >= mS.getTime() && t <= mE.getTime()) m += amt;
      if (t >= yS.getTime() && t <= yE.getTime()) y += amt;
    });
    return { daySum: d, weekSum: w, monthSum: m, yearSum: y };
  }, [rows, selectedDate]);

  const chart = useMemo(() => {
    const cur = selectedDate;

    // --- DAY CHART ---
    if (tab === 'day') {
      const labels: string[] = Array.from({ length: 24 }, (_, i) => `${i}`);
      const vals = new Array(24).fill(0);
      const s = new Date(cur);
      s.setHours(0, 0, 0, 0);
      const e = new Date(cur);
      e.setHours(23, 59, 59, 999);
      rows.forEach(r => {
        const t = new Date(r.startISO);
        if (t >= s && t <= e) vals[t.getHours()] += r.amount;
      });
      return {
        labels: labels.filter((_, i) => i % 4 === 0).map(l => `${l}h`), // Chỉ hiển thị 4h, 8h, 12h, ...
        datasets: [{ data: vals.filter((_, i) => i % 4 === 0) }],
        total: daySum,
        unit: '₫',
        title: `Doanh thu trong ngày ${ymd(cur)}`,
      };
    }

    // --- WEEK CHART ---
    if (tab === 'week') {
      const s = startOfWeek(cur);
      const labels: string[] = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
      const vals: number[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(s);
        d.setDate(s.getDate() + i);
        const ds = new Date(d);
        ds.setHours(0, 0, 0, 0);
        const de = new Date(d);
        de.setHours(23, 59, 59, 999);
        const sum = rows.reduce((acc, r) => {
          const t = new Date(r.startISO);
          return acc + (t >= ds && t <= de ? r.amount : 0);
        }, 0);
        vals.push(sum);
      }
      return {
        labels,
        datasets: [{ data: vals }],
        total: weekSum,
        unit: '₫',
        title: `Doanh thu tuần (${ymd(s)} - ${ymd(endOfWeek(cur))})`,
      };
    }

    // --- MONTH CHART ---
    if (tab === 'month') {
      const s = startOfMonth(cur);
      const days = endOfMonth(cur).getDate();
      const labels: string[] = [];
      const vals: number[] = [];
      for (let i = 0; i < days; i++) {
        const d = new Date(s);
        d.setDate(s.getDate() + i);
        if (i % 5 === 0) { // Chỉ hiển thị ngày 1, 6, 11, ...
            labels.push(String(i + 1));
        } else {
            labels.push('');
        }
        
        const ds = new Date(d);
        ds.setHours(0, 0, 0, 0);
        const de = new Date(d);
        de.setHours(23, 59, 59, 999);
        const sum = rows.reduce((acc, r) => {
          const t = new Date(r.startISO);
          return acc + (t >= ds && t <= de ? r.amount : 0);
        }, 0);
        vals.push(sum);
      }
      return {
        labels,
        datasets: [{ data: vals }],
        total: monthSum,
        unit: '₫',
        title: `Doanh thu tháng ${cur.getMonth() + 1}/${cur.getFullYear()}`,
      };
    }

    // --- YEAR CHART ---
    const labels = [ 'T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12', ];
    const vals: number[] = [];
    for (let m = 0; m < 12; m++) {
      const ms = new Date(cur.getFullYear(), m, 1, 0, 0, 0, 0);
      const me = new Date(cur.getFullYear(), m + 1, 0, 23, 59, 59, 999);
      const sum = rows.reduce((acc, r) => {
        const t = new Date(r.startISO);
        return acc + (t >= ms && t <= me ? r.amount : 0);
      }, 0);
      vals.push(sum);
    }
    return {
      labels,
      datasets: [{ data: vals }],
      total: yearSum,
      unit: '₫',
      title: `Doanh thu năm ${cur.getFullYear()}`,
    };
  }, [tab, rows, selectedDate, daySum, weekSum, monthSum, yearSum]);

  // Cấu hình Biểu đồ (Sử dụng màu Primary mới)
  const chartConfig = {
    backgroundGradientFrom: COLORS.cardBackground,
    backgroundGradientTo: COLORS.cardBackground,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`, // Màu Primary mới
    labelColor: (opacity = 1) => `rgba(52, 58, 64, ${opacity})`, // Màu chữ đậm
    propsForDots: { r: '3', fill: COLORS.primary },
    propsForBackgroundLines: { strokeDasharray: '', stroke: COLORS.divider },
    barPercentage: 0.5,
  };

  const handleDateChange = (e: any, d?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (e?.type === 'dismissed') return;
    if (d) setSelectedDate(d);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <Text style={styles.title}>Thống kê Doanh thu</Text>
        
        {/* Date Picker + Tabs */}
        <View style={[styles.rowBetween, { marginTop: 12 }]}>
          <Pressable
            onPress={() => (DateTimePicker ? setShowPicker(true) : null)}
            style={styles.dateBtn}
          >
            <Text style={styles.dateText}>📅 {ymd(selectedDate)}</Text>
          </Pressable>
          <View style={styles.tabs}>
            {(['day', 'week', 'month', 'year'] as RangeTab[]).map(k => {
              const active = tab === k;
              return (
                <Pressable
                  key={k}
                  onPress={() => setTab(k)}
                  style={[styles.tab, active && styles.tabActive]}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>
                    {k === 'day' ? 'Ngày' : k === 'week' ? 'Tuần' : k === 'month' ? 'Tháng' : 'Năm'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {showPicker && DateTimePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
            onChange={handleDateChange}
          />
        )}

        {/* Summary cards */}
        <View style={styles.grid}>
          <Stat label="Hôm nay" value={daySum} color={COLORS.secondary} />
          <Stat label="Tuần này" value={weekSum} color={COLORS.secondary} />
          <Stat label="Tháng này" value={monthSum} color={COLORS.secondary} />
          <Stat label="Năm nay" value={yearSum} color={COLORS.secondary} />
        </View>

        {/* Chart */}
        <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>{chart.title}</Text>
            {loading ? (
                <ActivityIndicator style={{ marginTop: 16 }} size="large" color={COLORS.primary} />
            ) : chart.datasets[0].data.length === 0 ? (
                <View style={styles.noDataContainer}>
                    <Text style={styles.noDataText}>Không có dữ liệu doanh thu trong kỳ này.</Text>
                </View>
            ) : tab === 'day' || tab === 'week' ? (
                <BarChart
                    width={CHART_W - 20} // Trừ thêm padding của chartCard
                    height={CHART_H}
                    data={chart as any}
                    chartConfig={chartConfig}
                    fromZero
                    yAxisLabel=""
                    yAxisSuffix={chart.unit || ''}
                    style={styles.chart}
                />
            ) : (
                <LineChart
                    width={CHART_W - 20} // Trừ thêm padding của chartCard
                    height={CHART_H}
                    data={chart as any}
                    chartConfig={chartConfig}
                    bezier
                    fromZero
                    yAxisLabel=""
                    yAxisSuffix={chart.unit || ''}
                    style={styles.chart}
                />
            )}
            
            <View style={styles.chartSummary}>
                <Text style={styles.chartTotalText}>
                    Tổng Doanh thu: <Text style={{ color: COLORS.primary }}>{Number(chart.total || 0).toLocaleString()}₫</Text>
                </Text>
            </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, color }: { label: string; value: number, color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: color }]}>
        {Number(value || 0).toLocaleString()}₫
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background, 
    paddingHorizontal: 16,
  },
  title: { 
    fontSize: 24, 
    fontWeight: '800', 
    color: COLORS.textPrimary,
    marginBottom: 10,
    marginTop: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  
  // --- DATE BUTTON ---
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.dateButtonBorder,
    // Shadow nhẹ cho nút bấm
    ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
        android: { elevation: 2 },
    }),
  },
  dateText: { fontWeight: '700', color: COLORS.textPrimary },

  // --- TABS ---
  tabs: { 
    flexDirection: 'row', 
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.cardBackground,
  },
  tabActive: { 
    backgroundColor: COLORS.primary, 
  },
  tabText: { fontWeight: '600', color: COLORS.textPrimary, fontSize: 13 },
  tabTextActive: { color: COLORS.cardBackground },

  // --- STATS GRID ---
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 15,
    marginBottom: 10,
  },
  stat: {
    width: (SCREEN.width - 32 - 10) / 2, // 32 = 16*2 padding, 10 = gap
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.divider,
    // Shadow nhẹ
    ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
        android: { elevation: 1 },
    }),
  },
  statLabel: { color: COLORS.textSecondary, fontWeight: '500', fontSize: 13 },
  statValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '800',
  },

  // --- CHART ---
  chartCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 10, // Padding cho nội dung biểu đồ
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.divider,
    // Shadow nổi bật hơn
    ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 5 },
        android: { elevation: 4 },
    }),
  },
  chartTitle: { 
    fontWeight: '700', 
    color: COLORS.textPrimary, 
    fontSize: 16,
    marginBottom: 8,
    paddingHorizontal: 6,
  },
  chart: { 
    borderRadius: 12,
    alignSelf: 'center',
  },
  chartSummary: { 
    alignItems: 'center', 
    marginTop: 10, 
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: 10,
  },
  chartTotalText: { 
    color: COLORS.textPrimary, 
    fontWeight: '700', 
    fontSize: 16,
  },
  noDataContainer: {
    height: CHART_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    color: COLORS.textSecondary,
    fontSize: 15,
  }
});