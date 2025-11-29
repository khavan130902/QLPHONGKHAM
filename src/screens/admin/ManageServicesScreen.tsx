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
  Alert,
  Platform, // <-- ĐÃ SỬA LỖI: Thêm import Platform
} from 'react-native';
import db from '@/services/firestore';
import Input from '@/components/Input';
import Button from '@/components/Button';
import safeAlert from '@/utils/safeAlert';

// BẢNG MÀU MỚI ĐƯỢC TINH CHỈNH ĐỂ ĐẸP HƠN
const COLORS = {
  primary: '#2596be',      // Màu xanh chủ đạo
  primaryLight: '#e0f2f7', // Màu xanh nhạt hơn cho nền các thành phần active
  secondary: '#dc3545',    // Đỏ cho hành động nguy hiểm (Xóa)
  success: '#28a745',      // Xanh lá cho Sửa
  background: '#f0f2f5',   // Nền tổng thể: xám rất nhạt
  cardBackground: '#ffffff', // Nền card và modal: trắng tinh
  textDark: '#212529',     // Chữ đậm: gần đen
  textLight: '#495057',    // Chữ phụ: xám đậm
  subtitle: '#6c757d',     // Chú thích: xám trung bình
  border: '#ced4da',       // Viền: xám nhạt
  placeholder: '#adb5bd',  // Màu placeholder
  shadowColor: '#000',     // Màu đổ bóng
  switchTrackFalse: '#e9ecef', // Màu track switch off
  switchThumb: '#ffffff', // Màu thumb switch
};

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
        if (!selectedSpecialtyId && list.length > 0) {
            setSelectedSpecialtyId(list[0].id);
        }
      } catch (e) {
        console.error('[specialties] load error:', e);
        safeAlert('Lỗi', 'Không tải được danh sách chuyên khoa');
      }
    })();
  }, [selectedSpecialtyId]);

  // Realtime services of selected specialty
  useEffect(() => {
    if (unsubRef.current) unsubRef.current();

    if (!selectedSpecialtyId) {
      setServices([]);
      return;
    }
    setLoading(true);
    try {
      const q = db
        .collection('service_types')
        .where('specialty_id', '==', selectedSpecialtyId);

      const unsub = q.onSnapshot(
        snap => {
          const list = snap.docs.map(d => ({
            id: d.id,
            ...(d.data() as any),
          })) as ServiceType[];
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
    } catch (e) {
      console.error('[service_types] save error:', e);
      safeAlert('Lỗi', 'Không lưu được dịch vụ. Kiểm tra quyền (rules).');
    }
  }

  function deleteService(id: string) {
    Alert.alert('Xác nhận', 'Xóa dịch vụ này? Hành động không thể hoàn tác.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await db.collection('service_types').doc(id).delete();
            safeAlert('Đã xóa', 'Dịch vụ đã được xóa.');
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
      <Text style={styles.subtitleText}>
        Thêm / sửa / xóa dịch vụ khám bệnh theo chuyên khoa.
      </Text>

      {/* Dropdown chuyên khoa */}
      <Text style={styles.sectionTitle}>Chọn chuyên khoa</Text>
      <TouchableOpacity
        style={styles.dropdownHeader}
        onPress={() => setSpecialtyOpen(v => !v)}
      >
        <Text style={styles.dropdownHeaderText}>
          {selectedSpecialty ? selectedSpecialty.name : 'Chọn chuyên khoa'}
        </Text>
        <Text style={styles.dropdownIcon}>{specialtyOpen ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {specialtyOpen && (
        <View style={styles.dropdownBody}>
          <ScrollView style={{ maxHeight: 200 }}>
            {specialties.map(s => (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.dropdownItem,
                  s.id === selectedSpecialtyId && styles.dropdownItemSelected,
                ]}
                onPress={() => {
                  setSelectedSpecialtyId(s.id);
                  setSpecialtyOpen(false);
                }}
              >
                <Text
                  style={
                    s.id === selectedSpecialtyId ? styles.dropdownItemTextSelected : styles.dropdownItemText
                  }
                >
                  {s.name}
                </Text>
              </TouchableOpacity>
            ))}
            {specialties.length === 0 && (
              <Text style={styles.emptyDropdownText}>
                Chưa có chuyên khoa.
              </Text>
            )}
          </ScrollView>
        </View>
      )}

      {/* Header + nút thêm */}
      <View style={styles.servicesHeader}>
        <Text style={[styles.sectionTitle, { flex: 1, marginBottom: 0 }]}>
          Dịch vụ {selectedSpecialty ? `• ${selectedSpecialty.name}` : ''}
        </Text>
        <Button
          title="Thêm dịch vụ"
          onPress={openCreate}
          disabled={!selectedSpecialtyId}
          style={styles.addButton}
          textStyle={{color: COLORS.cardBackground, fontWeight: '600'}}
        />
      </View>

      {/* Danh sách dịch vụ */}
      {!selectedSpecialtyId ? (
        <Text style={styles.emptyListText}>
          Hãy chọn chuyên khoa để quản lý dịch vụ.
        </Text>
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : services.length === 0 ? (
        <Text style={styles.emptyListText}>
          Chưa có dịch vụ cho chuyên khoa này.
        </Text>
      ) : (
        <FlatList
          data={services}
          keyExtractor={s => s.id}
          contentContainerStyle={{ paddingVertical: 8 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>
                  {item.name} 
                  {item.is_active === false && (
                    <Text style={styles.inactiveText}> (Ngưng)</Text>
                  )}
                </Text>
                <Text style={styles.cardSub}>
                  {item.code ? `Mã: ${item.code}   ` : ''}
                  {item.duration_min != null
                    ? `• ${item.duration_min} phút   `
                    : ''}
                  {item.base_price != null
                    ? `• ${Number(item.base_price).toLocaleString()}₫`
                    : ''}
                </Text>
                {!!item.description && (
                  <Text
                    style={styles.cardDescription}
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                )}
              </View>
              <View style={styles.cardActions}>
                <Button 
                  title="Sửa" 
                  onPress={() => openEdit(item)} 
                  style={styles.editButton}
                  textStyle={{color: COLORS.cardBackground, fontWeight: '600'}}
                />
                <View style={{ width: 8 }} />
                <Button 
                  title="Xóa" 
                  onPress={() => deleteService(item.id)} 
                  style={styles.deleteButton}
                  textStyle={{color: COLORS.cardBackground, fontWeight: '600'}}
                />
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
            <ScrollView contentContainerStyle={styles.modalScrollContainer}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>
                        {editing ? 'Sửa dịch vụ' : 'Thêm dịch vụ'}
                    </Text>

                    <Text style={styles.label}>Tên dịch vụ *</Text>
                    <Input
                        placeholder="VD: Khám tim mạch cơ bản"
                        value={fName}
                        onChangeText={setFName}
                        style={styles.inputStyle}
                        placeholderTextColor={COLORS.placeholder}
                    />

                    <Text style={styles.label}>Mã dịch vụ</Text>
                    <Input
                        placeholder="VD: CARD-CONSULT-01"
                        value={fCode}
                        onChangeText={setFCode}
                        style={styles.inputStyle}
                        placeholderTextColor={COLORS.placeholder}
                    />

                    <Text style={styles.label}>Giá (VND)</Text>
                    <Input
                        placeholder="VD: 350000"
                        keyboardType="numeric"
                        value={fPrice}
                        onChangeText={setFPrice}
                        style={styles.inputStyle}
                        placeholderTextColor={COLORS.placeholder}
                    />

                    <Text style={styles.label}>Thời lượng (phút)</Text>
                    <Input
                        placeholder="VD: 20"
                        keyboardType="numeric"
                        value={fDuration}
                        onChangeText={setFDuration}
                        style={styles.inputStyle}
                        placeholderTextColor={COLORS.placeholder}
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
                        placeholderTextColor={COLORS.placeholder}
                    />

                    <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>Đang cung cấp</Text>
                        <Switch 
                            value={fActive} 
                            onValueChange={setFActive} 
                            trackColor={{ false: COLORS.switchTrackFalse, true: COLORS.primary }}
                            thumbColor={COLORS.switchThumb}
                        />
                    </View>

                    <View style={styles.modalActions}>
                        <Button 
                            title={editing ? 'Lưu' : 'Tạo'} 
                            onPress={saveService} 
                            style={styles.modalSaveButton}
                            textStyle={{color: COLORS.cardBackground, fontWeight: '600'}}
                        />
                        <View style={{ width: 12 }} />
                        <Button 
                            title="Hủy" 
                            onPress={() => setFormOpen(false)} 
                            style={styles.modalCancelButton}
                            textStyle={{ color: COLORS.textLight, fontWeight: '600'}}
                        />
                    </View>
                </View>
            </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 16, 
    backgroundColor: COLORS.background 
  },
  title: { 
    fontSize: 28, 
    fontWeight: '800', 
    marginBottom: 8, 
    color: COLORS.textDark 
  },
  subtitleText: { 
    color: COLORS.subtitle, 
    fontSize: 15, 
    marginBottom: 24 
  },
  sectionTitle: { 
    fontWeight: '700', 
    color: COLORS.textLight, 
    marginBottom: 12, 
    fontSize: 17 
  },

  // Dropdown
  dropdownHeader: {
    paddingVertical: 14, 
    paddingHorizontal: 16, 
    borderRadius: 10, 
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardBackground,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16, 
    ...Platform.select({ 
      ios: {
        shadowColor: COLORS.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  dropdownHeaderText: {
    fontWeight: '600', 
    color: COLORS.textDark,
    fontSize: 16,
  },
  dropdownIcon: {
    color: COLORS.textLight,
    fontSize: 18,
  },
  dropdownBody: {
    borderRadius: 10, 
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardBackground,
    paddingHorizontal: 8,
    paddingVertical: 8,
    zIndex: 10,
    position: 'absolute',
    top: 135, 
    left: 16,
    right: 16,
    ...Platform.select({ 
      ios: {
        shadowColor: COLORS.shadowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  dropdownItem: { 
    paddingVertical: 12, 
    paddingHorizontal: 12, 
    borderRadius: 8,
    marginVertical: 2, 
  },
  dropdownItemSelected: { 
    backgroundColor: COLORS.primaryLight, 
  },
  dropdownItemText: { 
    color: COLORS.textLight, 
    fontSize: 15,
  },
  dropdownItemTextSelected: {
    color: COLORS.primary, 
    fontWeight: '600',
    fontSize: 15,
  },
  emptyDropdownText: { 
    color: COLORS.subtitle, 
    padding: 12, 
    fontStyle: 'italic' 
  },

  // List Services Header
  servicesHeader: {
    marginTop: 24, 
    flexDirection: 'row', 
    alignItems: 'center',
    marginBottom: 16, 
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    borderRadius: 8, 
  },
  emptyListText: { 
    color: COLORS.subtitle, 
    marginTop: 12, 
    paddingHorizontal: 8,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  loadingContainer: { 
    paddingVertical: 20, 
    alignItems: 'center' 
  },

  // Card
  card: {
    padding: 16, 
    borderRadius: 12, 
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardBackground,
    marginVertical: 8, 
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    ...Platform.select({ 
      ios: {
        shadowColor: COLORS.shadowColor,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardTitle: { 
    fontWeight: '700', 
    color: COLORS.textDark, 
    fontSize: 18, 
    marginBottom: 4, 
  },
  inactiveText: { 
    color: COLORS.secondary, 
    fontSize: 15, 
    fontWeight: '600', 
  },
  cardSub: { 
    color: COLORS.textLight, 
    marginTop: 2, 
    fontSize: 14, 
    lineHeight: 20, 
  },
  cardDescription: { 
    color: COLORS.subtitle, 
    marginTop: 6, 
    fontSize: 14, 
    lineHeight: 20, 
  },
  cardActions: { 
    flexDirection: 'row', 
    marginTop: 10, 
    marginLeft: 10,
  },
  editButton: { 
    backgroundColor: COLORS.success, 
    paddingVertical: 10, 
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  deleteButton: { 
    backgroundColor: COLORS.secondary, 
    paddingVertical: 10, 
    paddingHorizontal: 16,
    borderRadius: 8,
  },

  // Form (Modal)
  label: { 
    marginTop: 18, 
    marginBottom: 8, 
    color: COLORS.textLight, 
    fontWeight: '600', 
    fontSize: 15,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)', 
  },
  modalScrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16, 
  },
  modalContent: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16, 
    padding: 24, 
    ...Platform.select({ 
      ios: {
        shadowColor: COLORS.shadowColor,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 15,
      },
    }),
  },
  modalTitle: {
    fontWeight: '800', 
    fontSize: 22, 
    marginBottom: 20, 
    color: COLORS.textDark,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 12, 
  },

  switchRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 20, 
    paddingVertical: 10, 
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  switchLabel: {
    flex: 1, 
    color: COLORS.textLight, 
    fontSize: 15,
    fontWeight: '500',
  },

  textArea: {
    minHeight: 120, 
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8, 
    paddingHorizontal: 14, 
    paddingVertical: 12, 
    backgroundColor: COLORS.background, 
    color: COLORS.textDark,
    fontSize: 15,
    lineHeight: 22,
  },
  modalActions: { 
    flexDirection: 'row', 
    marginTop: 24, 
    justifyContent: 'space-between' 
  },
  modalSaveButton: {
    backgroundColor: COLORS.primary, 
    flex: 1,
    paddingVertical: 14, 
    borderRadius: 8,
  },
  modalCancelButton: {
    backgroundColor: COLORS.background, 
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1, 
    borderColor: COLORS.border,
  },
  inputStyle: { 
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8, 
    paddingHorizontal: 14, 
    paddingVertical: 12, 
    backgroundColor: COLORS.background, 
    color: COLORS.textDark,
    fontSize: 15,
  },
});