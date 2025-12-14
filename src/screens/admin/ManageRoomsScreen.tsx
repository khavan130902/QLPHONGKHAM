// file: ManageRoomsScreen.tsx
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
  SafeAreaView, 
  Platform,
} from 'react-native';


import Input from '@/components/Input'; 
import Button from '@/components/Button'; 
import Icon from '@react-native-vector-icons/feather';
import db from '@/services/firestore'; 
import safeAlert from '@/utils/safeAlert'; 
// Bảng màu được cung cấp - Định nghĩa màu sắc thống nhất cho ứng dụng
const COLORS = {
  primary: '#2596be',       
  secondary: '#1F7A8C',      
  background: '#f8f9fa',    
  cardBackground: '#ffffff', 
  textDark: '#1c1c1c',      
  textLight: '#4a4a4a',     
  subtitle: '#777777',      
  shadowColor: '#000000',
  borderColor: '#E5E7EB',
  danger: '#d00',           
  lightGray: '#f6f6f6',     
};

export default function ManageRoomsScreen() {
  // --- STATE MANAGEMENT ---
  const [rooms, setRooms] = useState<any[]>([]); // Danh sách các phòng khám
  const [loading, setLoading] = useState(false); // Trạng thái tải dữ liệu
  const [modalVisible, setModalVisible] = useState(false); // Trạng thái hiển thị Modal Thêm/Sửa
  const [editing, setEditing] = useState<any | null>(null); // Lưu thông tin phòng đang sửa (nếu null là đang tạo mới)
  const [name, setName] = useState(''); // Tên phòng
  const [note, setNote] = useState(''); // Ghi chú phòng

  // --- LIFECYCLE HOOK ---
  useEffect(() => {
    // Tải danh sách phòng khám 
    loadRooms();
  }, []);

  // --- LOGIC: READ (Load Data) ---
  async function loadRooms() {
    try {
      setLoading(true);
      // Lấy dữ liệu từ collection 'rooms' và sắp xếp theo tên
      const snap = await db.collection('rooms').orderBy('name').get();
      // Ánh xạ (map) dữ liệu từ Firestore thành mảng state
      setRooms(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    } catch (e) {
      console.warn('load rooms', e);
      safeAlert('Lỗi', 'Không tải được phòng khám');
    } finally {
      setLoading(false);
    }
  }

  // --- LOGIC: CREATE (Open Modal) ---
  function openCreate() {
    setEditing(null); // Đặt trạng thái là tạo mới
    setName('');
    setNote('');
    setModalVisible(true);
  }

  // --- LOGIC: UPDATE (Open Modal) ---
  function openEdit(item: any) {
    setEditing(item); // Lưu thông tin item đang sửa
    setName(item.name || '');
    setNote(item.note || '');
    setModalVisible(true);
  }

  // --- LOGIC: CREATE/UPDATE (Save Data) ---
  async function save() {
    if (!name.trim()) return safeAlert('Thông tin thiếu', 'Nhập tên phòng');
    try {
      if (editing) {
        // Cập nhật phòng khám đã tồn tại (UPDATE)
        await db
          .collection('rooms')
          .doc(editing.id)
          .set({ name: name.trim(), note: note.trim() }, { merge: true });
        safeAlert('Thành công', 'Cập nhật phòng khám');
      } else {
        // Tạo phòng khám mới (CREATE)
        await db.collection('rooms').add({
          name: name.trim(),
          note: note.trim(),
          created_at: new Date().toISOString(),
        });
        safeAlert('Thành công', 'Tạo phòng khám mới');
      }
      setModalVisible(false);
      await loadRooms(); // Tải lại danh sách sau khi lưu thành công
    } catch (e) {
      console.warn('save room', e);
      safeAlert('Lỗi', 'Lưu phòng khám thất bại');
    }
  }

  // --- LOGIC: DELETE (Remove Data) ---
  function remove(item: any) {
    // Hiển thị hộp thoại xác nhận trước khi xóa
    Alert.alert('Xác nhận', `Xóa phòng "${item.name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive', // Đánh dấu đây là hành động nguy hiểm
        onPress: async () => {
          try {
            await db.collection('rooms').doc(item.id).delete();
            safeAlert('Đã xóa', 'Phòng khám đã được xóa');
            loadRooms(); // Tải lại danh sách sau khi xóa thành công
          } catch (e) {
            console.warn('delete room', e);
            safeAlert('Lỗi', 'Không xóa được phòng');
          }
        },
      },
    ]);
  }

  // --- COMPONENT CON: Room Item (Render trong FlatList) ---
  const RoomItem = ({ item }: { item: any }) => (
    <View style={styles.itemRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemText}>{item.name}</Text>
        {item.note ? (
          // Hiển thị ghi chú nếu có
          <Text style={styles.itemNoteText} numberOfLines={1}>
            {item.note}
          </Text>
        ) : null}
      </View>
      <View style={styles.actionButtons}>
        {/* Nút Sửa: Dùng Icon */}
        <TouchableOpacity
          onPress={() => openEdit(item)}
          style={styles.actionLink}
        >
          <Icon name="edit" size={18} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={{ width: 12 }} />
        {/* Nút Xóa: Dùng Icon */}
        <TouchableOpacity
          onPress={() => remove(item)}
          style={styles.actionLink}
        >
          <Icon name="trash-2" size={18} color={COLORS.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );

  // --- MAIN RENDER ---
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* KHU VỰC HEADER: Title và Nút Thêm */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Quản lý Phòng Khám</Text>
          
          {/* Nút Thêm (Dùng TouchableOpacity tùy chỉnh để dễ dàng kết hợp Icon và Text) */}
          <TouchableOpacity 
            onPress={openCreate} 
            style={[styles.addButton, { backgroundColor: COLORS.primary }]}
          >
            <Icon name="plus" size={16} color={COLORS.cardBackground} style={{ marginRight: 4 }} />
            <Text style={styles.addButtonText}>Thêm</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitleText}>
          Danh sách các phòng khám hiện tại.
        </Text>

        {/* HIỂN THỊ DANH SÁCH HOẶC LOADING */}
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} size="large" />
        ) : (
          <FlatList
            data={rooms}
            keyExtractor={r => r.id}
            renderItem={RoomItem}
            // Style cho trường hợp danh sách rỗng để căn giữa nội dung
            contentContainerStyle={rooms.length === 0 && styles.emptyListContainer}
            // Component hiển thị khi danh sách rỗng
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Icon name="clipboard" size={50} color={COLORS.borderColor} style={{ marginBottom: 10 }} />
                <Text style={styles.emptyText}>Chưa có phòng khám nào được thiết lập.</Text>
                <Text style={styles.emptySubText}>Hãy thêm phòng khám đầu tiên của bạn.</Text>
              </View>
            )}
          />
        )}

        {/* MODAL THÊM/SỬA PHÒNG KHÁM */}
        <Modal
          visible={modalVisible}
          animationType="fade" // Hiệu ứng mờ dần
          transparent={true}
          onRequestClose={() => setModalVisible(false)} // Cho phép đóng bằng nút Back (Android)
        >
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setModalVisible(false)} // Đóng modal khi chạm vào backdrop
          >
            <TouchableOpacity 
              style={styles.modalContent} 
              activeOpacity={1} // Ngăn chặn sự kiện chạm (từ backdrop) lan vào nội dung modal
            >
              <Text style={styles.modalTitle}>
                {editing ? 'Chỉnh Sửa Phòng Khám' : 'Thêm Phòng Khám Mới'}
              </Text>
              
              {/* Input Tên phòng */}
              <Input
                placeholder="Tên phòng (Bắt buộc)"
                value={name}
                onChangeText={setName}
                style={styles.inputStyle}
                placeholderTextColor={COLORS.textLight}
              />
              
              {/* Input Ghi chú */}
              <Input
                placeholder="Ghi chú (Ví dụ: Tầng 1, Khu A)"
                value={note}
                onChangeText={setNote}
                style={[styles.inputStyle, styles.inputMultiline]} // Áp dụng style cho multiline
                placeholderTextColor={COLORS.textLight}
                multiline={true}
                numberOfLines={3}
              />

              {/* KHU VỰC NÚT HÀNH ĐỘNG CỦA MODAL */}
              <View style={styles.modalActions}>
                <Button 
                  title="Hủy" 
                  onPress={() => setModalVisible(false)} 
                  style={[{ backgroundColor: COLORS.subtitle }, styles.modalButton]}
                  textStyle={[styles.modalButtonText, { color: COLORS.cardBackground }]}
                />
                <View style={{ width: 12 }} />
                <Button 
                  title={editing ? "Cập Nhật" : "Lưu"}
                  onPress={save} 
                  style={[{ backgroundColor: COLORS.primary }, styles.modalButton]}
                  textStyle={[styles.modalButtonText, { color: COLORS.cardBackground }]}
                />
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

// --- STYLESHEET ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, paddingHorizontal: 16, backgroundColor: COLORS.background },
  
  // --- Header ---
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 4,
  },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.textDark },
  subtitleText: { color: COLORS.subtitle, marginBottom: 16, fontSize: 14 },
  addButton: { 
    flexDirection: 'row', // Sắp xếp Icon và Text theo chiều ngang
    alignItems: 'center',
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 8 ,
  },
  addButtonText: { 
    fontWeight: '700', 
    fontSize: 14 ,
    color: COLORS.cardBackground, 
  },
  
  // --- List Item (Mỗi phòng khám) ---
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderColor,
    marginBottom: 10,
    backgroundColor: COLORS.cardBackground,
    // Style đổ bóng
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemText: { 
    fontSize: 17, 
    fontWeight: '600', 
    color: COLORS.textDark 
  },
  itemNoteText: { 
    color: COLORS.textLight, 
    marginTop: 4, 
    fontSize: 13,
  },
  
  // --- Actions in Row ---
  actionButtons: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginLeft: 10 
  },
  actionLink: { 
    padding: 4, // Vùng chạm nhỏ cho Icon
  },

  // --- Empty List ---
  emptyListContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingVertical: 50 
  },
  emptyContainer: { 
    paddingVertical: 40, 
    alignItems: 'center' 
  },
  emptyText: { 
    color: COLORS.textLight, 
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
  },
  emptySubText: {
    color: COLORS.subtitle, 
    fontSize: 14,
    marginTop: 5,
  },
  
  // --- Modal ---
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)', // Lớp phủ mờ (semi-transparent overlay)
    padding: 20,
  },
  modalContent: {
    margin: 20,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 20,
    // Style đổ bóng đa nền tảng
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: { elevation: 15 },
    }),
  },
  modalTitle: { 
    fontWeight: '800', 
    fontSize: 20, 
    marginBottom: 20, 
    color: COLORS.textDark,
    textAlign: 'center',
  },
  modalActions: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 20 
  },
  modalButton: { 
    flex: 1, 
    paddingVertical: 12, 
    borderRadius: 10, 
  },
  modalButtonText: {
    fontWeight: '700',
    fontSize: 16, 
  },

  // --- Input Styles in Modal ---
  inputStyle: {
    borderWidth: 1,
    borderColor: COLORS.borderColor,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12, 
    marginBottom: 15,
    backgroundColor: COLORS.cardBackground,
    color: COLORS.textDark,
    fontSize: 15,
  },
  // Style riêng cho input multiline (ghi chú)
  inputMultiline: {
    minHeight: 80, // Chiều cao tối thiểu cho phép nhập nhiều dòng
    textAlignVertical: 'top', // Căn chỉnh text lên trên cho Android
    paddingTop: 14, // Đảm bảo padding trên (top) ổn định cho iOS và Android
  }
});