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

export default function ManageRoomsScreen() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    loadRooms();
  }, []);

  async function loadRooms() {
    try {
      setLoading(true);
      const snap = await db.collection('rooms').orderBy('name').get();
      setRooms(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    } catch (e) {
      console.warn('load rooms', e);
      safeAlert('Lỗi', 'Không tải được phòng khám');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setName('');
    setNote('');
    setModalVisible(true);
  }

  function openEdit(item: any) {
    setEditing(item);
    setName(item.name || '');
    setNote(item.note || '');
    setModalVisible(true);
  }

  async function save() {
    if (!name.trim()) return safeAlert('Thông tin thiếu', 'Nhập tên phòng');
    try {
      if (editing) {
        await db
          .collection('rooms')
          .doc(editing.id)
          .set({ name: name.trim(), note: note.trim() }, { merge: true });
        safeAlert('Thành công', 'Cập nhật phòng khám');
      } else {
        await db.collection('rooms').add({
          name: name.trim(),
          note: note.trim(),
          created_at: new Date().toISOString(),
        });
        safeAlert('Thành công', 'Tạo phòng khám mới');
      }
      setModalVisible(false);
      await loadRooms();
    } catch (e) {
      console.warn('save room', e);
      safeAlert('Lỗi', 'Lưu phòng khám thất bại');
    }
  }

  function remove(item: any) {
    Alert.alert('Xác nhận', `Xóa phòng "${item.name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await db.collection('rooms').doc(item.id).delete();
            safeAlert('Đã xóa', 'Phòng khám đã được xóa');
            loadRooms();
          } catch (e) {
            console.warn('delete room', e);
            safeAlert('Lỗi', 'Không xóa được phòng');
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Quản lý phòng khám</Text>
        <Button title="Thêm" onPress={openCreate} />
      </View>
      <Text style={{ color: '#666', marginBottom: 12 }}>
        Danh sách phòng khám và chỉnh sửa
      </Text>

      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={r => r.id}
          renderItem={({ item }) => (
            <View style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemText}>{item.name}</Text>
                {item.note ? (
                  <Text style={{ color: '#666', marginTop: 4 }}>
                    {item.note}
                  </Text>
                ) : null}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
          ListEmptyComponent={() => (
            <View style={{ paddingVertical: 24 }}>
              <Text style={{ color: '#666' }}>Không có phòng khám.</Text>
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
              {editing ? 'Sửa phòng' : 'Thêm phòng'}
            </Text>
            <Input
              placeholder="Tên phòng"
              value={name}
              onChangeText={setName}
            />
            <Input
              placeholder="Ghi chú (tuỳ chọn)"
              value={note}
              onChangeText={setNote}
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
