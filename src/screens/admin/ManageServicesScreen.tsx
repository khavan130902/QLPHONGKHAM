import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
  Switch,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import db from '@/services/firestore';
import Input from '@/components/Input';
import Button from '@/components/Button';
import safeAlert from '@/utils/safeAlert';

type Specialty = { id: string; name: string };
type ServiceType = {
  id: string;
  name: string;
  code?: string | null;
  base_price?: number | null;
  duration_min?: number | null;
  description?: string | null;
  is_active?: boolean;
  specialty_id: string;
  created_at?: string;
  updated_at?: string;
};

export default function ManageServicesScreen() {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [specialtyOpen, setSpecialtyOpen] = useState(false);
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<string | null>(
    null,
  );

  const [services, setServices] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(false);
  const unsubRef = useRef<null | (() => void)>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceType | null>(null);

  // form fields
  const [fName, setFName] = useState('');
  const [fCode, setFCode] = useState('');
  const [fPrice, setFPrice] = useState('');
  const [fDuration, setFDuration] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [fActive, setFActive] = useState(true);

  const selectedSpecialty = useMemo(
    () => specialties.find(s => s.id === selectedSpecialtyId) || null,
    [specialties, selectedSpecialtyId],
  );

  // Load specialties once
  useEffect(() => {
    (async () => {
      try {
        const snap = await db.collection('specialties').orderBy('name').get();
        const list = snap.docs.map(d => ({
          id: d.id,
          ...(d.data() as any),
        })) as Specialty[];
        setSpecialties(list);
      } catch (e) {
        console.error('[specialties] load error:', e);
        safeAlert('Lỗi', 'Không tải được danh sách chuyên khoa');
      }
    })();
  }, []);

  // Realtime services of selected specialty
  useEffect(() => {
    // cleanup previous listener
    if (unsubRef.current) unsubRef.current();

    if (!selectedSpecialtyId) {
      setServices([]);
      return;
    }
    setLoading(true);
    try {
      // Avoid composite index requirement by querying by equality only
      // then sorting client-side. This prevents Firestore "requires an index" errors
      // when the project doesn't have the composite index created.
      const q = db
        .collection('service_types')
        .where('specialty_id', '==', selectedSpecialtyId);

      const unsub = q.onSnapshot(
        snap => {
          const list = snap.docs.map(d => ({
            id: d.id,
            ...(d.data() as any),
          })) as ServiceType[];
          // sort by name client-side to preserve alphabetical order
          list.sort((a, b) => {
            const an = (a.name || '').toString();
            const bn = (b.name || '').toString();
            return an.localeCompare(bn);
          });
          setServices(list);
          setLoading(false);
        },
        err => {
          console.error('[service_types] snapshot error:', err);
          setLoading(false);
          safeAlert(
            'Lỗi',
            'Không tải được dịch vụ. Kiểm tra rules/collection.',
          );
        },
      );
      unsubRef.current = unsub;
    } catch (err) {
      console.error('[service_types] attach listener failed:', err);
      setLoading(false);
      safeAlert('Lỗi', 'Không thể lắng nghe dữ liệu dịch vụ.');
    }
    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, [selectedSpecialtyId]);

  function resetForm() {
    setEditing(null);
    setFName('');
    setFCode('');
    setFPrice('');
    setFDuration('');
    setFDesc('');
    setFActive(true);
  }

  function openCreate() {
    if (!selectedSpecialtyId) {
      safeAlert(
        'Thiếu thông tin',
        'Hãy chọn chuyên khoa trước khi thêm dịch vụ.',
      );
      return;
    }
    resetForm();
    setFormOpen(true);
  }

  function openEdit(item: ServiceType) {
    setEditing(item);
    setFName(item.name || '');
    setFCode(item.code || '');
    setFPrice(item.base_price != null ? String(item.base_price) : '');
    setFDuration(item.duration_min != null ? String(item.duration_min) : '');
    setFDesc(item.description || '');
    setFActive(item.is_active ?? true);
    setFormOpen(true);
  }

  async function saveService() {
    if (!selectedSpecialtyId)
      return safeAlert('Thiếu thông tin', 'Chưa chọn chuyên khoa.');
    if (!fName.trim())
      return safeAlert('Thiếu thông tin', 'Tên dịch vụ không được để trống.');

    const priceNum = fPrice.trim() === '' ? null : Number(fPrice);
    const durNum = fDuration.trim() === '' ? null : Number(fDuration);

    if (priceNum != null && (Number.isNaN(priceNum) || priceNum < 0))
      return safeAlert('Sai dữ liệu', 'Giá phải là số không âm.');
    if (durNum != null && (Number.isNaN(durNum) || durNum <= 0))
      return safeAlert('Sai dữ liệu', 'Thời lượng (phút) phải là số dương.');

    const payload: Partial<ServiceType> & Record<string, any> = {
      name: fName.trim(),
      code: fCode.trim() || null,
      base_price: priceNum,
      duration_min: durNum,
      description: fDesc.trim() || null,
      is_active: !!fActive,
      specialty_id: selectedSpecialtyId,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editing) {
        await db
          .collection('service_types')
          .doc(editing.id)
          .set(payload, { merge: true });
        safeAlert('Thành công', 'Đã cập nhật dịch vụ.');
      } else {
        await db.collection('service_types').add({
          ...payload,
          created_at: new Date().toISOString(),
        });
        safeAlert('Thành công', 'Đã tạo dịch vụ mới.');
      }
      setFormOpen(false);
      resetForm();
      // Realtime listener sẽ tự cập nhật danh sách
    } catch (e) {
      console.error('[service_types] save error:', e);
      safeAlert('Lỗi', 'Không lưu được dịch vụ. Kiểm tra quyền (rules).');
    }
  }

  function deleteService(id: string) {
    safeAlert('Xác nhận', 'Xóa dịch vụ này? Hành động không thể hoàn tác.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await db.collection('service_types').doc(id).delete();
            safeAlert('Đã xóa', 'Dịch vụ đã được xóa.');
            // Realtime listener tự cập nhật
          } catch (e) {
            console.error('[service_types] delete error:', e);
            safeAlert('Lỗi', 'Không xóa được dịch vụ. Kiểm tra quyền (rules).');
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quản lý loại dịch vụ</Text>
      <Text style={{ color: '#666', marginBottom: 12 }}>
        Thêm / sửa / xóa dịch vụ khám bệnh theo chuyên khoa.
      </Text>

      {/* Dropdown chuyên khoa */}
      <Text style={styles.sectionTitle}>Chọn chuyên khoa</Text>
      <TouchableOpacity
        style={styles.dropdownHeader}
        onPress={() => setSpecialtyOpen(v => !v)}
      >
        <Text style={{ fontWeight: '600' }}>
          {selectedSpecialty ? selectedSpecialty.name : 'Chọn chuyên khoa'}
        </Text>
        <Text>{specialtyOpen ? '▴' : '▾'}</Text>
      </TouchableOpacity>

      {specialtyOpen && (
        <View style={styles.dropdownBody}>
          <ScrollView style={{ maxHeight: 280 }}>
            {specialties.map(s => (
              <TouchableOpacity
                key={s.id}
                style={styles.dropdownItem}
                onPress={() => {
                  setSelectedSpecialtyId(s.id);
                  setSpecialtyOpen(false);
                }}
              >
                <Text>{s.name}</Text>
              </TouchableOpacity>
            ))}
            {specialties.length === 0 && (
              <Text style={{ color: '#666', padding: 8 }}>
                Chưa có chuyên khoa.
              </Text>
            )}
          </ScrollView>
        </View>
      )}

      {/* Header + nút thêm */}
      <View
        style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center' }}
      >
        <Text style={[styles.sectionTitle, { flex: 1 }]}>
          Dịch vụ {selectedSpecialty ? `• ${selectedSpecialty.name}` : ''}
        </Text>
        <Button
          title="Thêm dịch vụ"
          onPress={openCreate}
          disabled={!selectedSpecialtyId}
        />
      </View>

      {/* Danh sách dịch vụ */}
      {!selectedSpecialtyId ? (
        <Text style={{ color: '#666', marginTop: 8 }}>
          Hãy chọn chuyên khoa để quản lý dịch vụ.
        </Text>
      ) : loading ? (
        <View style={{ paddingVertical: 16 }}>
          <ActivityIndicator />
        </View>
      ) : services.length === 0 ? (
        <Text style={{ color: '#666', marginTop: 8 }}>
          Chưa có dịch vụ cho chuyên khoa này.
        </Text>
      ) : (
        <FlatList
          data={services}
          keyExtractor={s => s.id}
          contentContainerStyle={{ paddingVertical: 6 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>
                  {item.name} {item.is_active === false ? ' (Ngưng)' : ''}
                </Text>
                <Text style={styles.cardSub}>
                  {item.code ? `Mã: ${item.code}   ` : ''}
                  {item.duration_min != null
                    ? `• ${item.duration_min} phút   `
                    : ''}
                  {item.base_price != null
                    ? `• ${Number(item.base_price).toLocaleString()}₫`
                    : ''}
                </Text>
                {!!item.description && (
                  <Text
                    style={{ color: '#555', marginTop: 4 }}
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                )}
              </View>
              <View style={{ flexDirection: 'row' }}>
                <Button title="Sửa" onPress={() => openEdit(item)} />
                <View style={{ width: 8 }} />
                <Button title="Xóa" onPress={() => deleteService(item.id)} />
              </View>
            </View>
          )}
        />
      )}

      {/* Modal form Thêm/Sửa */}
      <Modal
        visible={formOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setFormOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8 }}>
              {editing ? 'Sửa dịch vụ' : 'Thêm dịch vụ'}
            </Text>

            <Text style={styles.label}>Tên dịch vụ *</Text>
            <Input
              placeholder="VD: Khám tim mạch cơ bản"
              value={fName}
              onChangeText={setFName}
            />

            <Text style={styles.label}>Mã dịch vụ</Text>
            <Input
              placeholder="VD: CARD-CONSULT-01"
              value={fCode}
              onChangeText={setFCode}
            />

            <Text style={styles.label}>Giá (VND)</Text>
            <Input
              placeholder="VD: 350000"
              keyboardType="numeric"
              value={fPrice}
              onChangeText={setFPrice}
            />

            <Text style={styles.label}>Thời lượng (phút)</Text>
            <Input
              placeholder="VD: 20"
              keyboardType="numeric"
              value={fDuration}
              onChangeText={setFDuration}
            />

            <Text style={styles.label}>Mô tả</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Mô tả ngắn"
              value={fDesc}
              onChangeText={setFDesc}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.switchRow}>
              <Text style={{ flex: 1 }}>Đang cung cấp</Text>
              <Switch value={fActive} onValueChange={setFActive} />
            </View>

            <View style={{ flexDirection: 'row', marginTop: 12 }}>
              <Button title={editing ? 'Lưu' : 'Tạo'} onPress={saveService} />
              <View style={{ width: 8 }} />
              <Button title="Đóng" onPress={() => setFormOpen(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  sectionTitle: { fontWeight: '600', color: '#333', marginBottom: 6 },

  dropdownHeader: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownBody: {
    marginTop: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  dropdownItem: { paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8 },

  card: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    backgroundColor: '#fff',
    marginVertical: 6,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardTitle: { fontWeight: '700', color: '#111' },
  cardSub: { color: '#666', marginTop: 2 },

  label: { marginTop: 10, marginBottom: 6, color: '#444' },

  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    margin: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
  },

  switchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },

  textArea: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    color: '#111',
  },
});
