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
  // Thêm SafeAreaView để xử lý tốt hơn trên iOS và các thiết bị có notch
  SafeAreaView, 
  Platform,
} from 'react-native';
// Giả định Input và Button đã được import từ đường dẫn của bạn
import Input from '@/components/Input'; 
import Button from '@/components/Button';
import db from '@/services/firestore';
import safeAlert from '@/utils/safeAlert';

// Bảng màu được cung cấp
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
      // Giữ nguyên logic load và sắp xếp phòng khám
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
      // Giữ nguyên logic lưu
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
    // Giữ nguyên logic xác nhận và xóa
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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Quản lý phòng khám</Text>
          <Button 
            title="➕ Thêm" 
            onPress={openCreate} 
            // 🟢 Áp dụng màu chủ đạo cho nút Thêm
            style={[{ backgroundColor: COLORS.primary }, styles.addButton]}
            textStyle={[{ color: COLORS.cardBackground }, styles.addButtonText]}
          />
        </View>
        <Text style={styles.subtitleText}>
          Danh sách phòng khám và chỉnh sửa
        </Text>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={rooms}
            keyExtractor={r => r.id}
            renderItem={({ item }) => (
              <View style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemText}>{item.name}</Text>
                  {item.note ? (
                    <Text style={styles.itemNoteText}>
                      {item.note}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    onPress={() => openEdit(item)}
                    style={styles.actionLink}
                  >
                    <Text style={styles.actionLinkText}>Sửa</Text>
                  </TouchableOpacity>
                  <View style={{ width: 12 }} />
                  <TouchableOpacity
                    onPress={() => remove(item)}
                    style={styles.actionLink}
                  >
                    <Text style={[styles.actionLinkText, { color: COLORS.danger }]}>
                      Xóa
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Không có phòng khám nào được thêm.</Text>
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
              <Text style={styles.modalTitle}>
                {editing ? 'Sửa phòng khám' : 'Thêm phòng khám mới'}
              </Text>
              {/* Giả định component Input có thể nhận style để thay đổi màu */}
              <Input
                placeholder="Tên phòng"
                value={name}
                onChangeText={setName}
                style={styles.inputStyle}
              />
              <Input
                placeholder="Ghi chú (tuỳ chọn)"
                value={note}
                onChangeText={setNote}
                style={styles.inputStyle}
              />
              <View style={styles.modalActions}>
                <Button 
                  title="Hủy" 
                  onPress={() => setModalVisible(false)} 
                  // 🟢 Nút Hủy
                  style={[{ backgroundColor: COLORS.subtitle }, styles.modalButton]}
                  textStyle={[{ color: COLORS.cardBackground }, styles.modalButtonText]}
                />
                <View style={{ width: 12 }} />
                <Button 
                  title="Lưu" 
                  onPress={save} 
                  // 🟢 Nút Lưu
                  style={[{ backgroundColor: COLORS.primary }, styles.modalButton]}
                  textStyle={[{ color: COLORS.cardBackground }, styles.modalButtonText]}
                />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, padding: 16, backgroundColor: COLORS.background },
  
  // --- Header ---
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.textDark },
  subtitleText: { color: COLORS.subtitle, marginBottom: 16, fontSize: 14 },
  addButton: { 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 8 
  },
  addButtonText: { 
    fontWeight: '700', 
    fontSize: 14 
  },
  
  // --- List Item ---
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderColor,
    marginBottom: 10,
    backgroundColor: COLORS.cardBackground,
    // Thêm shadow nhẹ cho item
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: COLORS.textDark 
  },
  itemNoteText: { 
    color: COLORS.subtitle, 
    marginTop: 4, 
    fontSize: 13 
  },
  
  // --- Actions in Row ---
  actionButtons: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginLeft: 10 
  },
  actionLink: { 
    paddingVertical: 4, 
    paddingHorizontal: 6 
  },
  actionLinkText: { 
    color: COLORS.primary, 
    fontWeight: '700', 
    fontSize: 14 
  },

  // --- Empty List ---
  emptyContainer: { 
    paddingVertical: 40, 
    alignItems: 'center' 
  },
  emptyText: { 
    color: COLORS.subtitle, 
    fontSize: 16 
  },
  
  // --- Modal ---
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 20,
  },
  modalContent: {
    margin: 20,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 16,
    // Shadow cho modal content
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
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
  modalActions: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    marginTop: 16 
  },
  modalButton: { 
    flex: 1, // Để các nút có cùng chiều rộng
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalButtonText: {
    fontWeight: '700',
    fontSize: 15,
  },

  // --- Input Styles in Modal ---
  inputStyle: {
    borderWidth: 1,
    borderColor: COLORS.borderColor,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    marginBottom: 12,
    backgroundColor: COLORS.lightGray,
    color: COLORS.textDark,
  },
});