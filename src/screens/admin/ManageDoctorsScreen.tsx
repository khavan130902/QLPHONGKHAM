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
    SafeAreaView,
    ScrollView,
    Dimensions,
} from 'react-native';

import Icon from '@react-native-vector-icons/feather'; 
import Avatar from '@/components/Avatar';
import Button from '@/components/Button'; // Đã sửa lỗi style/textStyle trong file Button.tsx
import db from '@/services/firestore';
import safeAlert from '@/utils/safeAlert';
import { uploadImage } from '@/services/storage';

// Bảng màu đồng bộ (giữ nguyên nhưng thêm một số biến hiện đại)
const COLORS = {
    primary: '#2596be', // Màu xanh chủ đạo
    secondary: '#1F7A8C', // Màu xanh đậm hơn cho tương phản
    background: '#f8f9fa', // Nền tổng thể rất nhạt
    cardBackground: '#ffffff', // Nền card trắng
    textDark: '#1c1c1c',
    textLight: '#4a4a4a',
    subtitle: '#777777',
    shadowColor: '#000000',
    borderColor: '#E5E7EB',
    danger: '#d00',
    lightGray: '#f6f6f6',
    success: '#34C759',
};

// Style bóng đổ nhất quán
const SHADOW_STYLE = {
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
};

const SCREEN_HEIGHT = Dimensions.get('window').height;

// Component con RenderItem (Cập nhật giao diện Card hiện đại hơn)
const AccountItem = ({ item, changeRole, openEdit, onDelete }: any) => {
    const isDoctor = item.role === 'doctor';
    const newRole = isDoctor ? 'patient' : 'doctor';
    const roleLabel = isDoctor ? 'Bác sĩ' : 'Bệnh nhân';
    const newRoleLabel = isDoctor ? 'Bệnh nhân' : 'Bác sĩ';
    const roleColor = isDoctor ? COLORS.primary : COLORS.secondary;

    return (
        <View style={styles.itemCard}>
            <View style={styles.itemHeader}>
                {/* Avatar có thể bấm để sửa */}
                <TouchableOpacity onPress={() => openEdit(item)}>
                    <Avatar uri={item.photoURL} name={item.name} size={56} />
                </TouchableOpacity>

                <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={1}>{item.name || 'Chưa đặt tên'}</Text>
                    {/* Role Tag */}
                    <View style={[styles.roleTag, { backgroundColor: roleColor + '15' }]}>
                        <Icon 
                            name={isDoctor ? 'heart' : 'user'} 
                            size={12} 
                            color={roleColor} 
                            style={{ marginRight: 4 }} 
                        />
                        <Text style={[styles.roleTagText, { color: roleColor }]}>{roleLabel}</Text>
                    </View>
                    {isDoctor && item.specialty && (
                        <Text style={styles.itemSpecialty}>Chuyên khoa: {item.specialty}</Text>
                    )}
                </View>
            </View>
            
            <Text style={styles.itemSub}>{item.email || item.phoneNumber || 'Không có liên hệ'}</Text>

            {/* Vùng hành động */}
            <View style={styles.itemActions}>
                {/* Nút Đổi vai trò */}
                <Button
                    title={`Đổi sang ${newRoleLabel}`}
                    onPress={() => changeRole(item.id, newRole)}
                    style={[styles.actionButton, { backgroundColor: COLORS.secondary }]}
                    textStyle={styles.actionButtonText}
                />
                <View style={{ width: 10 }} />
                {/* Nút Sửa */}
                <Button
                    title="Sửa"
                    onPress={() => openEdit(item)}
                    style={[styles.actionButton, { backgroundColor: COLORS.textLight, minWidth: 60 }]}
                    textStyle={styles.actionButtonText}
                />
                <View style={{ width: 10 }} />
                {/* Nút Xóa (Chỉ Icon) */}
                <TouchableOpacity 
                    onPress={() => onDelete(item.id)}
                    style={styles.deleteIconButton}
                >
                    <Icon name="trash-2" size={18} color={COLORS.danger} />
                </TouchableOpacity>
            </View>
        </View>
    );
};


// ----------------------------------------------------------------------
// MAIN COMPONENT
// ----------------------------------------------------------------------

