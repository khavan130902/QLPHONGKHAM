import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    Alert,
    Platform,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import db from '@/services/firestore';
import safeAlert from '@/utils/safeAlert';
// Giả định Button component đã được tối ưu cho props style/textStyle
import Button from '@/components/Button'; 

type Appt = {
    id: string;
    doctorId?: string;
    patientId?: string;
    start?: string;
    end?: string;
    status?: 'pending' | 'confirmed' | 'cancelled' | 'completed' | string;
    [key: string]: any;
};

// --- BẢNG MÀU MỚI ---
const COLORS = {
    primary: '#2596be', // Xác nhận
    success: '#28A745', // Hoàn thành
    danger: '#DC3545', // Hủy
    warning: '#FFC107', // Đang chờ (Pending)
    background: '#F8F9FA',
    cardBackground: '#FFFFFF',
    textPrimary: '#343A40',
    textSecondary: '#6C757D',
    divider: '#E9ECEF',
};

// --- HELPER STATUS RENDER ---
const getStatusStyle = (status: Appt['status']) => {
    switch (status) {
        case 'confirmed':
            return { text: 'Đã xác nhận', color: COLORS.primary };
        case 'cancelled':
            return { text: 'Đã hủy', color: COLORS.danger };
        case 'completed':
            return { text: 'Hoàn thành', color: COLORS.success };
        case 'pending':
        default:
            return { text: 'Đang chờ', color: COLORS.warning };
    }
};

// --- DYNAMIC STYLE FUNCTION (KHÔNG DÙNG styles.create) ---
// Chuyển style dynamic ra khỏi StyleSheet.create để tránh lỗi gạch đỏ
const statusBadgeStyle = (color: string) => ({
    fontSize: 12,
    fontWeight: '700' as '700', // Khai báo rõ kiểu dữ liệu cho TS
    color: COLORS.cardBackground, // Chữ trắng trên nền màu
    backgroundColor: color,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden' as 'hidden',
    alignSelf: 'flex-start' as 'flex-start',
});

