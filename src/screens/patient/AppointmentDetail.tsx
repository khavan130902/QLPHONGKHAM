import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import db from '@/services/firestore';
import { getRecordByAppointment } from '@/services/medicalRecords';
import Avatar from '@/components/Avatar';
import safeAlert from '@/utils/safeAlert';

export default function AppointmentDetail({ route }: any) {
  const { id } = route?.params || {};
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [appointment, setAppointment] = useState<any>(null);
  const [doctor, setDoctor] = useState<any>(null);
  const [record, setRecord] = useState<any>(null);
  const [specialtiesList, setSpecialtiesList] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      if (!id) return;
      setLoading(true);
      try {
        const doc = await db.collection('appointments').doc(id).get();
        const data =
          doc.data && typeof doc.data === 'function' ? doc.data() : doc.data();
        setAppointment({ id: doc.id, ...data });
        if (data?.doctorId) {
          const d = await db.collection('users').doc(data.doctorId).get();
          setDoctor(
            d.data && typeof d.data === 'function' ? d.data() : d.data(),
          );
        }
        try {
          const snap2 = await db
            .collection('specialties')
            .orderBy('name')
            .get();
          setSpecialtiesList(
            snap2.docs.map(d => ({ id: d.id, ...(d.data() as any) })),
          );
        } catch (e) {
          console.warn('load specialties', e);
        }
        const r = await getRecordByAppointment(id);
        setRecord(r);
      } catch (e) {
        console.warn('load appointment detail', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (!id)
    return (
      <View style={styles.container}>
        <Text>Không có dữ liệu</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : appointment ? (
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Avatar
              uri={doctor?.photoURL}
              name={doctor?.name || 'Bác sĩ'}
              size={64}
            />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.title}>{doctor?.name || 'Bác sĩ'}</Text>
              <Text style={styles.sub}>
                {(specialtiesList.find(s => s.id === doctor?.specialty_id)
                  ?.name as string) || ''}
              </Text>
            </View>
          </View>

          <View style={{ height: 12 }} />
          <Text style={{ fontWeight: '700' }}>Ngày / Giờ</Text>
          <Text style={{ color: '#444', marginTop: 6 }}>
            {new Date(appointment.start).toLocaleString()}
          </Text>

          <View style={{ height: 12 }} />
          <Text style={{ fontWeight: '700' }}>Tình trạng</Text>
          <Text style={{ color: '#444', marginTop: 6 }}>
            {appointment.status || 'pending'}
          </Text>

          <View style={{ height: 16 }} />
          {record ? (
            <TouchableOpacity
              onPress={() =>
                (navigation as any).navigate('MedicalRecordDetail', {
                  id: record.id,
                })
              }
              style={{
                padding: 12,
                backgroundColor: '#fff',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#eee',
              }}
            >
              <Text style={{ fontWeight: '700' }}>Xem hồ sơ khám</Text>
              <Text style={{ color: '#666', marginTop: 6 }}>
                {record.diagnosis || 'Xem chi tiết hồ sơ'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() =>
                safeAlert(
                  'Chưa có hồ sơ',
                  'Bác sĩ chưa lưu hồ sơ cho lịch hẹn này',
                )
              }
              style={{
                padding: 12,
                backgroundColor: '#fff',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#eee',
              }}
            >
              <Text style={{ fontWeight: '700' }}>Chưa có hồ sơ khám</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 16 }} />
          <TouchableOpacity
            onPress={() => safeAlert('Hủy', 'Chức năng hủy sẽ được triển khai')}
            style={{ padding: 12 }}
          >
            <Text style={{ color: '#B91C1C' }}>Hủy lịch</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text>Không tìm thấy lịch hẹn</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '700' },
  sub: { color: '#6B7280', marginTop: 4 },
});
