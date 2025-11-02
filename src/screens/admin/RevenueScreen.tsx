// screens/RevenueScreen.tsx
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
const CHART_H = 220;

// --- helpers
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
  // cho phép "450000", "450.000đ", "450,000", v.v...
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
  const w = x.getDay(); // 0..6 (CN..T7)
  x.setHours(0, 0, 0, 0);
  // tuần bắt đầu Thứ 2
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

export default function RevenueScreen() {
  const { user } = useAuth() as any;
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [tab, setTab] = useState<RangeTab>('day');
  const [rows, setRows] = useState<
    { id: string; startISO: string; amount: number }[]
  >([]);

  // Load tất cả appointments của bác sĩ này và lọc completed ở client
  useEffect(() => {
    (async () => {
      if (!user) return;
      setLoading(true);
      try {
        const snap = await db.collection('appointments').get();

        const list = snap.docs
          .map(d => ({ id: d.id, ...(d.data() as any) }))
          .map(it => {
            const startISO = toIso(it.start);
            const amount = parseMoney(it?.meta?.servicePrice ?? it?.price ?? 0);
            const status = String(it?.status ?? '')
              .trim()
              .toLowerCase();
            return { id: it.id, startISO, amount, status };
          })
          .filter(x => !!x.startISO && x.status === 'completed')
          .map(x => ({ id: x.id, startISO: x.startISO!, amount: x.amount }));

        // Debug nhanh dữ liệu (nếu cần):
        // console.log('[Revenue rows]', list.slice(0, 3));

        setRows(list);
      } catch (e) {
        console.warn('load revenue failed', e);
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // Tính tổng theo ngày/tuần/tháng/năm dựa trên selectedDate
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

    let d = 0,
      w = 0,
      m = 0,
      y = 0;
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

  // Chuẩn bị data cho biểu đồ theo tab
  const chart = useMemo(() => {
    const cur = selectedDate;

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
        labels,
        datasets: [{ data: vals }],
        total: daySum,
        unit: '₫',
        title: `Doanh thu ${ymd(cur)}`,
      };
    }

    if (tab === 'week') {
      const s = startOfWeek(cur);
      const labels: string[] = [];
      const vals: number[] = [];
      const weekLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
      for (let i = 0; i < 7; i++) {
        const d = new Date(s);
        d.setDate(s.getDate() + i);
        labels.push(weekLabels[i]);
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
        title: `Doanh thu tuần của ${ymd(cur)}`,
      };
    }

    if (tab === 'month') {
      const s = startOfMonth(cur);
      const days = endOfMonth(cur).getDate();
      const labels: string[] = [];
      const vals: number[] = [];
      for (let i = 0; i < days; i++) {
        const d = new Date(s);
        d.setDate(s.getDate() + i);
        labels.push(String(i + 1));
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

    // year
    const labels = [
      'T1',
      'T2',
      'T3',
      'T4',
      'T5',
      'T6',
      'T7',
      'T8',
      'T9',
      'T10',
      'T11',
      'T12',
    ];
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

  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(25, 118, 210, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(15, 23, 42, ${opacity})`,
    propsForDots: { r: '3' },
    propsForBackgroundLines: { strokeDasharray: '' },
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      <Text style={styles.title}>Thống kê doanh thu</Text>
      {/* Date + Tabs */}
      <View style={styles.rowBetween}>
        <Pressable
          onPress={() => (DateTimePicker ? setShowPicker(true) : null)}
          style={styles.dateBtn}
        >
          <Text style={styles.dateText}>{ymd(selectedDate)}</Text>
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
                  {k === 'day'
                    ? 'Ngày'
                    : k === 'week'
                    ? 'Tuần'
                    : k === 'month'
                    ? 'Tháng'
                    : 'Năm'}
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
          onChange={(e: any, d?: Date) => {
            if (Platform.OS === 'android') setShowPicker(false);
            if (e?.type === 'dismissed') return;
            if (d) setSelectedDate(d);
          }}
        />
      )}

      {/* Summary cards */}
      <View style={styles.grid}>
        <Stat label="Hôm nay" value={daySum} />
        <Stat label="Tuần này" value={weekSum} />
        <Stat label="Tháng này" value={monthSum} />
        <Stat label="Năm nay" value={yearSum} />
      </View>

      {/* Chart */}
      <Text style={styles.chartTitle}>{chart.title}</Text>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 16 }} />
      ) : tab === 'day' || tab === 'week' ? (
        <BarChart
          width={CHART_W}
          height={CHART_H}
          data={chart as any}
          chartConfig={chartConfig}
          fromZero
          yAxisLabel=""
          yAxisSuffix={chart.unit || ''}
          style={styles.chart}
          showBarTops={false}
        />
      ) : (
        <LineChart
          width={CHART_W}
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

      <View style={{ alignItems: 'center', marginTop: 8 }}>
        <Text style={{ color: '#334155', fontWeight: '700' }}>
          Tổng: {Number(chart.total || 0).toLocaleString()}₫
        </Text>
      </View>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>
        {Number(value || 0).toLocaleString()}₫
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  title: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  sub: { color: '#6B7280', marginTop: 4, marginBottom: 10, fontSize: 12.5 },

  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateText: { fontWeight: '700', color: '#0F172A' },

  tabs: { flexDirection: 'row', gap: 8 },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#EEF2F7',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabActive: { backgroundColor: '#1976d2', borderColor: '#1976d2' },
  tabText: { fontWeight: '700', color: '#0F172A' },
  tabTextActive: { color: '#fff' },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
    marginBottom: 6,
  },
  stat: {
    width: (SCREEN.width - 16 * 2 - 10) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statLabel: { color: '#64748B', fontWeight: '600' },
  statValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },

  chartTitle: { marginTop: 10, fontWeight: '700', color: '#0F172A' },
  chart: { marginTop: 8, borderRadius: 12 },
});
