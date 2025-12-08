import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // Sử dụng SafeAreaView
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
  danger: '#EF4444', // Màu đỏ cho Đăng xuất
  background: '#F8F9FA', // Nền tổng thể rất nhạt (Tương tự ManageShiftsScreen)
  cardBackground: '#FFFFFF', // Nền card trắng tinh
  textDark: '#1F2937', // Text tối
  textMuted: '#6C757D', // Text phụ
  border: '#E5E7EB', // Viền mỏng
  placeholder: '#A1A1AA',
  disabled: '#D1D5DB',
  success: '#10B981',
  shadowColor: '#000000',
};

// --- Component Picker Đơn giản để thay thế cho Input Chuyên khoa ---
const SimplePicker = ({ label, value, options, onSelect }: any) => {
  const [modalVisible, setModalVisible] = useState(false);
  const selected = options.find((o: any) => o.id === value);

  return (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.inputField, styles.pickerToggle]} // Đồng bộ style với input
        onPress={() => setModalVisible(true)}
      >
        <Text style={[styles.pickerText, !selected && { color: COLORS.placeholder }]}>
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
            <ScrollView style={{ maxHeight: 300, marginBottom: 15 }}>
              {options.map((option: any) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.pickerOption,
                    option.id === value && styles.pickerOptionSelected,
                  ]}
                  onPress={() => {
                    onSelect(option.id);
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.pickerOptionText}>
                    {option.name}
                  </Text>
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
  const { user, updateProfile, signOut } = useAuth() as any;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [imageUri, setImageUri] = useState('');
  const [age, setAge] = useState('');
  const [address, setAddress] = useState('');
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [tempImageUri, setTempImageUri] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [specialtyId, setSpecialtyId] = useState<string | null>(null);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);

  // ... [LOGIC KHỞI TẠO, LOAD CHUYÊN KHOA, LOGIC UPLOAD ẢNH GIỮ NGUYÊN] ...
  // LOGIC KHỞI TẠO
  useEffect(() => {
    (async () => {
      if (!user) return;
      const doc = await db.collection('users').doc(user.uid).get();
      const data = doc.data() as any;
      setName(data?.name || '');
      setPhone(data?.phoneNumber || user.phoneNumber || '');
      setImageUri(data?.photoURL || '');
      setSpecialtyId(data?.specialty_id || null);
      setEmail(data?.email || user.email || ''); // Lấy email từ user auth nếu không có trong firestore
      setRole(data?.role || '');
      setAge(data?.age ? String(data.age) : '');
      setAddress(data?.address || '');
    })();
  }, [user]);

  // LOGIC LOAD CHUYÊN KHOA
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
  }, [user, specialtyId]);

  // LOGIC LƯU
  async function onSave() {
    if (!updateProfile) return;
    setLoading(true);
    try {
      let photoURL: string | null = null;
      if (tempImageUri && /^https?:\/\//i.test(tempImageUri)) {
        photoURL = tempImageUri;
      }

      const payload: Record<string, any> = { name, phoneNumber: phone };
      if (age) payload.age = Number(age); 
      if (address) payload.address = address;
      if (photoURL) payload.photoURL = photoURL;
      if (specialtyId) payload.specialty_id = specialtyId;
      

      await updateProfile(payload);
      if (photoURL) setImageUri(photoURL);
      Alert.alert('Thành công 🎉', 'Cập nhật hồ sơ thành công.');
    } catch (err) {
      console.warn('update failed', err);
      Alert.alert('Lỗi ❌', 'Lỗi khi cập nhật hồ sơ.');
    } finally {
      setLoading(false);
    }
  }

  // LOGIC CHỌN/CHỤP ẢNH
  const safeAlert = (title: string, msg: string) => Alert.alert(title, msg);
  
  // Sử dụng logic pickFromLibrary và takePhoto đã có (đã loại bỏ vì quá dài, giữ nguyên nội dung gốc)
  async function pickFromLibrary() { /* ... */ }
  async function takePhoto() { /* ... */ }
  
  // LOGIC UPLOAD ẢNH TỰ ĐỘNG
  useEffect(() => {
    let mounted = true;
    async function doUpload() {
      if (!tempImageUri) return;
      if (/^https?:\/\//i.test(tempImageUri)) return; 
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
    if (user) doUpload();
    return () => {
      mounted = false;
    };
  }, [tempImageUri, user, updateProfile]);
    
  // LOGIC ĐĂNG XUẤT 
  async function handleSignOut() {
    Alert.alert('Xác nhận', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          try {
            if (signOut) await signOut();
          } catch (err) {
            console.warn('signOut failed', err);
            Alert.alert('Lỗi', 'Không thể đăng xuất');
          }
        },
      },
    ]);
  }


  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.scrollContainer} 
        contentContainerStyle={styles.contentContainer}
      >
        <Text style={styles.title}>Hồ sơ cá nhân</Text>
        
        {/* Khu vực Ảnh đại diện */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            onPress={() => {
              setTempImageUri(imageUri || '');
              setImageModalVisible(true);
            }}
            style={styles.avatarContainer}
            disabled={uploading}
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
<View style={styles.sectionDivider} /> 
{/* Thêm một đường phân cách nhẹ giữa Avatar và Card */}

        {/* Khu vực Thông tin cá nhân */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thông tin cơ bản</Text>
          
          {/* Họ và tên */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Họ và tên</Text>
            <Input 
              style={styles.inputField} 
              placeholder="Nhập họ và tên" 
              value={name} 
              onChangeText={setName} 
            />
          </View>

          {/* SĐT */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Số điện thoại</Text>
            <Input
              style={styles.inputField}
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
              style={styles.inputField}
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
              style={styles.inputField}
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
            <View style={[styles.inputField, styles.readOnlyField]}>
              <Text style={{ color: COLORS.textMuted }}>{email || 'Không có'}</Text>
            </View>
          </View>

          {/* Vai trò (Read-only) */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Vai trò</Text>
            <View style={[styles.inputField, styles.readOnlyField]}>
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
          textStyle={styles.saveButtonText}
        />
        
        {/* NÚT ĐĂNG XUẤT */}
        <Button
          title="Đăng xuất"
          onPress={handleSignOut}
          style={[styles.signOutButton, { backgroundColor: COLORS.danger }]}
          textStyle={styles.saveButtonText}
        />
        
        {/* Modal chọn ảnh (Giữ nguyên) */}
        <Modal
          visible={imageModalVisible}
          animationType="fade" 
          transparent={true}
          onRequestClose={() => setImageModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.imageModalContent}>
              <Text style={styles.imageModalTitle}>
                Thêm ảnh hồ sơ
              </Text>
              <View style={{ flexDirection: 'row', marginBottom: 12, gap: 12 }}>
                <TouchableOpacity style={styles.modalActionBtn} onPress={pickFromLibrary}>
                  <Icon name="image" size={24} color={COLORS.primary} />
                  <Text style={styles.modalActionTxt}>Thư viện</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalActionBtn} onPress={takePhoto}>
                  <Icon name="camera" size={24} color={COLORS.primary} />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: { 
    flex: 1, 
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  title: { 
    fontSize: 28, // Tăng font size
    fontWeight: '800', 
    marginBottom: 24, 
    color: COLORS.textDark 
  },
  
  // --- Avatar Section ---
  avatarSection: { 
    alignItems: 'center', 
    marginBottom: 16, 
    paddingVertical: 10,
  },
  avatarContainer: {
    position: 'relative',
    width: 110, // Tăng kích thước avatar
    height: 110,
    borderRadius: 55,
  },
  avatarImage: { 
    width: '100%', 
    height: '100%', 
    borderRadius: 55, 
    borderColor: COLORS.border,
    borderWidth: 3, // Viền dày hơn
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.disabled, // Nền xám cho placeholder
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    padding: 7, // Padding lớn hơn
    borderRadius: 20,
    borderWidth: 3, // Viền trắng nổi bật
    borderColor: COLORS.cardBackground,
  },
  avatarHint: { 
    color: COLORS.textMuted, 
    marginTop: 10, 
    fontSize: 14,
    fontWeight: '500',
  },
  uploadProgress: { 
    marginTop: 10, 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '10', // Nền xanh nhạt cho progress
  },
  uploadText: { 
    color: COLORS.primary, 
    fontSize: 13,
    fontWeight: '600'
  },
  sectionDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
    marginHorizontal: 10,
  },

  // --- Card Layout ---
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16, // Bo góc lớn hơn
    padding: 20,
    marginBottom: 20,
    // Shadow nhẹ và hiện đại
    ...Platform.select({
      ios: { 
        shadowColor: COLORS.shadowColor, 
        shadowOpacity: 0.05, 
        shadowRadius: 10, 
        shadowOffset: { width: 0, height: 4 } 
      },
      android: { 
        elevation: 5 
      },
    }),
  },
  cardTitle: {
    fontSize: 18, // Font size lớn hơn
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 16, // Khoảng cách lớn hơn
    // Bỏ borderBottomWidth
  },

  // --- Input Styles ---
  inputContainer: { 
    marginBottom: 15,
  },
  inputLabel: { 
    color: COLORS.textDark, // Chữ đậm hơn cho label
    marginBottom: 8, 
    fontWeight: '600',
    fontSize: 14,
  },
  inputField: { // Dùng chung cho Input, ReadOnly và Picker Toggle
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    borderRadius: 10,
    height: 50,
    backgroundColor: COLORS.background, // Nền xám nhạt cho tất cả fields
  },
  readOnlyField: {
    justifyContent: 'center',
    backgroundColor: COLORS.disabled + '30', // Xám nhạt hơn cho read only
    borderColor: COLORS.disabled,
  },
  saveButton: {
    marginTop: 5,
    borderRadius: 12,
    paddingVertical: 14,
    backgroundColor: COLORS.primary,
  },
  saveButtonText: {
    fontWeight: '700',
    fontSize: 16,
  },
  signOutButton: { 
    marginTop: 15,
    marginBottom: 20,
    borderRadius: 12,
    paddingVertical: 14,
  },

  // --- SimplePicker Styles ---
  pickerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  pickerText: {
    color: COLORS.textDark,
    fontSize: 15,
  },
  pickerOptionSelected: {
    backgroundColor: COLORS.primary + '10',
    borderRadius: 8,
  },
  pickerModal: {
    margin: 25,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
  },
  pickerModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 15,
    color: COLORS.textDark
  },
  pickerOption: {
    paddingVertical: 14,
    paddingHorizontal: 10,
    marginVertical: 2,
  },
  pickerOptionText: {
    fontSize: 16,
    color: COLORS.textDark,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },

  // --- Image Modal Styles ---
  imageModalContent: {
    margin: 40,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
  },
  imageModalTitle: { 
    fontWeight: '700', 
    marginBottom: 16, 
    fontSize: 18,
    color: COLORS.textDark
  },
  modalActionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardBackground,
  },
  modalActionTxt: {
    marginTop: 6,
    fontWeight: '600',
    color: COLORS.primary,
  },
});