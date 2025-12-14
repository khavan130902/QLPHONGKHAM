// file: ManageSpecialtiesScreen.tsx
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
  Platform, 
} from 'react-native';

import Input from '@/components/Input';
import Button from '@/components/Button';
import db from '@/services/firestore'; 
import safeAlert from '@/utils/safeAlert'; 

// --- BẢNG MÀU MỚI --- Định nghĩa màu sắc thống nhất
const COLORS = {
  primary: '#2596be', 
  accent: '#F44336',
  background: '#F5F5F5', 
  cardBackground: '#FFFFFF', 
  textPrimary: '#212121',
  textSecondary: '#757575', 
  divider: '#E0E0E0', 
  success: '#4CAF50',
};

export default function ManageSpecialtiesScreen() {
  // --- STATE MANAGEMENT ---
  const [specialties, setSpecialties] = useState<any[]>([]); // Danh sách chuyên khoa
  const [loading, setLoading] = useState(false); // Trạng thái tải dữ liệu
  const [modalVisible, setModalVisible] = useState(false); // Trạng thái hiển thị Modal
  const [editing, setEditing] = useState<any | null>(null); // Thông tin chuyên khoa đang chỉnh sửa (null nếu tạo mới)
  const [name, setName] = useState(''); // Tên chuyên khoa trong input

  // --- LIFECYCLE HOOK ---
  useEffect(() => {
    // Tải danh sách chuyên khoa khi component được mount
    loadSpecialties();
  }, []);

  // --- LOGIC: READ (Load Data) ---
  async function loadSpecialties() {
    try {
      setLoading(true);
      // Lấy dữ liệu từ Firestore và sắp xếp theo tên
      const snap = await db.collection('specialties').orderBy('name').get();
      // Ánh xạ (map) dữ liệu từ Firestore thành mảng state
      setSpecialties(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    } catch (e) {
      console.warn('load specialties', e);
      safeAlert('Lỗi', 'Không tải được chuyên khoa');
    } finally {
      setLoading(false);
    }
  }

  // --- LOGIC: CREATE (Open Modal) ---
  function openCreate() {
    setEditing(null); // Đặt trạng thái là tạo mới
    setName('');
    setModalVisible(true);
  }

  // --- LOGIC: UPDATE (Open Modal) ---
  function openEdit(item: any) {
    setEditing(item); // Lưu item đang sửa
    setName(item.name || '');
    setModalVisible(true);
  }

  // --- LOGIC: CREATE/UPDATE (Save Data) ---
  async function save() {
    if (!name.trim())
      return safeAlert('Thông tin thiếu', 'Nhập tên chuyên khoa');
    try {
      if (editing) {
        // Cập nhật chuyên khoa đã tồn tại (UPDATE)
        await db
          .collection('specialties')
          .doc(editing.id)
          .set({ name: name.trim() }, { merge: true });
        safeAlert('Thành công', 'Cập nhật chuyên khoa');
      } else {
        // Tạo chuyên khoa mới (CREATE)
        await db
          .collection('specialties')
          .add({ name: name.trim(), created_at: new Date().toISOString() });
        safeAlert('Thành công', 'Tạo chuyên khoa mới');
      }
      setModalVisible(false);
      await loadSpecialties(); // Tải lại danh sách sau khi lưu
    } catch (e) {
      console.warn('save specialty', e);
      safeAlert('Lỗi', 'Lưu chuyên khoa thất bại');
    }
  }

  // --- LOGIC: DELETE (Remove Data) ---
  function remove(item: any) {
    // Hiển thị hộp thoại xác nhận trước khi xóa
    Alert.alert('Xác nhận', `Xóa chuyên khoa "${item.name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await db.collection('specialties').doc(item.id).delete();
            safeAlert('Đã xóa', 'Chuyên khoa đã được xóa');
            loadSpecialties(); // Tải lại danh sách sau khi xóa
          } catch (e) {
            console.warn('delete specialty', e);
            safeAlert('Lỗi', 'Không xóa được chuyên khoa');
          }
        },
      },
    ]);
  }

  // --- COMPONENT CON: Item Chuyên Khoa cho FlatList ---
  const renderSpecialtyItem = ({ item }: { item: any }) => (
    <View style={styles.itemContainer}>
      <Text style={styles.itemText}>{item.name}</Text>
      <View style={{ flexDirection: 'row' }}>
        {/* Nút Sửa */}
        <TouchableOpacity
          onPress={() => openEdit(item)}
          style={styles.actionButton}
        >
          <Text style={[styles.actionText, { color: COLORS.primary }]}>Sửa</Text>
        </TouchableOpacity>
        {/* Nút Xóa */}
        <TouchableOpacity
          onPress={() => remove(item)}
          style={[styles.actionButton, { marginLeft: 16 }]}
        >
          <Text style={[styles.actionText, { color: COLORS.accent }]}>Xóa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // --- MAIN RENDER ---
  return (
    <View style={styles.container}>
      {/* Header Area */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Quản lý chuyên khoa</Text>
          <Text style={styles.subtitle}>
            Danh sách chuyên khoa và chỉnh sửa.
          </Text>
        </View>
        {/* Nút Thêm Mới */}
        <Button 
          title="➕ Thêm Mới" 
          onPress={openCreate} 
          style={{ backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10 }}
        />
      </View>

      {/* List Area */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={specialties}
          keyExtractor={s => s.id}
          renderItem={renderSpecialtyItem}
          contentContainerStyle={styles.listContent}
          // Sử dụng margin trên itemContainer thay vì ItemSeparatorComponent
          ItemSeparatorComponent={() => <View style={styles.listSeparator} />} 
        />
      )}

      {/* Modal - Create/Edit */}
      <Modal
        visible={modalVisible}
        animationType="fade" // Hiệu ứng mờ dần
        transparent={true}
        onRequestClose={() => setModalVisible(false)} // Cho phép đóng bằng nút Back (Android)
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editing ? 'Sửa chuyên khoa' : 'Thêm chuyên khoa mới'}
            </Text>
            {/* Input Tên chuyên khoa */}
            <Input
              placeholder="Nhập tên chuyên khoa"
              value={name}
              onChangeText={setName}
              style={{ marginBottom: 20 }}
            />
            {/* Hàng nút hành động trong Modal */}
            <View style={styles.modalButtonRow}>
              <Button
                title="Hủy"
                onPress={() => setModalVisible(false)}
                style={{ backgroundColor: COLORS.textSecondary }} // Nút Hủy màu xám phụ
              />
              <View style={{ width: 12 }} />
              <Button
                title="Lưu Lại"
                onPress={save}
                style={{ backgroundColor: COLORS.primary }} // Nút Lưu màu chủ đạo
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// --- STYLESHEET ---
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background, // Nền chung của màn hình
    paddingHorizontal: 16, 
  },
  // --- HEADER STYLES ---
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Căn chỉnh top cho content
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider, // Đường kẻ phân chia header
    marginBottom: 8,
  },
  title: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: COLORS.textPrimary // Tiêu đề chính
  },
  subtitle: { 
    color: COLORS.textSecondary, 
    marginTop: 4 // Tiêu đề phụ/mô tả
  },

  // --- LIST STYLES ---
  listContent: {
    paddingBottom: 20, 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 150, // Đảm bảo ActivityIndicator có đủ không gian
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.cardBackground,
    padding: 16,
    borderRadius: 8,
    marginVertical: 6, // Khoảng cách giữa các item
    // Đổ bóng cho item (Card)
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  itemText: { 
    fontSize: 16, 
    color: COLORS.textPrimary,
    fontWeight: '600',
    flex: 1, // Đảm bảo chiếm đủ không gian còn lại
  },
  actionButton: { 
    paddingVertical: 4, 
    paddingHorizontal: 8, 
  },
  actionText: { 
    fontWeight: '700', 
    fontSize: 14,
  },
  listSeparator: {
    height: 0, // Không dùng separator
  },
  
  // --- MODAL STYLES ---
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', 
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12, 
    padding: 24,
    // Đổ bóng cho Modal
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: COLORS.textPrimary, 
    marginBottom: 16 // Tiêu đề Modal
  },
  modalButtonRow: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end',
    marginTop: 12 
  },
});