export default function ManageDoctorsScreen() {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const [patientsCollapsed, setPatientsCollapsed] = useState(false);
    const [doctorsCollapsed, setDoctorsCollapsed] = useState(false);

    // Dữ liệu Edit Modal
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
    const [editSpecialtyId, setEditSpecialtyId] = useState<string | null>(null);
    const [specialties, setSpecialties] = useState<any[]>([]);
    const [specialtyPickerVisible, setSpecialtyPickerVisible] = useState(false);

    // Tải dữ liệu
    useEffect(() => {
        loadAccounts();
        loadSpecialties();
    }, []);

    // ----------------------------------------------------------------------
    // LOGIC FUNCTIONS (Giữ nguyên và tối ưu)
    // ----------------------------------------------------------------------

    async function loadSpecialties() {
        // ... (Logic giữ nguyên)
        try {
            const snap = await db.collection('specialties').orderBy('name').get();
            setSpecialties(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
        } catch (e) {
            console.warn('load specialties', e);
        }
    }

    async function loadAccounts() {
        // ... (Logic giữ nguyên)
        try {
            setLoading(true);
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
        // ... (Logic giữ nguyên)
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
        // ... (Logic giữ nguyên)
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
        // ... (Logic giữ nguyên)
        setEditingUser(user);
        setEditName(user.name || '');
        setEditEmail(user.email || user['e-mail'] || '');
        setEditPhoto(user.photoURL || '');
        setEditPhone(user.phoneNumber || user['phone number'] || '');
        setEditSpecialtyId(user.specialty_id || null);
        setEditAge(user.age ? String(user.age) : '');
        setEditAddress(user.address || '');
        setEditing(true);
    }

    async function saveEdit() {
        // ... (Logic giữ nguyên)
        if (!editingUser) return;
        const id = editingUser.id;
        try {
            let specialtyName: string | null = null;
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
        // ... (Logic giữ nguyên)
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
                "Cần cài 'react-native-image-picker' để chọn ảnh. Chạy: npm install react-native-image-picker",
            );
        }
    }

    async function takePhoto() {
        // ... (Logic giữ nguyên)
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

    // Lọc danh sách cho FlatList
    const patientAccounts = accounts.filter(a => a.role === 'patient');
    const doctorAccounts = accounts.filter(a => a.role === 'doctor');
    
    // ----------------------------------------------------------------------
    // RENDER COMPONENT
    // ----------------------------------------------------------------------

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Quản lý tài khoản</Text>
                <Text style={styles.headerSubtitle}>
                    Admin có thể sửa, xóa và đổi vai trò tài khoản.
                </Text>
            </View>
            
            <ScrollView 
                style={styles.container} 
                contentContainerStyle={{ paddingBottom: 30 }}
                showsVerticalScrollIndicator={false}
            >
                {loading ? (
                    <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 40 }} />
                ) : (
                    <>
                        {/* --- Phần Bác sĩ --- */}
                        <TouchableOpacity
                            style={styles.sectionHeader}
                            onPress={() => setDoctorsCollapsed(v => !v)}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Icon name="users" size={20} color={COLORS.textDark} style={{ marginRight: 8 }} />
                                <Text style={styles.sectionTitle}>
                                    Bác sĩ ({doctorAccounts.length})
                                </Text>
                            </View>
                            <Icon name={doctorsCollapsed ? 'chevron-down' : 'chevron-up'} size={20} color={COLORS.textLight} />
                        </TouchableOpacity>

                        {!doctorsCollapsed && (
                            <FlatList
                                data={doctorAccounts}
                                keyExtractor={i => i.id}
                                renderItem={({ item }) => (
                                    <AccountItem 
                                        item={item} 
                                        changeRole={changeRole} 
                                        openEdit={openEdit} 
                                        onDelete={onDelete} 
                                    />
                                )}
                                scrollEnabled={false}
                                ListEmptyComponent={() => (
                                    <View style={styles.emptyContainer}>
                                        <Text style={styles.emptyText}>Chưa có tài khoản bác sĩ nào.</Text>
                                    </View>
                                )}
                            />
                        )}

                        {/* --- Phần Bệnh nhân --- */}
                        <TouchableOpacity
                            style={[styles.sectionHeader, { marginTop: 16 }]}
                            onPress={() => setPatientsCollapsed(v => !v)}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Icon name="users" size={20} color={COLORS.textDark} style={{ marginRight: 8 }} />
                                <Text style={styles.sectionTitle}>
                                    Bệnh nhân ({patientAccounts.length})
                                </Text>
                            </View>
                            <Icon name={patientsCollapsed ? 'chevron-down' : 'chevron-up'} size={20} color={COLORS.textLight} />
                        </TouchableOpacity>

                        {!patientsCollapsed && (
                            <FlatList
                                data={patientAccounts}
                                keyExtractor={i => i.id}
                                renderItem={({ item }) => (
                                    <AccountItem 
                                        item={item} 
                                        changeRole={changeRole} 
                                        openEdit={openEdit} 
                                        onDelete={onDelete} 
                                    />
                                )}
                                scrollEnabled={false}
                                ListEmptyComponent={() => (
                                    <View style={styles.emptyContainer}>
                                        <Text style={styles.emptyText}>Chưa có tài khoản bệnh nhân nào.</Text>
                                    </View>
                                )}
                            />
                        )}
                    </>
                )}
            </ScrollView>

            {/* --- Modal Sửa thông tin (Tối ưu hóa khả năng cuộn) --- */}
            <Modal visible={editing} animationType="slide" transparent={true} onRequestClose={() => setEditing(false)}>
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalContent}>
                        <ScrollView contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false} style={{ maxHeight: SCREEN_HEIGHT * 0.85 }}>
                            <Text style={styles.modalTitle}>Sửa thông tin tài khoản</Text>

                            {/* Ảnh đại diện */}
                            <View style={styles.avatarContainer}>
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
                                        size={80}
                                    />
                                    <View style={styles.editPhotoOverlay}>
                                        <Icon name="camera" size={20} color="#fff" />
                                    </View>
                                </TouchableOpacity>
                            </View>

                            {/* Input URL ảnh/Chọn ảnh */}
                            {showPhotoInput && (
                                <View style={styles.photoInputBox}>
                                    <View style={{ flexDirection: 'row', marginBottom: 8, gap: 8 }}>
                                        <Button
                                            title="Chọn ảnh"
                                            onPress={pickFromLibrary}
                                            style={[styles.photoActionButton, { backgroundColor: COLORS.secondary }]}
                                            textStyle={styles.photoActionButtonText}
                                        />
                                        <Button 
                                            title="Chụp ảnh" 
                                            onPress={takePhoto} 
                                            style={styles.photoActionButton}
                                            textStyle={styles.photoActionButtonText}
                                        />
                                    </View>

                                    {uploadingPhoto ? (
                                        <View style={styles.uploadingProgress}>
                                            <ActivityIndicator color={COLORS.primary} />
                                            <Text style={{ color: COLORS.textLight, marginTop: 6 }}>
                                                Đang tải lên... {uploadProgress}%
                                            </Text>
                                        </View>
                                    ) : (
                                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                                            <TextInput
                                                placeholder="Hoặc dán URL ảnh"
                                                value={photoInputText}
                                                onChangeText={setPhotoInputText}
                                                style={[styles.textInputStyle, { flex: 1, marginBottom: 0, marginTop: 0 }]}
                                                placeholderTextColor={COLORS.subtitle}
                                            />
                                            <Button
                                                title="Áp dụng"
                                                onPress={() => {
                                                    if (photoInputText) setEditPhoto(photoInputText);
                                                    setShowPhotoInput(false);
                                                    setPhotoInputText('');
                                                }}
                                                style={{ backgroundColor: COLORS.primary, paddingHorizontal: 15 }}
                                                textStyle={styles.actionButtonText}
                                            />
                                        </View>
                                    )}
                                </View>
                            )}
                            
                            {/* Trường nhập liệu */}
                            <Text style={styles.inputLabel}>Tên</Text>
                            <TextInput
                                placeholder="Tên"
                                value={editName}
                                onChangeText={setEditName}
                                style={styles.textInputStyle}
                                placeholderTextColor={COLORS.subtitle}
                            />

                            <Text style={styles.inputLabel}>Email</Text>
                            <TextInput
                                placeholder="Email"
                                value={editEmail}
                                onChangeText={setEditEmail}
                                style={styles.textInputStyle}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                placeholderTextColor={COLORS.subtitle}
                            />

                            <Text style={styles.inputLabel}>Số điện thoại</Text>
                            <TextInput
                                placeholder="Số điện thoại"
                                value={editPhone}
                                onChangeText={setEditPhone}
                                style={styles.textInputStyle}
                                keyboardType="phone-pad"
                                placeholderTextColor={COLORS.subtitle}
                            />
                            
                            <View style={styles.rowInputs}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.inputLabel}>Tuổi</Text>
                                    <TextInput
                                        placeholder="Tuổi"
                                        value={editAge}
                                        onChangeText={setEditAge}
                                        style={styles.textInputStyle}
                                        keyboardType="numeric"
                                        placeholderTextColor={COLORS.subtitle}
                                    />
                                </View>
                                <View style={{ flex: 1, marginLeft: 10 }}>
                                    <Text style={styles.inputLabel}>Vai trò</Text>
                                    <View style={styles.roleBox}>
                                        <Text style={{color: COLORS.textDark, fontWeight: '600'}}>
                                            {editingUser?.role === 'doctor' ? 'Bác sĩ' : 'Bệnh nhân'}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <Text style={styles.inputLabel}>Địa chỉ</Text>
                            <TextInput
                                placeholder="Địa chỉ"
                                value={editAddress}
                                onChangeText={setEditAddress}
                                style={styles.textInputStyle}
                                placeholderTextColor={COLORS.subtitle}
                            />
                            
                            {/* Chuyên khoa (Chỉ cho Bác sĩ) */}
                            {editingUser?.role === 'doctor' ? (
                                <>
                                    <Text style={styles.inputLabel}>Chuyên khoa</Text>
                                    <TouchableOpacity
                                        style={styles.pickerBox}
                                        onPress={() => setSpecialtyPickerVisible(true)}
                                    >
                                        <Text style={{color: COLORS.textDark, flex: 1}}>
                                            {specialties.find(s => s.id === editSpecialtyId)
                                                ?.name || 'Chọn chuyên khoa'}
                                        </Text>
                                        <Icon name="chevron-down" size={20} color={COLORS.subtitle} />
                                    </TouchableOpacity>
                                </>
                            ) : null}

                            {/* Modal chọn chuyên khoa */}
                            <Modal
                                visible={specialtyPickerVisible}
                                animationType="fade"
                                transparent={true}
                                onRequestClose={() => setSpecialtyPickerVisible(false)}
                            >
                                <View style={styles.modalBackdrop}>
                                    <View style={[styles.modalContent, { maxHeight: SCREEN_HEIGHT * 0.7, padding: 0 }]}>
                                        <Text style={[styles.modalTitle, { marginVertical: 15, paddingHorizontal: 16 }]}>Chọn chuyên khoa</Text>
                                        <FlatList
                                            data={specialties}
                                            keyExtractor={s => s.id}
                                            renderItem={({ item }) => (
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        setEditSpecialtyId(item.id);
                                                        setSpecialtyPickerVisible(false);
                                                    }}
                                                    style={styles.specialtyItemRow}
                                                >
                                                    <Text style={[styles.specialtyItemText, {
                                                        fontWeight: item.id === editSpecialtyId ? '700' : '400',
                                                        color: item.id === editSpecialtyId ? COLORS.primary : COLORS.textDark,
                                                    }]}>
                                                        {item.name}
                                                    </Text>
                                                    {item.id === editSpecialtyId && <Icon name="check" size={20} color={COLORS.primary} />}
                                                </TouchableOpacity>
                                            )}
                                        />
                                        <View style={[styles.modalActionsRow, { padding: 16, borderTopWidth: 1, borderTopColor: COLORS.borderColor }]}>
                                            <Button
                                                title="Đóng"
                                                onPress={() => setSpecialtyPickerVisible(false)}
                                                style={{ backgroundColor: COLORS.subtitle, flex: 1 }}
                                                textStyle={styles.actionButtonText}
                                            />
                                        </View>
                                    </View>
                                </View>
                            </Modal>
                        </ScrollView>

                        {/* Nút hành động Lưu/Hủy (Phải đặt ngoài ScrollView của Modal) */}
                        <View style={[styles.modalActionsRow, { borderTopWidth: 1, borderTopColor: COLORS.borderColor, paddingTop: 16 }]}>
                            <Button
                                title="Hủy"
                                onPress={() => {
                                    setEditing(false);
                                    setEditingUser(null);
                                }}
                                style={{ backgroundColor: COLORS.subtitle, flex: 1 }}
                                textStyle={styles.actionButtonText}
                            />
                            <View style={{ width: 8 }} />
                            <Button 
                                title="Lưu" 
                                onPress={saveEdit} 
                                style={{ backgroundColor: COLORS.primary, flex: 1 }}
                                textStyle={styles.actionButtonText}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// ----------------------------------------------------------------------