// --- MAIN COMPONENT ---
export default function TodayAppointmentsScreen() {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<Appt[]>([]);
    const [usersMap, setUsersMap] = useState<Record<string, any>>({});

    useEffect(() => {
        // ... (Giữ nguyên logic load dữ liệu theo ngày và prefetch users)
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        const startISO = start.toISOString();
        const endISO = end.toISOString();

        const q = db
            .collection('appointments')
            .where('start', '>=', startISO)
            .where('start', '<=', endISO)
            .orderBy('start', 'asc');

        const unsub = q.onSnapshot(
            snap => {
                const arr: Appt[] = snap.docs.map(d => ({
                    id: d.id,
                    ...(d.data() as any),
                }));
                setItems(arr);
                const ids = new Set<string>();
                arr.forEach(a => {
                    if (a.doctorId) ids.add(a.doctorId);
                    if (a.patientId) ids.add(a.patientId);
                });
                if (ids.size === 0) {
                    setLoading(false);
                    return;
                }
                Promise.all(
                    Array.from(ids).map(id => db.collection('users').doc(id).get()),
                )
                    .then(docs => {
                        const m: Record<string, any> = {};
                        docs.forEach(d => {
                            const dd = d.data();
                            if (dd) m[d.id] = dd;
                        });
                        setUsersMap(m);
                    })
                    .catch(err => console.warn('prefetch users failed', err))
                    .finally(() => setLoading(false));
            },
            err => {
                console.warn('today appts snapshot', err);
                safeAlert('Lỗi', 'Không tải được lịch hôm nay');
                setLoading(false);
            },
        );

        return () => unsub();
    }, []);

    // --- LOGIC HÀNH ĐỘNG (Giữ nguyên) ---
    async function updateStatus(id: string, status: string) {
        try {
            await db.collection('appointments').doc(id).update({ status });
            safeAlert('Thành công', 'Cập nhật trạng thái');
        } catch (err) {
            console.warn('update status', err);
            safeAlert('Lỗi', 'Không thể cập nhật trạng thái');
        }
    }

    function confirmAction(id: string) {
        Alert.alert('Xác nhận', 'Xác nhận lịch này?', [
            { text: 'Hủy', style: 'cancel' },
            { text: 'Xác nhận', onPress: () => updateStatus(id, 'confirmed') },
        ]);
    }

    function cancelAction(id: string) {
        Alert.alert('Xác nhận', 'Hủy lịch này?', [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Hủy lịch',
                style: 'destructive',
                onPress: () => updateStatus(id, 'cancelled'),
            },
        ]);
    }

    function completeAction(id: string) {
        Alert.alert('Xác nhận', 'Đánh dấu hoàn thành?', [
            { text: 'Hủy', style: 'cancel' },
            { text: 'Hoàn thành', onPress: () => updateStatus(id, 'completed') },
        ]);
    }

    // --- RENDER ITEM MỚI VỚI STYLE CẢI TIẾN ---
    function renderItem({ item }: { item: Appt }) {
        const doctor = usersMap[item.doctorId || ''];
        const patient = usersMap[item.patientId || ''];
        const time = item.start
            ? new Date(item.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '--:--';
        
        const statusInfo = getStatusStyle(item.status);
        const isCompletedOrCancelled = item.status === 'completed' || item.status === 'cancelled';

        return (
            <View style={styles.appointmentCard}>
                {/* THÔNG TIN CHI TIẾT */}
                <View style={styles.infoContainer}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <Text style={styles.timeText}>{time}</Text>
                        {/* SỬ DỤNG HÀM STYLE ĐỘC LẬP */}
                        <Text style={statusBadgeStyle(statusInfo.color)}>{statusInfo.text}</Text>
                    </View>

                    <Text style={styles.doctorText}>
                        <Text style={{ fontWeight: '400' }}>Bác sĩ:</Text> {doctor?.name || 'Không rõ'}
                    </Text>
                    <Text style={styles.patientText}>
                        <Text style={{ fontWeight: '400' }}>Bệnh nhân:</Text> {patient?.name || 'Không rõ'}
                    </Text>
                    {patient?.phoneNumber && (
                         <Text style={styles.patientText}>
                             <Text style={{ fontWeight: '400' }}>SĐT:</Text> {patient.phoneNumber}
                         </Text>
                    )}
                </View>

                {/* KHU VỰC HÀNH ĐỘNG */}
                <View style={styles.actionsContainer}>
                    {item.status === 'pending' && (
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.primary }]} onPress={() => confirmAction(item.id)}>
                            <Text style={styles.actionText}>Xác nhận</Text>
                        </TouchableOpacity>
                    )}

                    {item.status === 'confirmed' && (
                        <>
                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.success }]} onPress={() => completeAction(item.id)}>
                                <Text style={styles.actionText}>Hoàn thành</Text>
                            </TouchableOpacity>
                            <View style={{ height: 8 }} />
                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.danger }]} onPress={() => cancelAction(item.id)}>
                                <Text style={styles.actionText}>Hủy lịch</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {isCompletedOrCancelled && (
                        <Text style={{ color: COLORS.textSecondary, fontStyle: 'italic', fontSize: 12 }}>
                            Đã xử lý
                        </Text>
                    )}
                </View>
            </View>
        );
    }

    if (loading)
        return (
            <View
                style={[
                    styles.container,
                    { justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
                ]}
            >
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
            <View style={styles.container}>
                <Text style={styles.title}>Lịch khám hôm nay</Text>
                {items.length === 0 ? (
                    <View style={styles.noDataContainer}>
                        <Text style={{ color: COLORS.textSecondary, fontSize: 16 }}>
                            🎉 Hôm nay không có lịch khám nào.
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={items}
                        keyExtractor={i => i.id}
                        renderItem={renderItem}
                        contentContainerStyle={{ paddingBottom: 24 }}
                        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        paddingHorizontal: 16, 
        backgroundColor: COLORS.background, 
    },
    title: { 
        fontSize: 22, 
        fontWeight: '800', 
        color: COLORS.textPrimary, 
        marginVertical: 16 
    },
    
    // --- CARD APPOINTMENT STYLE ---
    appointmentCard: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: COLORS.cardBackground,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.divider,
        // Shadow nổi bật hơn
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.1,
                shadowRadius: 5,
            },
            android: {
                elevation: 5,
            },
        }),
    },
    infoContainer: {
        flex: 1,
        paddingRight: 10,
    },
    timeText: { 
        fontSize: 18, 
        fontWeight: '800', 
        color: COLORS.textPrimary,
        marginRight: 10,
    },
    doctorText: { 
        fontSize: 14, 
        fontWeight: '600', 
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    patientText: { 
        fontSize: 14, 
        fontWeight: '500', 
        color: COLORS.textSecondary,
    },
    
    // Đã XÓA statusBadge khỏi đây

    // --- ACTIONS AREA ---
    actionsContainer: { 
        width: 100,
        justifyContent: 'center', 
        alignItems: 'flex-end',
    },
    actionBtn: {
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 6,
        alignItems: 'center',
        width: '100%',
    },
    actionText: {
        color: COLORS.cardBackground,
        fontWeight: '700',
        fontSize: 13,
    },
    
    // --- NO DATA ---
    noDataContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 50,
    }
});