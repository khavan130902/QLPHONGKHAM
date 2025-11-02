import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Input from '@/components/Input';
import Button from '@/components/Button';
import db from '@/services/firestore';
import safeAlert from '@/utils/safeAlert';

export default function ManageSpecialtiesScreen() {
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [name, setName] = useState('');

  useEffect(() => {
    loadSpecialties();
  }, []);

  async function loadSpecialties() {
    try {
      setLoading(true);
      const snap = await db.collection('specialties').orderBy('name').get();
      setSpecialties(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    } catch (e) {
      console.warn('load specialties', e);
      safeAlert('Lỗi', 'Không tải được chuyên khoa');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setName('');
    setModalVisible(true);
  }

  function openEdit(item: any) {
    setEditing(item);
    setName(item.name || '');
    setModalVisible(true);
  }

  async function save() {
    if (!name.trim())
      return safeAlert('Thông tin thiếu', 'Nhập tên chuyên khoa');
    try {
      if (editing) {
        await db
          .collection('specialties')
          .doc(editing.id)
          .set({ name: name.trim() }, { merge: true });
        safeAlert('Thành công', 'Cập nhật chuyên khoa');
      } else {
        await db
          .collection('specialties')
          .add({ name: name.trim(), created_at: new Date().toISOString() });
        safeAlert('Thành công', 'Tạo chuyên khoa mới');
      }
      setModalVisible(false);
      await loadSpecialties();
    } catch (e) {
      console.warn('save specialty', e);
      safeAlert('Lỗi', 'Lưu chuyên khoa thất bại');
    }
  }

  function remove(item: any) {
    Alert.alert('Xác nhận', `Xóa chuyên khoa "${item.name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await db.collection('specialties').doc(item.id).delete();
            safeAlert('Đã xóa', 'Chuyên khoa đã được xóa');
            loadSpecialties();
          } catch (e) {
            console.warn('delete specialty', e);
            safeAlert('Lỗi', 'Không xóa được chuyên khoa');
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Quản lý chuyên khoa</Text>
        <Button title="Thêm" onPress={openCreate} />
      </View>
      <Text style={{ color: '#666', marginBottom: 12 }}>
        Danh sách chuyên khoa và chỉnh sửa.
      </Text>

      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={specialties}
          keyExtractor={s => s.id}
          renderItem={({ item }) => (
            <View style={styles.itemRow}>
              <Text style={styles.itemText}>{item.name}</Text>
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity
                  onPress={() => openEdit(item)}
                  style={styles.linkButton}
                >
                  <Text style={styles.linkText}>Sửa</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => remove(item)}
                  style={styles.linkButton}
                >
                  <Text style={[styles.linkText, { color: '#d32f2f' }]}>
                    Xóa
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={{ fontWeight: '700', marginBottom: 8 }}>
              {editing ? 'Sửa chuyên khoa' : 'Thêm chuyên khoa'}
            </Text>
            <Input
              placeholder="Tên chuyên khoa"
              value={name}
              onChangeText={setName}
            />
            <View style={{ flexDirection: 'row', marginTop: 12 }}>
              <Button title="Lưu" onPress={save} />
              <View style={{ width: 8 }} />
              <Button title="Hủy" onPress={() => setModalVisible(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: { fontSize: 18, fontWeight: '700' },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  itemText: { fontSize: 16 },
  linkButton: { marginLeft: 12, paddingVertical: 4, paddingHorizontal: 6 },
  linkText: { color: '#1976d2', fontWeight: '600' },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    margin: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
  },
});
