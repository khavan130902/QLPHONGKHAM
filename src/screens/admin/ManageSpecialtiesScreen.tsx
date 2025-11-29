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
  Platform, // Dùng để xử lý shadow/elevation
} from 'react-native';
import Input from '@/components/Input';
import Button from '@/components/Button';
import db from '@/services/firestore';
import safeAlert from '@/utils/safeAlert';

// --- BẢNG MÀU MỚI ---
const COLORS = {
  primary: '#2596be', // Xanh Indigo
  accent: '#F44336', // Đỏ tươi
  background: '#F5F5F5', // Xám nền
  cardBackground: '#FFFFFF', // Nền Card/Item
  textPrimary: '#212121', // Chữ đậm
  textSecondary: '#757575', // Chữ phụ
  divider: '#E0E0E0', // Viền/Kẻ ngang
  success: '#4CAF50', // Xanh lá
};

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
      // Đảm bảo việc sắp xếp theo tên vẫn được giữ lại
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

  // Component Item riêng cho FlatList
  const renderSpecialtyItem = ({ item }: { item: any }) => (
    <View style={styles.itemContainer}>
      <Text style={styles.itemText}>{item.name}</Text>
      <View style={{ flexDirection: 'row' }}>
        <TouchableOpacity
          onPress={() => openEdit(item)}
          style={styles.actionButton}
        >
          <Text style={[styles.actionText, { color: COLORS.primary }]}>Sửa</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => remove(item)}
          style={[styles.actionButton, { marginLeft: 16 }]}
        >
          <Text style={[styles.actionText, { color: COLORS.accent }]}>Xóa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
          ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
        />
      )}

      {/* Modal - Create/Edit */}
      <Modal
        visible={modalVisible}
        animationType="fade" // Đổi từ 'slide' sang 'fade' cho cảm giác hiện đại hơn
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editing ? 'Sửa chuyên khoa' : 'Thêm chuyên khoa mới'}
            </Text>
            <Input
              placeholder="Nhập tên chuyên khoa"
              value={name}
              onChangeText={setName}
              style={{ marginBottom: 20 }}
            />
            <View style={styles.modalButtonRow}>
              <Button
                title="Hủy"
                onPress={() => setModalVisible(false)}
                style={{ backgroundColor: COLORS.textSecondary }}
              />
              <View style={{ width: 12 }} />
              <Button
                title="Lưu Lại"
                onPress={save}
                style={{ backgroundColor: COLORS.primary }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background, // Nền chung của màn hình
    paddingHorizontal: 16, // Giữ padding ngang
  },
  // --- HEADER STYLES ---
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    marginBottom: 8,
  },
  title: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: COLORS.textPrimary 
  },
  subtitle: { 
    color: COLORS.textSecondary, 
    marginTop: 4 
  },

  // --- LIST STYLES ---
  listContent: {
    paddingBottom: 20, // Khoảng cách cuối danh sách
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 150,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.cardBackground,
    padding: 16,
    borderRadius: 8,
    marginVertical: 6, // Khoảng cách giữa các item
    // Shadow cho Android và iOS
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
    height: 0, // Dùng itemContainer có margin để phân cách, bỏ separator
  },
  
  // --- MODAL STYLES ---
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', // Nền tối hơn
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12, // Góc bo tròn hơn
    padding: 24,
    // Thêm chút shadow cho modal nổi bật
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
    marginBottom: 16 
  },
  modalButtonRow: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end',
    marginTop: 12 
  },
});