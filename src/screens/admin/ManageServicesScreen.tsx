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
  Platform,
} from 'react-native';

// Import các component và service cần thiết
import db from '@/services/firestore';
import Input from '@/components/Input';
import Button from '@/components/Button';
import safeAlert from '@/utils/safeAlert';

// =================================================================
// BẢNG MÀU VÀ KHAI BÁO TYPES
// =================================================================

// BẢNG MÀU MỚI ĐƯỢC TINH CHỈNH ĐỂ ĐẸP HƠN
const COLORS = {
  primary: '#2596be',      
  primaryLight: '#e0f2f7', 
  secondary: '#dc3545',    
  success: '#28a745',      
  background: '#f0f2f5',   
  cardBackground: '#ffffff', 
  textDark: '#212529',     
  textLight: '#495057',    
  subtitle: '#6c757d',    
  border: '#ced4da',      
  placeholder: '#adb5bd', 
  shadowColor: '#000',    
  switchTrackFalse: '#e9ecef',
  switchThumb: '#ffffff',
};

// Định nghĩa kiểu dữ liệu cho Chuyên khoa và Dịch vụ
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
  // State quản lý danh sách chuyên khoa và trạng thái Dropdown
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [specialtyOpen, setSpecialtyOpen] = useState(false);
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<string | null>(
    null,
  );

  // State quản lý danh sách dịch vụ và trạng thái tải
  const [services, setServices] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(false);
  // Ref lưu hàm unsubscribe của listener Firestore
  const unsubRef = useRef<null | (() => void)>(null);

  // State quản lý Form Modal
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceType | null>(null);

  // State cho các trường Form nhập liệu
  const [fName, setFName] = useState('');
  const [fCode, setFCode] = useState('');
  const [fPrice, setFPrice] = useState('');
  const [fDuration, setFDuration] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [fActive, setFActive] = useState(true);

  // useMemo: Lấy thông tin chi tiết của chuyên khoa đang chọn
  const selectedSpecialty = useMemo(
    () => specialties.find(s => s.id === selectedSpecialtyId) || null,
    [specialties, selectedSpecialtyId],
  );

  // =================================================================
  // LOGIC TẢI DỮ LIỆU
  // =================================================================

  // useEffect: Tải danh sách chuyên khoa (chỉ chạy 1 lần)
  useEffect(() => {
    (async () => {
      try {
        const snap = await db.collection('specialties').orderBy('name').get();
        const list = snap.docs.map(d => ({
          id: d.id,
          ...(d.data() as any),
        })) as Specialty[];
        setSpecialties(list);
        // Tự động chọn chuyên khoa đầu tiên nếu chưa có chuyên khoa nào được chọn
        if (!selectedSpecialtyId && list.length > 0) {
            setSelectedSpecialtyId(list[0].id);
        }
      } catch (e) {
        console.error('[specialties] load error:', e);
        safeAlert('Lỗi', 'Không tải được danh sách chuyên khoa');
      }
    })();
  }, [selectedSpecialtyId]); // Phụ thuộc vào selectedSpecialtyId để tránh re-render không cần thiết

  // useEffect: Lắng nghe danh sách dịch vụ theo chuyên khoa (Realtime)
  useEffect(() => {
    // Hủy listener cũ
    if (unsubRef.current) unsubRef.current();

    if (!selectedSpecialtyId) {
      setServices([]);
      return;
    }
    setLoading(true);
    try {
      // Tạo query chỉ lấy dịch vụ thuộc chuyên khoa đang chọn
      const q = db
        .collection('service_types')
        .where('specialty_id', '==', selectedSpecialtyId);

      // Thiết lập listener realtime
      const unsub = q.onSnapshot(
        snap => {
          const list = snap.docs.map(d => ({
            id: d.id,
            ...(d.data() as any),
          })) as ServiceType[];
          // Sắp xếp theo tên
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
    // Cleanup function: Hủy listener khi component unmount hoặc selectedSpecialtyId thay đổi
    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, [selectedSpecialtyId]);

  // =================================================================
  // QUẢN LÝ FORM & CRUD
  // =================================================================

  // Reset các trường form về giá trị mặc định
  function resetForm() {
    setEditing(null);
    setFName('');
    setFCode('');
    setFPrice('');
    setFDuration('');
    setFDesc('');
    setFActive(true);
  }

  // Mở form tạo mới
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

  // Mở form chỉnh sửa, tải dữ liệu item vào form
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

  // Lưu (Tạo mới hoặc Cập nhật) dịch vụ
  async function saveService() {
    // Kiểm tra validation cơ bản
    if (!selectedSpecialtyId)
      return safeAlert('Thiếu thông tin', 'Chưa chọn chuyên khoa.');
    if (!fName.trim())
      return safeAlert('Thiếu thông tin', 'Tên dịch vụ không được để trống.');

    // Xử lý và kiểm tra giá trị số
    const priceNum = fPrice.trim() === '' ? null : Number(fPrice);
    const durNum = fDuration.trim() === '' ? null : Number(fDuration);

    if (priceNum != null && (Number.isNaN(priceNum) || priceNum < 0))
      return safeAlert('Sai dữ liệu', 'Giá phải là số không âm.');
    if (durNum != null && (Number.isNaN(durNum) || durNum <= 0))
      return safeAlert('Sai dữ liệu', 'Thời lượng (phút) phải là số dương.');

    // Tạo payload dữ liệu
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
        // Cập nhật
        await db
          .collection('service_types')
          .doc(editing.id)
          .set(payload, { merge: true });
        safeAlert('Thành công', 'Đã cập nhật dịch vụ.');
      } else {
        // Tạo mới
        await db.collection('service_types').add({
          ...payload,
          created_at: new Date().toISOString(),
        });
        safeAlert('Thành công', 'Đã tạo dịch vụ mới.');
      }
      setFormOpen(false);
      resetForm(); // Reset form sau khi lưu thành công
    } catch (e) {
      console.error('[service_types] save error:', e);
      safeAlert('Lỗi', 'Không lưu được dịch vụ. Kiểm tra quyền (rules).');
    }
  }

  // Xóa dịch vụ (có xác nhận)
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

  // =================================================================
  // RENDER GIAO DIỆN CHÍNH
  // =================================================================
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quản lý loại dịch vụ</Text>
      <Text style={styles.subtitleText}>
        Thêm / sửa / xóa dịch vụ khám bệnh theo chuyên khoa.
      </Text>

      {/* Dropdown chọn chuyên khoa */}
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

      {/* Danh sách chuyên khoa trong Dropdown (chỉ hiển thị khi specialtyOpen=true) */}
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

      {/* Header cho phần dịch vụ + nút thêm */}
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

      {/* Danh sách dịch vụ (Hiển thị Loading, Empty hoặc FlatList) */}
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
            // Render từng Card dịch vụ
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>
                  {item.name} 
                  {item.is_active === false && (
                    <Text style={styles.inactiveText}> (Ngưng)</Text>
                  )}
                </Text>
                {/* Thông tin phụ (Mã, Thời lượng, Giá) */}
                <Text style={styles.cardSub}>
                  {item.code ? `Mã: ${item.code}   ` : ''}
                  {item.duration_min != null
                    ? `• ${item.duration_min} phút   `
                    : ''}
                  {item.base_price != null
                    ? `• ${Number(item.base_price).toLocaleString()}₫`
                    : ''}
                </Text>
                {/* Mô tả */}
                {!!item.description && (
                  <Text
                    style={styles.cardDescription}
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                )}
              </View>
              {/* Nút hành động (Sửa, Xóa) */}
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

      {/* =================================================================
            MODAL FORM THÊM/SỬA DỊCH VỤ
        ================================================================= */}
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

                    {/* Input Tên dịch vụ */}
                    <Text style={styles.label}>Tên dịch vụ *</Text>
                    <Input
                        placeholder="VD: Khám tim mạch cơ bản"
                        value={fName}
                        onChangeText={setFName}
                        style={styles.inputStyle}
                        placeholderTextColor={COLORS.placeholder}
                    />

                    {/* Input Mã dịch vụ */}
                    <Text style={styles.label}>Mã dịch vụ</Text>
                    <Input
                        placeholder="VD: CARD-CONSULT-01"
                        value={fCode}
                        onChangeText={setFCode}
                        style={styles.inputStyle}
                        placeholderTextColor={COLORS.placeholder}
                    />

                    {/* Input Giá */}
                    <Text style={styles.label}>Giá (VND)</Text>
                    <Input
                        placeholder="VD: 350000"
                        keyboardType="numeric"
                        value={fPrice}
                        onChangeText={setFPrice}
                        style={styles.inputStyle}
                        placeholderTextColor={COLORS.placeholder}
                    />

                    {/* Input Thời lượng */}
                    <Text style={styles.label}>Thời lượng (phút)</Text>
                    <Input
                        placeholder="VD: 20"
                        keyboardType="numeric"
                        value={fDuration}
                        onChangeText={setFDuration}
                        style={styles.inputStyle}
                        placeholderTextColor={COLORS.placeholder}
                    />

                    {/* Textarea Mô tả */}
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

                    {/* Switch Đang cung cấp (Active/Inactive) */}
                    <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>Đang cung cấp</Text>
                        <Switch 
                            value={fActive} 
                            onValueChange={setFActive} 
                            trackColor={{ false: COLORS.switchTrackFalse, true: COLORS.primary }}
                            thumbColor={COLORS.switchThumb}
                        />
                    </View>

                    {/* Nút hành động trong Modal (Lưu và Hủy) */}
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

// =================================================================
// STYLESHEET (ĐỊNH NGHĨA GIAO DIỆN)
// =================================================================
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

  // Dropdown chuyên khoa
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
    top: 135, // Căn chỉnh vị trí dưới Dropdown Header
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

  // Header danh sách dịch vụ
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

  // Card dịch vụ
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

  // Switch
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

  // Textarea và Input chung
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

  // Nút hành động trong Modal
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
});