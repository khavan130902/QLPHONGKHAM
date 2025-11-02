import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import safeAlert from '@/utils/safeAlert';
import Button from '@/components/Button';
import { createBooking, createBookingWithSlot } from '@/services/booking';
import { useAuth } from '@/context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import db from '@/services/firestore';

export default function BookingConfirm({ route }: any) {
  const { doctorId, date, time } = route?.params || {};
  const { user } = useAuth() as any;
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [doctor, setDoctor] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);

  async function onConfirm() {
    if (!user) return safeAlert('Cần đăng nhập', 'Bạn cần đăng nhập');
    setLoading(true);
    try {
      const patientIdToUse = route?.params?.patientId || user.uid;
      // if slotId provided, use atomic slot booking
      if (route?.params?.slotId) {
        const slotId = route.params.slotId as string;
        const id = await createBookingWithSlot(slotId, {
          patientId: patientIdToUse,
          created_by: 'patient',
          created_by_user: user.uid,
        });
        safeAlert('Thành công', 'Đặt lịch thành công: ' + id);
        navigation.goBack();
        return;
      }
      const start = new Date(`${date}T${time}:00`).toISOString();
      const endDate = new Date(`${date}T${time}:00`);
      endDate.setMinutes(endDate.getMinutes() + 30);
      const end = endDate.toISOString();
      const id = await createBooking({
        doctorId,
        patientId: patientIdToUse,
        start,
        end,
      });
      safeAlert('Thành công', 'Đặt lịch thành công: ' + id);
      navigation.goBack();
    } catch (err: any) {
      safeAlert('Lỗi', 'Đặt lịch thất bại: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  }

  // load doctor and patient display names
  React.useEffect(() => {
    (async () => {
      try {
        if (doctorId) {
          const d = await db.collection('users').doc(doctorId).get();
          setDoctor(d.data());
        }
        if (user) {
          const p = await db.collection('users').doc(user.uid).get();
          setPatient(p.data());
        }
      } catch (err) {
        console.warn('load confirm meta', err);
      }
    })();
  }, [doctorId, user]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Xác nhận đặt lịch</Text>
      <Text>Bác sĩ: {doctor?.name || doctorId}</Text>
      <Text>Bệnh nhân: {patient?.name || user?.uid}</Text>
      <Text>Ngày: {date}</Text>
      <Text>Giờ: {time}</Text>
      <View style={{ height: 16 }} />
      <Button title="Xác nhận" onPress={onConfirm} disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
});
