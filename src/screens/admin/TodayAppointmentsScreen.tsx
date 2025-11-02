import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import db from '@/services/firestore';
import safeAlert from '@/utils/safeAlert';
import Button from '@/components/Button';

type Appt = {
  id: string;
  doctorId?: string;
  patientId?: string;
  start?: string;
  end?: string;
  status?: string;
  [key: string]: any;
};

export default function TodayAppointmentsScreen() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Appt[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});

  useEffect(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const startISO = start.toISOString();
    const endISO = end.toISOString();

    const q = db
      .collection('appointments')
      .where('start', '>=', startISO)
      .where('start', '<=', endISO)
      .orderBy('start', 'asc');

    const unsub = q.onSnapshot(
      snap => {
        const arr: Appt[] = snap.docs.map(d => ({
          id: d.id,
          ...(d.data() as any),
        }));
        setItems(arr);
        // prefetch user docs for doctorId and patientId
        const ids = new Set<string>();
        arr.forEach(a => {
          if (a.doctorId) ids.add(a.doctorId);
          if (a.patientId) ids.add(a.patientId);
        });
        if (ids.size === 0) {
          setLoading(false);
          return;
        }
        Promise.all(
          Array.from(ids).map(id => db.collection('users').doc(id).get()),
        )
          .then(docs => {
            const m: Record<string, any> = {};
            docs.forEach(d => {
              const dd = d.data();
              if (dd) m[d.id] = dd;
            });
            setUsersMap(m);
          })
          .catch(err => console.warn('prefetch users failed', err))
          .finally(() => setLoading(false));
      },
      err => {
        console.warn('today appts snapshot', err);
        safeAlert('Lỗi', 'Không tải được lịch hôm nay');
        setLoading(false);
      },
    );

    return () => unsub();
  }, []);

  async function updateStatus(id: string, status: string) {
    try {
      await db.collection('appointments').doc(id).update({ status });
      safeAlert('Thành công', 'Cập nhật trạng thái');
    } catch (err) {
      console.warn('update status', err);
      safeAlert('Lỗi', 'Không thể cập nhật trạng thái');
    }
  }

  function confirmAction(id: string) {
    Alert.alert('Xác nhận', 'Xác nhận lịch này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xác nhận', onPress: () => updateStatus(id, 'confirmed') },
    ]);
  }

  function cancelAction(id: string) {
    Alert.alert('Xác nhận', 'Hủy lịch này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => updateStatus(id, 'cancelled'),
      },
    ]);
  }

  function completeAction(id: string) {
    Alert.alert('Xác nhận', 'Đánh dấu hoàn thành?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Hoàn thành', onPress: () => updateStatus(id, 'completed') },
    ]);
  }

  function renderItem({ item }: { item: Appt }) {
    const doctor = usersMap[item.doctorId || ''];
    const patient = usersMap[item.patientId || ''];
    const time = item.start ? new Date(item.start).toLocaleTimeString() : '';
    return (
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700' }}>
            {time} • {doctor?.name || item.doctorId}
          </Text>
          <Text>
            {patient?.name || item.patientId}{' '}
            {patient?.phoneNumber ? ' • ' + patient.phoneNumber : ''}
          </Text>
          <Text style={{ color: '#666' }}>
            Trạng thái: {item.status || 'pending'}
          </Text>
        </View>
        <View style={{ justifyContent: 'center' }}>
          <Button title="Xác nhận" onPress={() => confirmAction(item.id)} />
          <View style={{ height: 8 }} />
          <Button title="Hủy" onPress={() => cancelAction(item.id)} />
          <View style={{ height: 8 }} />
          <Button title="Hoàn thành" onPress={() => completeAction(item.id)} />
        </View>
      </View>
    );
  }

  if (loading)
    return (
      <View
        style={[
          styles.container,
          { justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <ActivityIndicator />
      </View>
    );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lịch khám hôm nay</Text>
      {items.length === 0 ? (
        <Text style={{ color: '#666' }}>Không có lịch hôm nay</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  row: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    elevation: 2,
  },
});