// STYLESHEET
// ----------------------------------------------------------------------

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: COLORS.background },
    container: { flex: 1, paddingHorizontal: 16 },
    
    // --- Header ---
    header: {
        padding: 16,
        paddingBottom: 10,
        backgroundColor: COLORS.cardBackground,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderColor,
        ...SHADOW_STYLE,
    },
    headerTitle: { fontSize: 24, fontWeight: '800', color: COLORS.textDark },
    headerSubtitle: { color: COLORS.subtitle, fontSize: 14, marginTop: 4 },

    // --- List Item (Card Style) ---
    itemCard: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        backgroundColor: COLORS.cardBackground,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.primary,
        ...SHADOW_STYLE,
    },
    itemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    itemInfo: { marginLeft: 12, flex: 1 },
    itemName: { fontWeight: '700', fontSize: 18, color: COLORS.textDark },
    itemSub: { color: COLORS.textLight, fontSize: 14, marginBottom: 10 },
    
    roleTag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    roleTagText: { fontSize: 12, fontWeight: '600' },
    itemSpecialty: { 
        color: COLORS.secondary, 
        fontSize: 13, 
        fontWeight: '600',
        marginTop: 4,
    },
    
    itemActions: { 
        flexDirection: 'row', 
        alignItems: 'center',
        justifyContent: 'flex-end',
        borderTopWidth: 1,
        borderTopColor: COLORS.lightGray,
        paddingTop: 10,
        marginTop: 5,
    },
    actionButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        minWidth: 80,
    },
    actionButtonText: { 
        fontSize: 14, 
        fontWeight: '700', 
        color: COLORS.cardBackground 
    },
    deleteIconButton: { 
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.danger + '40',
        marginLeft: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // --- Sections ---
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 6,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderColor,
        marginBottom: 8,
        backgroundColor: COLORS.cardBackground,
        borderRadius: 10,
    },
    sectionTitle: { fontWeight: '800', fontSize: 18, color: COLORS.textDark },
    emptyContainer: { 
        paddingVertical: 30, 
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.borderColor,
        borderRadius: 8,
        backgroundColor: COLORS.cardBackground,
        marginBottom: 12,
    },
    emptyText: { color: COLORS.subtitle, fontSize: 14 },

    // --- Modal ---
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    modalContent: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: 16,
        padding: 16,
        ...SHADOW_STYLE,
    },
    modalTitle: { 
        fontWeight: '800', 
        fontSize: 20, 
        marginBottom: 16, 
        color: COLORS.textDark,
        textAlign: 'center',
    },
    modalActionsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    
    // --- Input & Form ---
    inputLabel: { 
        fontSize: 14, 
        color: COLORS.textLight, 
        marginBottom: 4, 
        fontWeight: '600'
    },
    textInputStyle: {
        borderWidth: 1,
        borderColor: COLORS.borderColor,
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: Platform.OS === 'ios' ? 14 : 12,
        marginBottom: 15,
        backgroundColor: COLORS.cardBackground,
        color: COLORS.textDark,
        fontSize: 16,
    },
    rowInputs: {
        flexDirection: 'row',
        marginBottom: 0,
    },
    roleBox: {
        padding: 14,
        backgroundColor: COLORS.lightGray,
        borderRadius: 10,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: COLORS.borderColor,
        minHeight: Platform.OS === 'ios' ? 46 : 48, // Đồng bộ chiều cao
        justifyContent: 'center',
    },
    
    // --- Photo Input ---
    avatarContainer: { 
        alignItems: 'center', 
        marginBottom: 16,
    },
    editPhotoOverlay: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: COLORS.primary,
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.cardBackground,
    },
    photoInputBox: {
        backgroundColor: COLORS.lightGray,
        borderRadius: 10,
        padding: 12,
        marginVertical: 10,
        borderWidth: 1,
        borderColor: COLORS.borderColor,
    },
    photoActionButton: { 
        flex: 1, 
        paddingVertical: 10,
        backgroundColor: COLORS.secondary, 
    },
    photoActionButtonText: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.cardBackground,
    },
    uploadingProgress: { 
        alignItems: 'center', 
        paddingVertical: 15,
        marginTop: 5,
    },

    // --- Specialty Picker ---
    pickerBox: {
        borderWidth: 1,
        borderColor: COLORS.borderColor,
        padding: 14,
        borderRadius: 10,
        backgroundColor: COLORS.cardBackground,
        marginBottom: 15,
        flexDirection: 'row',
        alignItems: 'center',
    },
    specialtyItemRow: {
        paddingVertical: 15,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderColor,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    specialtyItemText: { 
        fontSize: 16, 
        color: COLORS.textDark 
    },
});