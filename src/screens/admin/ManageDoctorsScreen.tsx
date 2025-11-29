import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  SafeAreaView, // Thêm SafeAreaView để xử lý notch
} from 'react-native';
import Avatar from '@/components/Avatar';
import Button from '@/components/Button'; // Đã sửa lỗi style/textStyle trong file Button.tsx
import db from '@/services/firestore';
import safeAlert from '@/utils/safeAlert';
import { uploadImage } from '@/services/storage';

// Bảng màu đồng bộ
const COLORS = {
  primary: '#2596be', // Màu xanh chủ đạo
  background: '#f8f9fa', // Nền tổng thể rất nhạt
  cardBackground: '#ffffff', // Nền card trắng
  textDark: '#1c1c1c',
  textLight: '#4a4a4a',
  subtitle: '#777777',
  shadowColor: '#000000',
  borderColor: '#E5E7EB',
  danger: '#d00',
  lightGray: '#f6f6f6',
};

// Component con RenderItem (giúp code chính gọn hơn)
const AccountItem = ({ item, changeRole, openEdit, onDelete }: any) => {
  const isDoctor = item.role === 'doctor';
  const roleLabel = isDoctor ? 'Bác sĩ' : 'Bệnh nhân';
  const newRole = isDoctor ? 'patient' : 'doctor';
  const newRoleLabel = isDoctor ? 'Bệnh nhân' : 'Bác sĩ';

  return (
    <View style={styles.itemRow}>
      <TouchableOpacity onPress={() => openEdit(item)}>
        <Avatar uri={item.photoURL} name={item.name} size={48} />
      </TouchableOpacity>

      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name || 'Chưa đặt tên'}</Text>
        <Text style={styles.itemSub}>
          {item.email || item.phoneNumber || 'Không có liên hệ'}
        </Text>
        {isDoctor && item.specialty && (
          <Text style={styles.itemSpecialty}>{item.specialty}</Text>
        )}
      </View>

      <View style={styles.itemActions}>
        <Button
          title={`Vai trò`}
          onPress={() => changeRole(item.id, newRole)}
          // 💡 Đổi style cho nút Vai trò
          style={[styles.actionButton, { backgroundColor: COLORS.primary }]}
          textStyle={styles.actionButtonText}
        />
        <View style={{ width: 8 }} />
        <Button
          title="Sửa"
          onPress={() => openEdit(item)}
          // 💡 Đổi style cho nút Sửa
          style={[styles.actionButton, { backgroundColor: COLORS.textLight }]}
          textStyle={styles.actionButtonText}
        />
        <View style={{ width: 8 }} />
        <TouchableOpacity 
          onPress={() => onDelete(item.id)}
          style={styles.deleteButton}
        >
          <Text style={styles.deleteButtonText}>Xóa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};


