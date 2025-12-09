import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import safeAlert from '@/utils/safeAlert';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import db from '@/services/firestore';
import { uploadImage } from '@/services/storage';

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
  const [specialty, setSpecialty] = useState('');
  const [specialtyId, setSpecialtyId] = useState<string | null>(null);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const doc = await db.collection('users').doc(user.uid).get();
      const data = doc.data() as any;
      setName(data?.name || '');
      setPhone(data?.phoneNumber || user.phoneNumber || '');
      setImageUri(data?.photoURL || '');
      // prefer specialty_id; if legacy specialty exists try to map it below
      setSpecialty('');
      setSpecialtyId(data?.specialty_id || null);
      setEmail(data?.email || '');
      setRole(data?.role || '');
      setAge(data?.age ? String(data.age) : '');
      setAddress(data?.address || '');
    })();
  }, [user]);

  useEffect(() => {
    async function load() {
      try {
        const snap = await db.collection('specialties').orderBy('name').get();
        const arr = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        setSpecialties(arr);
        // If user's doc had legacy specialty text but no id, try to map it
        // (silent migration). If we previously loaded a legacy text into
        // `specialty`, map it to an id so UI uses the canonical id.
        if (!specialtyId) {
          // attempt to find by name from the collection
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
    load();
  }, []);

  async function onSave() {
    if (!updateProfile) return;
    setLoading(true);
    try {
      let photoURL: string | null = null;
      if (tempImageUri && /^https?:\/\//i.test(tempImageUri)) {
        // already a remote URL
        photoURL = tempImageUri;
      }

      const payload: Record<string, any> = { name, phoneNumber: phone };
      if (age) payload.age = age;
      if (address) payload.address = address;
      if (photoURL) payload.photoURL = photoURL;
      // prefer specialty_id for doctors; do NOT write legacy `specialty` field
      if (specialtyId) payload.specialty_id = specialtyId;

      await updateProfile(payload);
      // reflect locally
      if (photoURL) setImageUri(photoURL);
      safeAlert('Thành công', 'Cập nhật thành công');
    } catch (err) {
      console.warn('update failed', err);
      safeAlert('Lỗi', 'Lỗi khi cập nhật');
    } finally {
      setLoading(false);
    }
  }

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

  // When a local tempImageUri is set (file:// or content://), auto-upload it
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
        // set temp to remote URL so save flow or other UI can use it
        setTempImageUri(url);
        setImageUri(url);
        // update Firestore + Auth immediately
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
    <View style={styles.container}>
      <Text style={styles.title}>Hồ sơ cá nhân</Text>
      <View style={{ alignItems: 'center', marginBottom: 12 }}>
        <TouchableOpacity
          onPress={() => {
            setTempImageUri(imageUri || '');
            setImageModalVisible(true);
          }}
        >
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={{ width: 96, height: 96, borderRadius: 48 }}
            />
          ) : (
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                backgroundColor: '#EEE',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#666' }}>Ảnh</Text>
            </View>
          )}
        </TouchableOpacity>
        <Text style={{ color: '#666', marginTop: 8 }}>
          Chạm để thêm/đổi ảnh hồ sơ
        </Text>
        {uploading ? (
          <View style={{ marginTop: 8, alignItems: 'center' }}>
            <ActivityIndicator size="small" />
            <Text style={{ color: '#666', marginTop: 6 }}>
              {uploadProgress}%
            </Text>
          </View>
        ) : null}
        {/* image URL hidden for privacy / cleaner UI */}
      </View>
      <View style={{ marginVertical: 8 }}>
        <Text style={{ color: '#666', marginBottom: 6 }}>Họ và tên</Text>
        <Input placeholder="Họ và tên" value={name} onChangeText={setName} />
      </View>

      <View style={{ marginVertical: 8 }}>
        <Text style={{ color: '#666', marginBottom: 6 }}>Số điện thoại</Text>
        <Input
          placeholder="Số điện thoại"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
      </View>

      <View style={{ marginVertical: 8 }}>
        <Text style={{ color: '#666', marginBottom: 6 }}>Tuổi</Text>
        <Input
          placeholder="Tuổi"
          value={age}
          onChangeText={setAge}
          keyboardType="numeric"
        />
      </View>

      <View style={{ marginVertical: 8 }}>
        <Text style={{ color: '#666', marginBottom: 6 }}>Địa chỉ</Text>
        <Input
          placeholder="Địa chỉ"
          value={address}
          onChangeText={setAddress}
        />
      </View>

      <View style={{ marginVertical: 8 }}>
        <Text style={{ color: '#666', marginBottom: 6 }}>Email</Text>
        <View
          style={{
            borderWidth: 1,
            borderColor: '#eee',
            padding: 12,
            borderRadius: 8,
            backgroundColor: '#f9f9f9',
          }}
        >
          <Text>{email || '-'}</Text>
        </View>
      </View>

      <View style={{ marginVertical: 8 }}>
        <Text style={{ color: '#666', marginBottom: 6 }}>Vai trò</Text>
        <View
          style={{
            borderWidth: 1,
            borderColor: '#eee',
            padding: 12,
            borderRadius: 8,
            backgroundColor: '#f9f9f9',
          }}
        >
          <Text>{role || '-'}</Text>
        </View>
      </View>

      {role === 'doctor' ? (
        <View style={{ marginVertical: 8 }}>
          <Text style={{ color: '#666', marginBottom: 6 }}>Chuyên khoa</Text>
          <Input
            placeholder="Chuyên khoa"
            value={specialty}
            onChangeText={setSpecialty}
          />
        </View>
      ) : null}
      <Button title="Lưu" onPress={onSave} disabled={loading} />
      <Modal
        visible={imageModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.4)',
          }}
        >
          <View
            style={{
              margin: 20,
              backgroundColor: '#fff',
              borderRadius: 8,
              padding: 16,
            }}
          >
            <Text style={{ fontWeight: '700', marginBottom: 8 }}>
              Thêm ảnh hồ sơ
            </Text>
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              <View style={{ flex: 1, marginRight: 6 }}>
                <Button title="Chọn từ thư viện" onPress={pickFromLibrary} />
              </View>
              <View style={{ flex: 1, marginLeft: 6 }}>
                <Button title="Chụp ảnh" onPress={takePhoto} />
              </View>
            </View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                marginTop: 12,
              }}
            >
              <Button title="Hủy" onPress={() => setImageModalVisible(false)} />
              <View style={{ width: 8 }} />
              <Button
                title="Lưu"
                onPress={() => {
                  // tempImageUri already updated by picker or input
                  setImageModalVisible(false);
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
});
