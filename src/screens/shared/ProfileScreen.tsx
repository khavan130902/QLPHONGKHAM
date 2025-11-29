import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  ScrollView, // Dùng ScrollView
  Alert, // Dùng Alert thay cho safeAlert
} from 'react-native';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import db from '@/services/firestore';
import { uploadImage } from '@/services/storage';

// Import Icon (Giả định bạn dùng Feather Icons hoặc tương tự)
import Icon from '@react-native-vector-icons/feather';

// --- Color Palette Mới ---
const COLORS = {
  primary: '#2596be', // Xanh dương trung tính
  background: '#F9FAFB', // Nền sáng
  cardBackground: '#FFFFFF',
  textDark: '#1F2937', // Text tối
  textMuted: '#6B7280', // Text phụ
  border: '#E5E7EB',
  placeholder: '#A1A1AA',
  disabled: '#D1D5DB',
  success: '#10B981',
};

// --- Component Picker Đơn giản để thay thế cho Input Chuyên khoa ---
// *Trong thực tế, bạn sẽ cần một thư viện dropdown/picker chuyên dụng*
const SimplePicker = ({ label, value, options, onSelect }: any) => {
  const [modalVisible, setModalVisible] = useState(false);
  const selected = options.find((o: any) => o.id === value);

  return (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TouchableOpacity
        style={styles.pickerToggle}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.pickerText}>
          {selected ? selected.name : 'Chọn chuyên khoa'}
        </Text>
        <Icon name="chevron-down" size={18} color={COLORS.textMuted} />
      </TouchableOpacity>
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModal}>
            <Text style={styles.pickerModalTitle}>{label}</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {options.map((option: any) => (
                <TouchableOpacity
                  key={option.id}
                  style={styles.pickerOption}
                  onPress={() => {
                    onSelect(option.id);
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.pickerOptionText}>{option.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Button title="Đóng" onPress={() => setModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
};
// --- End SimplePicker ---

export default function ProfileScreen() {
  const { user, updateProfile } = useAuth() as any;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [imageUri, setImageUri] = useState('');
  const [age, setAge] = useState('');
  const [address, setAddress] = useState('');
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [tempImageUri, setTempImageUri] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [specialty, setSpecialty] = useState(''); // Text legacy
  const [specialtyId, setSpecialtyId] = useState<string | null>(null); // ID mới
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);

  // LOGIC KHỞI TẠO (GIỮ NGUYÊN)
  useEffect(() => {
    (async () => {
      if (!user) return;
      const doc = await db.collection('users').doc(user.uid).get();
      const data = doc.data() as any;
      setName(data?.name || '');
      setPhone(data?.phoneNumber || user.phoneNumber || '');
      setImageUri(data?.photoURL || '');
      setSpecialty('');
      setSpecialtyId(data?.specialty_id || null);
      setEmail(data?.email || '');
      setRole(data?.role || '');
      setAge(data?.age ? String(data.age) : '');
      setAddress(data?.address || '');
    })();
  }, [user]);

  // LOGIC LOAD CHUYÊN KHOA (GIỮ NGUYÊN)
  useEffect(() => {
    async function load() {
      try {
        const snap = await db.collection('specialties').orderBy('name').get();
        const arr = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        setSpecialties(arr);
        if (!specialtyId) {
          const doc = await db.collection('users').doc(user.uid).get();
          const data =
            doc.data && typeof doc.data === 'function'
              ? doc.data()
              : doc.data();
          const legacy = data?.specialty;
          if (legacy) {
            const found = arr.find(a => a.name === legacy);
            if (found) setSpecialtyId(found.id);
          }
        }
      } catch (e) {
        console.warn('load specialties', e);
      }
    }
    if (user) load();
  }, [user]);

  // LOGIC LƯU (GIỮ NGUYÊN)
  async function onSave() {
    if (!updateProfile) return;
    setLoading(true);
    try {
      let photoURL: string | null = null;
      if (tempImageUri && /^https?:\/\//i.test(tempImageUri)) {
        photoURL = tempImageUri;
      }

      const payload: Record<string, any> = { name, phoneNumber: phone };
      if (age) payload.age = Number(age); // Đảm bảo lưu là number
      if (address) payload.address = address;
      if (photoURL) payload.photoURL = photoURL;
      if (specialtyId) payload.specialty_id = specialtyId;

      await updateProfile(payload);
      if (photoURL) setImageUri(photoURL);
      Alert.alert('Thành công', 'Cập nhật hồ sơ thành công.');
    } catch (err) {
      console.warn('update failed', err);
      Alert.alert('Lỗi', 'Lỗi khi cập nhật hồ sơ.');
    } finally {
      setLoading(false);
    }
  }

  // LOGIC CHỌN/CHỤP ẢNH (GIỮ NGUYÊN)
  const safeAlert = (title: string, msg: string) => Alert.alert(title, msg);
  // Cần đảm bảo các hàm pickFromLibrary và takePhoto được định nghĩa hoặc import
  // Ở đây tôi giữ lại logic dùng `require` và thông báo lỗi.
  async function pickFromLibrary() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ImagePicker = require('react-native-image-picker');
      const options = { mediaType: 'photo', quality: 0.8 };
      ImagePicker.launchImageLibrary(options, (response: any) => {
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
          setTempImageUri(asset.uri);
          setImageModalVisible(false);
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
      ImagePicker.launchCamera(options, (response: any) => {
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
          setTempImageUri(asset.uri);
          setImageModalVisible(false);
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
  
  // LOGIC UPLOAD ẢNH TỰ ĐỘNG (GIỮ NGUYÊN)
  useEffect(() => {
    let mounted = true;
    async function doUpload() {
      if (!tempImageUri) return;
      if (/^https?:\/\//i.test(tempImageUri)) return; // already remote
      setUploading(true);
      setUploadProgress(0);
      try {
        const url = await uploadImage(
          tempImageUri,
          `users/${user?.uid || 'unknown'}_${Date.now()}.jpg`,
          (p: number) => {
            if (!mounted) return;
            setUploadProgress(p);
          },
        );
        if (!mounted) return;
        setTempImageUri(url);
        setImageUri(url);
        try {
          if (updateProfile) await updateProfile({ photoURL: url });
        } catch (e) {
          console.warn('failed to update profile after upload', e);
        }
      } catch (e: any) {
        console.warn('upload failed', e);
        const msg =
          (e && (e.message || e.toString())) || 'Không thể tải ảnh lên';
        safeAlert('Lỗi', msg);
      } finally {
        if (mounted) setUploading(false);
      }
    }
    doUpload();
    return () => {
      mounted = false;
    };
  }, [tempImageUri]);


  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Hồ sơ cá nhân</Text>

      {/* Khu vực Ảnh đại diện */}
      <View style={styles.avatarSection}>
        <TouchableOpacity
          onPress={() => {
            setTempImageUri(imageUri || '');
            setImageModalVisible(true);
          }}
          style={styles.avatarContainer}
        >
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
              <Icon name="user" size={40} color={COLORS.placeholder} />
            </View>
          )}
          <View style={styles.cameraIcon}>
            <Icon name="camera" size={18} color={COLORS.cardBackground} />
          </View>
        </TouchableOpacity>
        <Text style={styles.avatarHint}>
          Chạm để thay đổi ảnh
        </Text>
        {uploading ? (
          <View style={styles.uploadProgress}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.uploadText}>
              Đang tải lên: {Math.round(uploadProgress)}%
            </Text>
          </View>
        ) : null}
      </View>

      {/* Khu vực Thông tin cá nhân */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Thông tin cơ bản</Text>
        
        {/* Họ và tên */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Họ và tên</Text>
          <Input placeholder="Nhập họ và tên" value={name} onChangeText={setName} />
        </View>

        {/* SĐT */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Số điện thoại</Text>
          <Input
            placeholder="Nhập số điện thoại"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        {/* Tuổi */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Tuổi</Text>
          <Input
            placeholder="Nhập tuổi"
            value={age}
            onChangeText={setAge}
            keyboardType="numeric"
          />
        </View>

        {/* Địa chỉ */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Địa chỉ</Text>
          <Input
            placeholder="Nhập địa chỉ"
            value={address}
            onChangeText={setAddress}
          />
        </View>
      </View>

      {/* Khu vực Thông tin hệ thống */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Thông tin hệ thống</Text>
        
        {/* Email (Read-only) */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email</Text>
          <View style={[styles.readOnlyField]}>
            <Text style={{ color: COLORS.textMuted }}>{email || 'Không có'}</Text>
          </View>
        </View>

        {/* Vai trò (Read-only) */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Vai trò</Text>
          <View style={[styles.readOnlyField]}>
            <Text style={{ color: COLORS.textMuted }}>
                {role === 'doctor' ? 'Bác sĩ' : role === 'patient' ? 'Bệnh nhân' : role || 'Chưa xác định'}
            </Text>
          </View>
        </View>

        {/* Chuyên khoa (Dùng SimplePicker) */}
        {role === 'doctor' ? (
          <SimplePicker
            label="Chuyên khoa"
            value={specialtyId}
            options={specialties}
            onSelect={setSpecialtyId}
          />
        ) : null}
      </View>
      
      {/* Nút Lưu */}
      <Button 
        title={loading ? 'Đang lưu...' : 'Lưu Thay Đổi'} 
        onPress={onSave} 
        disabled={loading || uploading} 
        style={styles.saveButton}
      />
      
      {/* Modal chọn ảnh */}
      <Modal
        visible={imageModalVisible}
        animationType="fade" // Đổi thành fade cho cảm giác hiện đại hơn
        transparent={true}
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.imageModalContent}>
            <Text style={styles.imageModalTitle}>
              Thêm ảnh hồ sơ
            </Text>
            <View style={{ flexDirection: 'row', marginBottom: 8, gap: 12 }}>
              <TouchableOpacity style={styles.modalActionBtn} onPress={pickFromLibrary}>
                <Icon name="image" size={20} color={COLORS.primary} />
                <Text style={styles.modalActionTxt}>Thư viện</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalActionBtn} onPress={takePhoto}>
                <Icon name="camera" size={20} color={COLORS.primary} />
                <Text style={styles.modalActionTxt}>Chụp ảnh</Text>
              </TouchableOpacity>
            </View>
            <Button 
                title="Hủy" 
                onPress={() => setImageModalVisible(false)} 
                style={{backgroundColor: COLORS.disabled}}
                textStyle={{color: COLORS.textDark}}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  title: { 
    fontSize: 22, 
    fontWeight: '700', 
    marginBottom: 20, 
    color: COLORS.textDark 
  },
  
  // --- Avatar Section ---
  avatarSection: { 
    alignItems: 'center', 
    marginBottom: 24, 
    padding: 10,
  },
  avatarContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarImage: { 
    width: '100%', 
    height: '100%', 
    borderRadius: 50, 
    borderColor: COLORS.border,
    borderWidth: 2,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.border + '50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    padding: 6,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: COLORS.cardBackground,
  },
  avatarHint: { 
    color: COLORS.textMuted, 
    marginTop: 8, 
    fontSize: 13,
  },
  uploadProgress: { 
    marginTop: 10, 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: COLORS.border + '50',
  },
  uploadText: { 
    color: COLORS.textMuted, 
    fontSize: 12 
  },

  // --- Card Layout ---
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  // --- Input Styles ---
  inputContainer: { 
    marginVertical: 8 
  },
  inputLabel: { 
    color: COLORS.textMuted, 
    marginBottom: 6, 
    fontWeight: '600'
  },
  readOnlyField: {
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    borderRadius: 8,
    backgroundColor: COLORS.background, // Nền xám nhạt
    height: 48, // Đồng bộ với Input component
    justifyContent: 'center',
  },
  saveButton: {
    marginTop: 10,
  },

  // --- SimplePicker Styles ---
  pickerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    borderRadius: 8,
    backgroundColor: COLORS.cardBackground,
    height: 48,
  },
  pickerText: {
    color: COLORS.textDark,
    fontSize: 14,
  },
  pickerModal: {
    margin: 20,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 15,
    elevation: 5,
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
    color: COLORS.textDark
  },
  pickerOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerOptionText: {
    fontSize: 16,
    color: COLORS.textDark,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },

  // --- Image Modal Styles ---
  imageModalContent: {
    margin: 20,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 16,
  },
  imageModalTitle: { 
    fontWeight: '700', 
    marginBottom: 16, 
    fontSize: 16,
    color: COLORS.textDark
  },
  modalActionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  modalActionTxt: {
    marginTop: 4,
    fontWeight: '600',
    color: COLORS.primary,
  },
});