export default function ManageDoctorsScreen() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [patientsCollapsed, setPatientsCollapsed] = useState(false);
  const [doctorsCollapsed, setDoctorsCollapsed] = useState(false);

  // edit modal
  const [editing, setEditing] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhoto, setEditPhoto] = useState('');
  const [showPhotoInput, setShowPhotoInput] = useState(false);
  const [photoInputText, setPhotoInputText] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editPhone, setEditPhone] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editAddress, setEditAddress] = useState('');
  // const [editSpecialty, setEditSpecialty] = useState(''); // Không dùng trực tiếp
  const [editSpecialtyId, setEditSpecialtyId] = useState<string | null>(null);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [specialtyPickerVisible, setSpecialtyPickerVisible] = useState(false);
  
  // Logic load, changeRole, onDelete, saveEdit, pickFromLibrary, takePhoto (giữ nguyên)
  // ... (giữ nguyên logic functions)
  useEffect(() => {
    loadAccounts();
    loadSpecialties();
  }, []);

  async function loadSpecialties() {
    try {
      const snap = await db.collection('specialties').orderBy('name').get();
      setSpecialties(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    } catch (e) {
      console.warn('load specialties', e);
    }
  }

  async function loadAccounts() {
    try {
      setLoading(true);
      const snap = await db
        .collection('users')
        .where('role', 'in', ['doctor', 'patient'])
        .get();
      setAccounts(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    } catch (err) {
      console.warn('load accounts', err);
      safeAlert('Lỗi', 'Không tải được danh sách tài khoản');
    } finally {
      setLoading(false);
    }
  }

  async function changeRole(id: string, newRole: string) {
    const label = newRole === 'doctor' ? 'bác sĩ' : 'bệnh nhân';
    Alert.alert('Xác nhận', `Đổi vai trò sang ${label}?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đồng ý',
        onPress: async () => {
          try {
            await db.collection('users').doc(id).update({ role: newRole });
            safeAlert('Thành công', `Đã đổi vai trò thành ${label}`);
            setAccounts(prev =>
              prev.map(p => (p.id === id ? { ...p, role: newRole } : p)),
            );
          } catch (e) {
            console.warn('changeRole', e);
            safeAlert('Lỗi', 'Không đổi được vai trò');
            loadAccounts();
          }
        },
      },
    ]);
  }

  function onDelete(id: string) {
    Alert.alert('Xác nhận', 'Xóa tài khoản này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await db.collection('users').doc(id).delete();
            safeAlert('Đã xóa', 'Đã xóa tài khoản');
            setAccounts(prev => prev.filter(p => p.id !== id));
          } catch (err) {
            console.warn('delete account', err);
            safeAlert('Lỗi', 'Không thể xóa tài khoản');
          }
        },
      },
    ]);
  }

  function openEdit(user: any) {
    setEditingUser(user);
    setEditName(user.name || '');
    setEditEmail(user.email || user['e-mail'] || '');
    setEditPhoto(user.photoURL || '');
    setEditPhone(user.phoneNumber || user['phone number'] || '');
    // prefer id-based specialty; keep text field empty (we'll show name via id)
    // setEditSpecialty(''); // Bỏ dòng này vì không dùng state editSpecialty nữa
    setEditSpecialtyId(user.specialty_id || null);
    setEditAge(user.age ? String(user.age) : '');
    setEditAddress(user.address || '');
    setEditing(true);
  }

  async function saveEdit() {
    if (!editingUser) return;
    const id = editingUser.id;
    try {
      let specialtyName: string | null = null;
      if (editSpecialtyId) {
        try {
          const sdoc = await db
            .collection('specialties')
            .doc(editSpecialtyId)
            .get();
          const sdata =
            sdoc.data && typeof sdoc.data === 'function'
              ? sdoc.data()
              : sdoc.data();
          if (sdata && sdata.name) specialtyName = sdata.name;
        } catch (e) {
          console.warn('load specialty name', e);
        }
      }

      await db
        .collection('users')
        .doc(id)
        .update({
          name: editName || null,
          email: editEmail || null,
          photoURL: editPhoto || null,
          age: editAge || null,
          address: editAddress || null,
          phoneNumber: editPhone || null,
          specialty: specialtyName || null,
          specialty_id: editSpecialtyId || null,
        });
      safeAlert('Thành công', 'Đã cập nhật thông tin');
      setAccounts(prev =>
        prev.map(p =>
          p.id === id
            ? {
                ...p,
                name: editName,
                email: editEmail,
                photoURL: editPhoto,
                age: editAge,
                address: editAddress,
                phoneNumber: editPhone,
                specialty: specialtyName,
                specialty_id: editSpecialtyId,
              }
            : p,
        ),
      );
      setEditing(false);
      setEditingUser(null);
    } catch (err) {
      console.warn('saveEdit', err);
      safeAlert('Lỗi', 'Không cập nhật được thông tin');
    }
  }

  async function pickFromLibrary() {
    // ... (logic giữ nguyên)
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ImagePicker = require('react-native-image-picker');
      const options = { mediaType: 'photo', quality: 0.8 };
      ImagePicker.launchImageLibrary(options, async (response: any) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          console.warn(
            'imagePicker error',
            response.errorMessage || response.errorCode,
          );
          safeAlert('Lỗi', 'Không thể chọn ảnh');
          return;
        }
        const asset = response.assets && response.assets[0];
        if (asset && asset.uri) {
          if (/^https?:\/\//i.test(asset.uri)) {
            setEditPhoto(asset.uri);
            setShowPhotoInput(false);
            return;
          }
          setUploadingPhoto(true);
          setUploadProgress(0);
          try {
            const dest = `users/${
              editingUser?.id || 'unknown'
            }_${Date.now()}.jpg`;
            const url = await uploadImage(asset.uri, dest, (p: number) =>
              setUploadProgress(Math.round(p)),
            );
            setEditPhoto(url);
            setShowPhotoInput(false);
          } catch (e) {
            console.warn('upload failed', e);
            safeAlert('Lỗi', 'Không thể tải ảnh lên');
          } finally {
            setUploadingPhoto(false);
          }
        }
      });
    } catch (e) {
      console.warn('image-picker not installed', e);
      safeAlert(
        'Thao tác không khả dụng',
        "Cần cài 'react-native-image-picker' để chọn ảnh. Chạy: npm install react-native-image-picker",
      );
    }
  }

  async function takePhoto() {
    // ... (logic giữ nguyên)
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ImagePicker = require('react-native-image-picker');
      const options = { mediaType: 'photo', quality: 0.8 };
      ImagePicker.launchCamera(options, async (response: any) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          console.warn(
            'camera error',
            response.errorMessage || response.errorCode,
          );
          safeAlert('Lỗi', 'Không thể chụp ảnh');
          return;
        }
        const asset = response.assets && response.assets[0];
        if (asset && asset.uri) {
          if (/^https?:\/\//i.test(asset.uri)) {
            setEditPhoto(asset.uri);
            setShowPhotoInput(false);
            return;
          }
          setUploadingPhoto(true);
          setUploadProgress(0);
          try {
            const dest = `users/${
              editingUser?.id || 'unknown'
            }_${Date.now()}.jpg`;
            const url = await uploadImage(asset.uri, dest, (p: number) =>
              setUploadProgress(Math.round(p)),
            );
            setEditPhoto(url);
            setShowPhotoInput(false);
          } catch (e) {
            console.warn('upload failed', e);
            safeAlert('Lỗi', 'Không thể tải ảnh lên');
          } finally {
            setUploadingPhoto(false);
          }
        }
      });
    } catch (e) {
      console.warn('image-picker not installed', e);
      safeAlert(
        'Thao tác không khả dụng',
        "Cần cài 'react-native-image-picker' để chụp ảnh. Chạy: npm install react-native-image-picker",
      );
    }
  }
  // ... (kết thúc logic functions)


  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.headerTitle}>Quản lý tài khoản</Text>
        <Text style={styles.headerSubtitle}>
          Bác sĩ và Bệnh nhân
        </Text>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : (
          <>
            {/* --- Phần Bệnh nhân --- */}
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setPatientsCollapsed(v => !v)}
            >
              <Text style={styles.sectionTitle}>
                Bệnh nhân ({accounts.filter(a => a.role === 'patient').length})
              </Text>
              <Text style={styles.collapseIcon}>{patientsCollapsed ? '▼' : '▲'}</Text>
            </TouchableOpacity>

            {!patientsCollapsed && (
              <FlatList
                data={accounts.filter(a => a.role === 'patient')}
                keyExtractor={i => i.id}
                renderItem={({ item }) => (
                  <AccountItem 
                    item={item} 
                    changeRole={changeRole} 
                    openEdit={openEdit} 
                    onDelete={onDelete} 
                  />
                )}
                ListEmptyComponent={() => (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Không có bệnh nhân.</Text>
                  </View>
                )}
              />
            )}

            {/* --- Phần Bác sĩ --- */}
            <TouchableOpacity
              style={[styles.sectionHeader, { marginTop: 16 }]}
              onPress={() => setDoctorsCollapsed(v => !v)}
            >
              <Text style={styles.sectionTitle}>
                Bác sĩ ({accounts.filter(a => a.role === 'doctor').length})
              </Text>
              <Text style={styles.collapseIcon}>{doctorsCollapsed ? '▼' : '▲'}</Text>
            </TouchableOpacity>

            {!doctorsCollapsed && (
              <FlatList
                data={accounts.filter(a => a.role === 'doctor')}
                keyExtractor={i => i.id}
                renderItem={({ item }) => (
                  <AccountItem 
                    item={item} 
                    changeRole={changeRole} 
                    openEdit={openEdit} 
                    onDelete={onDelete} 
                  />
                )}
                ListEmptyComponent={() => (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Không có bác sĩ.</Text>
                  </View>
                )}
              />
            )}

            {/* --- Modal Sửa thông tin --- */}
            <Modal visible={editing} animationType="slide" transparent={true} onRequestClose={() => setEditing(false)}>
              <View style={styles.modalBackdrop}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Sửa thông tin tài khoản</Text>

                  {/* Ảnh đại diện */}
                  <View style={styles.avatarContainer}>
                    <TouchableOpacity
                      onPress={() => {
                        setPhotoInputText(editPhoto || '');
                        setShowPhotoInput(true);
                      }}
                      accessibilityLabel="Chạm để thay đổi ảnh"
                    >
                      <Avatar
                        uri={editPhoto}
                        name={editName || '...'}
                        size={72}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Input URL ảnh/Chọn ảnh */}
                  {showPhotoInput && (
                    <View style={styles.photoInputBox}>
                      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                        <Button
                          title="Chọn ảnh"
                          onPress={pickFromLibrary}
                          style={styles.photoActionButton}
                          textStyle={styles.photoActionButtonText}
                        />
                        <View style={{ width: 8 }} />
                        <Button 
                          title="Chụp ảnh" 
                          onPress={takePhoto} 
                          style={styles.photoActionButton}
                          textStyle={styles.photoActionButtonText}
                        />
                      </View>

                      {uploadingPhoto ? (
                        <View style={styles.uploadingProgress}>
                          <ActivityIndicator color={COLORS.primary} />
                          <Text style={{ color: COLORS.textLight, marginTop: 6 }}>
                            {uploadProgress}%
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.photoActionsRow}>
                          <Button
                            title="Hủy"
                            onPress={() => {
                              setShowPhotoInput(false);
                              setPhotoInputText('');
                            }}
                            style={{ backgroundColor: COLORS.subtitle }}
                            textStyle={styles.actionButtonText}
                          />
                          <View style={{ width: 8 }} />
                          <Button
                            title="Áp dụng"
                            onPress={() => {
                              if (photoInputText) setEditPhoto(photoInputText);
                              setShowPhotoInput(false);
                              setPhotoInputText('');
                            }}
                            style={{ backgroundColor: COLORS.primary }}
                            textStyle={styles.actionButtonText}
                          />
                        </View>
                      )}
                    </View>
                  )}

                  {/* Trường nhập liệu */}
                  <Text style={styles.inputLabel}>Tên</Text>
                  <TextInput
                    placeholder="Tên"
                    value={editName}
                    onChangeText={setEditName}
                    style={styles.textInputStyle}
                    placeholderTextColor={COLORS.subtitle}
                  />

                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    placeholder="Email"
                    value={editEmail}
                    onChangeText={setEditEmail}
                    style={styles.textInputStyle}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor={COLORS.subtitle}
                  />

                  <Text style={styles.inputLabel}>Số điện thoại</Text>
                  <TextInput
                    placeholder="Số điện thoại"
                    value={editPhone}
                    onChangeText={setEditPhone}
                    style={styles.textInputStyle}
                    keyboardType="phone-pad"
                    placeholderTextColor={COLORS.subtitle}
                  />
                  
                  {/* ... (Tiếp tục với các trường nhập liệu khác) */}
                  <Text style={styles.inputLabel}>Tuổi</Text>
                  <TextInput
                    placeholder="Tuổi"
                    value={editAge}
                    onChangeText={setEditAge}
                    style={styles.textInputStyle}
                    keyboardType="numeric"
                    placeholderTextColor={COLORS.subtitle}
                  />

                  <Text style={styles.inputLabel}>Địa chỉ</Text>
                  <TextInput
                    placeholder="Địa chỉ"
                    value={editAddress}
                    onChangeText={setEditAddress}
                    style={styles.textInputStyle}
                    placeholderTextColor={COLORS.subtitle}
                  />
                  
                  {/* Vai trò */}
                  <Text style={[styles.inputLabel, { marginTop: 4 }]}>Vai trò</Text>
                  <View style={styles.roleBox}>
                    <Text style={{color: COLORS.textDark, fontWeight: '600'}}>
                      {editingUser?.role === 'doctor' ? 'Bác sĩ' : 'Bệnh nhân'}
                    </Text>
                  </View>

                  {/* Chuyên khoa (Chỉ cho Bác sĩ) */}
                  {editingUser?.role === 'doctor' ? (
                    <>
                      <Text style={styles.inputLabel}>Chuyên khoa</Text>
                      <TouchableOpacity
                        style={styles.pickerBox}
                        onPress={() => setSpecialtyPickerVisible(true)}
                      >
                        <Text style={{color: COLORS.textDark}}>
                          {specialties.find(s => s.id === editSpecialtyId)
                            ?.name || 'Chọn chuyên khoa'}
                        </Text>
                      </TouchableOpacity>

                      {/* Modal chọn chuyên khoa */}
                      <Modal
                        visible={specialtyPickerVisible}
                        animationType="slide"
                        transparent={true}
                        onRequestClose={() => setSpecialtyPickerVisible(false)}
                      >
                        <View style={styles.modalBackdrop}>
                          <View style={[styles.modalContent, { maxHeight: 420 }]}>
                            <Text style={styles.modalTitle}>Chọn chuyên khoa</Text>
                            <FlatList
                              data={specialties}
                              keyExtractor={s => s.id}
                              renderItem={({ item }) => (
                                <TouchableOpacity
                                  onPress={() => {
                                    // setEditSpecialty(item.name || ''); // Không cần dùng state này nữa
                                    setEditSpecialtyId(item.id);
                                    setSpecialtyPickerVisible(false);
                                  }}
                                  style={styles.specialtyItemRow}
                                >
                                  <Text style={[styles.specialtyItemText, {
                                      fontWeight: item.id === editSpecialtyId ? '700' : '400',
                                      color: item.id === editSpecialtyId ? COLORS.primary : COLORS.textDark,
                                  }]}>
                                      {item.name}
                                  </Text>
                                </TouchableOpacity>
                              )}
                            />
                            <View style={styles.modalActionsRow}>
                              <Button
                                title="Đóng"
                                onPress={() => setSpecialtyPickerVisible(false)}
                                style={{ backgroundColor: COLORS.subtitle }}
                                textStyle={styles.actionButtonText}
                              />
                            </View>
                          </View>
                        </View>
                      </Modal>
                    </>
                  ) : null}

                  {/* Nút hành động Lưu/Hủy */}
                  <View style={styles.modalActionsRow}>
                    <Button
                      title="Hủy"
                      onPress={() => {
                        setEditing(false);
                        setEditingUser(null);
                      }}
                      style={{ backgroundColor: COLORS.subtitle, flex: 1 }}
                      textStyle={styles.actionButtonText}
                    />
                    <View style={{ width: 8 }} />
                    <Button 
                      title="Lưu" 
                      onPress={saveEdit} 
                      style={{ backgroundColor: COLORS.primary, flex: 1 }}
                      textStyle={styles.actionButtonText}
                    />
                  </View>
                </View>
              </View>
            </Modal>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, padding: 16, backgroundColor: COLORS.background },
  
  // --- Header ---
  headerTitle: { fontSize: 24, fontWeight: '800', color: COLORS.textDark },
  headerSubtitle: { color: COLORS.subtitle, marginBottom: 16, fontSize: 14 },

  // --- List Item (Bác sĩ/Bệnh nhân) ---
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderColor,
    marginBottom: 10,
    backgroundColor: COLORS.cardBackground,
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  itemInfo: { marginLeft: 12, flex: 1 },
  itemName: { fontWeight: '700', fontSize: 16, color: COLORS.textDark },
  itemSub: { color: COLORS.textLight, marginTop: 2, fontSize: 13 },
  itemSpecialty: { 
    color: COLORS.primary, 
    fontSize: 12, 
    fontWeight: '600',
    marginTop: 2 
  },
  itemActions: { 
    flexDirection: 'row', 
    alignItems: 'center',
    // 💡 Điều chỉnh để các nút không quá lớn
    maxWidth: 220, 
  },
  actionButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    // 💡 Giảm kích thước nút
    minWidth: 50, 
  },
  actionButtonText: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: COLORS.cardBackground 
  },
  deleteButton: { 
    padding: 6 
  },
  deleteButtonText: { 
    color: COLORS.danger, 
    fontWeight: '700',
    fontSize: 13
  },

  // --- Sections ---
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderColor,
    marginBottom: 8,
  },
  sectionTitle: { fontWeight: '800', fontSize: 18, color: COLORS.textDark },
  collapseIcon: { color: COLORS.textDark, fontSize: 16, fontWeight: '700' },
  emptyContainer: { 
    paddingVertical: 24, 
    alignItems: 'center' 
  },
  emptyText: { color: COLORS.subtitle },

  // --- Modal ---
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 16,
    // Cập nhật shadow
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: { elevation: 10 },
    }),
  },
  modalTitle: { 
    fontWeight: '800', 
    fontSize: 18, 
    marginBottom: 16, 
    color: COLORS.textDark,
    textAlign: 'center',
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  
  // --- Input & Form ---
  inputLabel: { 
    fontSize: 13, 
    color: COLORS.textLight, 
    marginBottom: 4, 
    fontWeight: '600'
  },
  textInputStyle: { // Đổi tên từ 'input' sang 'textInputStyle' để dễ phân biệt
    borderWidth: 1,
    borderColor: COLORS.borderColor,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    marginBottom: 12,
    backgroundColor: COLORS.cardBackground,
    color: COLORS.textDark,
    fontSize: 15,
  },
  roleBox: {
    padding: 10,
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.borderColor,
  },
  
  // --- Photo Input ---
  avatarContainer: { alignItems: 'center', marginBottom: 12 },
  photoInputBox: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.borderColor,
  },
  photoActionButton: { 
    flex: 1, 
    paddingHorizontal: 6,
    paddingVertical: 8,
    backgroundColor: COLORS.textLight, // Màu mặc định cho hành động ảnh
  },
  photoActionButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.cardBackground,
  },
  uploadingProgress: { 
    alignItems: 'center', 
    paddingVertical: 12 
  },
  photoActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },

  // --- Specialty Picker ---
  pickerBox: {
    borderWidth: 1,
    borderColor: COLORS.borderColor,
    padding: 12,
    borderRadius: 8,
    backgroundColor: COLORS.cardBackground,
    marginBottom: 12,
  },
  specialtyItemRow: {
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderColor,
  },
  specialtyItemText: { 
    fontSize: 16, 
    color: COLORS.textDark 
  },
});