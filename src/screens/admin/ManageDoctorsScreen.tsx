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
} from 'react-native';
import Avatar from '@/components/Avatar';
import Button from '@/components/Button';
import db from '@/services/firestore';
import safeAlert from '@/utils/safeAlert';
import { uploadImage } from '@/services/storage';

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
  const [editSpecialty, setEditSpecialty] = useState('');
  const [editSpecialtyId, setEditSpecialtyId] = useState<string | null>(null);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [specialtyPickerVisible, setSpecialtyPickerVisible] = useState(false);

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
      // load both patients and doctors so admin can switch roles freely
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
    setEditSpecialty('');
    setEditSpecialtyId(user.specialty_id || null);
    setEditAge(user.age ? String(user.age) : '');
    setEditAddress(user.address || '');
    setEditing(true);
  }

  async function saveEdit() {
    if (!editingUser) return;
    const id = editingUser.id;
    try {
      // If an editSpecialtyId is selected, resolve its canonical name from
      // the `specialties` collection and store both the id and the name on
      // the user document (keeps backward-compatible `specialty` text).
      let specialtyName: string | null = editSpecialty || null;
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
          // if remote URL already, use it
          if (/^https?:\/\//i.test(asset.uri)) {
            setEditPhoto(asset.uri);
            setShowPhotoInput(false);
            return;
          }
          // upload local file
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quản lý tài khoản (Bác sĩ & Bệnh nhân)</Text>

      {loading ? (
        <ActivityIndicator />
      ) : (
        <>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setPatientsCollapsed(v => !v)}
          >
            <Text style={styles.sectionTitle}>Bệnh nhân</Text>
            <Text style={styles.sectionCount}>
              {accounts.filter(a => a.role === 'patient').length}
            </Text>
          </TouchableOpacity>

          {!patientsCollapsed && (
            <FlatList
              data={accounts.filter(a => a.role === 'patient')}
              keyExtractor={i => i.id}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <TouchableOpacity onPress={() => openEdit(item)}>
                    <Avatar uri={item.photoURL} name={item.name} size={44} />
                  </TouchableOpacity>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.name}>{item.name || item.id}</Text>
                    <Text style={styles.sub}>
                      {item.email || item.phone || ''}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Button
                      title="Vai trò"
                      onPress={() => changeRole(item.id, 'doctor')}
                    />
                    <View style={{ width: 8 }} />
                    <Button title="Sửa" onPress={() => openEdit(item)} />
                    <View style={{ width: 8 }} />
                    <TouchableOpacity onPress={() => onDelete(item.id)}>
                      <Text style={{ color: '#d00', fontWeight: '700' }}>
                        Xóa
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              ListEmptyComponent={() => (
                <View style={{ paddingVertical: 24 }}>
                  <Text style={{ color: '#666' }}>Không có bệnh nhân.</Text>
                </View>
              )}
            />
          )}

          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setDoctorsCollapsed(v => !v)}
          >
            <Text style={styles.sectionTitle}>Bác sĩ</Text>
            <Text style={styles.sectionCount}>
              {accounts.filter(a => a.role === 'doctor').length}
            </Text>
          </TouchableOpacity>

          {!doctorsCollapsed && (
            <FlatList
              data={accounts.filter(a => a.role === 'doctor')}
              keyExtractor={i => i.id}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <TouchableOpacity onPress={() => openEdit(item)}>
                    <Avatar uri={item.photoURL} name={item.name} size={44} />
                  </TouchableOpacity>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.name}>{item.name || item.id}</Text>
                    <Text style={styles.sub}>
                      {item.email || item.phone || ''}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Button
                      title="Vai trò"
                      onPress={() => changeRole(item.id, 'patient')}
                    />
                    <View style={{ width: 8 }} />
                    <Button title="Sửa" onPress={() => openEdit(item)} />
                    <View style={{ width: 8 }} />
                    <TouchableOpacity onPress={() => onDelete(item.id)}>
                      <Text style={{ color: '#d00', fontWeight: '700' }}>
                        Xóa
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              ListEmptyComponent={() => (
                <View style={{ paddingVertical: 24 }}>
                  <Text style={{ color: '#666' }}>Không có bác sĩ.</Text>
                </View>
              )}
            />
          )}

          <Modal visible={editing} animationType="slide" transparent={true}>
            <View style={styles.modalBackdrop}>
              <View style={styles.modalContent}>
                <Text style={{ fontWeight: '700', marginBottom: 8 }}>
                  Sửa thông tin
                </Text>

                <Text style={styles.inputLabel}>Tên</Text>
                <TextInput
                  placeholder="Tên"
                  value={editName}
                  onChangeText={setEditName}
                  style={styles.input}
                />

                {/* Show role (patient/doctor) for full info */}
                <Text style={[styles.inputLabel, { marginTop: 4 }]}>
                  Vai trò
                </Text>
                <View
                  style={{
                    padding: 8,
                    backgroundColor: '#f6f6f6',
                    borderRadius: 6,
                    marginBottom: 8,
                  }}
                >
                  <Text>{editingUser?.role || '-'}</Text>
                </View>

                {/* Avatar - clickable to edit Photo URL (inline input) */}
                <View style={{ alignItems: 'center', marginBottom: 8 }}>
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

                {/* Inline small editor for Photo URL opened when avatar is tapped */}
                {showPhotoInput && (
                  <View style={styles.photoInputBox}>
                    <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                      <View style={{ flex: 1, marginRight: 6 }}>
                        <Button
                          title="Chọn từ thư viện"
                          onPress={pickFromLibrary}
                        />
                      </View>
                      <View style={{ flex: 1, marginLeft: 6 }}>
                        <Button title="Chụp ảnh" onPress={takePhoto} />
                      </View>
                    </View>

                    {uploadingPhoto ? (
                      <View style={{ alignItems: 'center' }}>
                        <ActivityIndicator />
                        <Text style={{ color: '#666', marginTop: 6 }}>
                          {uploadProgress}%
                        </Text>
                      </View>
                    ) : (
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'flex-end',
                        }}
                      >
                        <Button
                          title="Hủy"
                          onPress={() => {
                            setShowPhotoInput(false);
                            setPhotoInputText('');
                          }}
                        />
                        <View style={{ width: 8 }} />
                        <Button
                          title="Áp dụng"
                          onPress={() => {
                            // if admin typed a URL in photoInputText, use it
                            if (photoInputText) setEditPhoto(photoInputText);
                            setShowPhotoInput(false);
                            setPhotoInputText('');
                          }}
                        />
                      </View>
                    )}
                  </View>
                )}

                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  placeholder="Email"
                  value={editEmail}
                  onChangeText={setEditEmail}
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <Text style={styles.inputLabel}>Số điện thoại</Text>
                <TextInput
                  placeholder="Số điện thoại"
                  value={editPhone}
                  onChangeText={setEditPhone}
                  style={styles.input}
                  keyboardType="phone-pad"
                />

                <Text style={styles.inputLabel}>Tuổi</Text>
                <TextInput
                  placeholder="Tuổi"
                  value={editAge}
                  onChangeText={setEditAge}
                  style={styles.input}
                  keyboardType="numeric"
                />

                <Text style={styles.inputLabel}>Địa chỉ</Text>
                <TextInput
                  placeholder="Địa chỉ"
                  value={editAddress}
                  onChangeText={setEditAddress}
                  style={styles.input}
                />

                {editingUser?.role === 'doctor' ? (
                  <>
                    <Text style={styles.inputLabel}>Chuyên khoa</Text>
                    <TouchableOpacity
                      style={styles.pickerBox}
                      onPress={() => setSpecialtyPickerVisible(true)}
                    >
                      <Text>
                        {specialties.find(s => s.id === editSpecialtyId)
                          ?.name || 'Chọn chuyên khoa'}
                      </Text>
                    </TouchableOpacity>

                    <Modal
                      visible={specialtyPickerVisible}
                      animationType="slide"
                      transparent={true}
                      onRequestClose={() => setSpecialtyPickerVisible(false)}
                    >
                      <View style={styles.modalBackdrop}>
                        <View style={[styles.modalContent, { maxHeight: 420 }]}>
                          <Text style={{ fontWeight: '700', marginBottom: 8 }}>
                            Chọn chuyên khoa
                          </Text>
                          <FlatList
                            data={specialties}
                            keyExtractor={s => s.id}
                            renderItem={({ item }) => (
                              <TouchableOpacity
                                onPress={() => {
                                  setEditSpecialty(item.name || '');
                                  setEditSpecialtyId(item.id);
                                  setSpecialtyPickerVisible(false);
                                }}
                                style={styles.itemRow}
                              >
                                <Text style={styles.itemText}>{item.name}</Text>
                              </TouchableOpacity>
                            )}
                          />
                          <View
                            style={{
                              flexDirection: 'row',
                              justifyContent: 'flex-end',
                              marginTop: 8,
                            }}
                          >
                            <Button
                              title="Đóng"
                              onPress={() => setSpecialtyPickerVisible(false)}
                            />
                          </View>
                        </View>
                      </View>
                    </Modal>
                  </>
                ) : null}

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'flex-end',
                    marginTop: 8,
                  }}
                >
                  <Button
                    title="Hủy"
                    onPress={() => {
                      setEditing(false);
                      setEditingUser(null);
                    }}
                  />
                  <View style={{ width: 8 }} />
                  <Button title="Lưu" onPress={saveEdit} />
                </View>
              </View>
            </View>
          </Modal>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  name: { fontWeight: '700' },
  sub: { color: '#666', marginTop: 2 },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    marginTop: 8,
    marginBottom: 6,
  },
  sectionTitle: { fontWeight: '700', fontSize: 16 },
  sectionCount: { color: '#666' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: { elevation: 6 },
    }),
  },
  input: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 8,
  },
  inputLabel: { fontSize: 12, color: '#333', marginBottom: 4 },
  photoInputBox: {
    backgroundColor: '#fafafa',
    borderRadius: 8,
    padding: 8,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  pickerBox: {
    borderWidth: 1,
    borderColor: '#eee',
    padding: 10,
    borderRadius: 6,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  itemRow: {
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemText: { fontSize: 15 },
});
