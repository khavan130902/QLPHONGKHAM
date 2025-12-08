import React from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    SafeAreaView,
    Dimensions,
    StatusBar,
    Animated,
    Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

// --- COLOR PALETTE MỚI (Glassmorphism & Sang trọng) ---
const COLORS = {
    // Primary: Xanh dương đậm, tin cậy
    primary: "#1C7FE3", 
    // Background: Nền trắng xám rất nhẹ, nhưng không quá đơn điệu
    background: "#F5F8FC",
    // TextDark: Màu xanh navy đậm
    textDark: "#15243B",
    // TextMuted: Màu xám nhẹ
    textMuted: "#6B7A99",
    // CardBackground: Màu trắng hơi trong suốt (dùng opacity)
    cardBase: "#FFFFFF",
    // Divider: Viền mờ
    divider: "#E0E5EE",
    // Gradient màu nền (giả lập)
    gradientLight: "#BDE6F6", 
};

const { width } = Dimensions.get("window");
const numColumns = 2; // Cấu trúc 2 cột

export default function AdminDashboard() {
    const navigation = useNavigation<any>();

    const ADMIN_ITEMS = [
        // Giữ nguyên dữ liệu item, màu sắc dùng để tạo nền mờ
        { key: "today", title: "Lịch hôm nay", route: "Today", icon: "📅", color: "#FF9800" }, // Orange
        { key: "users", title: "Quản lý tài khoản", route: "ManageDoctors", icon: "👨‍⚕️", color: COLORS.primary }, // Blue
        { key: "shifts", title: "Quản lý ca làm", route: "ManageShifts", icon: "⏰", color: "#4CAF50" }, // Green
        { key: "services", title: "Quản lý dịch vụ", route: "ManageServices", icon: "💉", color: "#E91E63" }, // Pink
        { key: "spec", title: "Quản lý chuyên khoa", route: "ManageSpecialties", icon: "⭐", color: "#9C27B0" }, // Purple
        { key: "rooms", title: "Quản lý phòng", route: "ManageRooms", icon: "🏥", color: "#00BCD4" }, // Cyan
        { key: "income", title: "Doanh thu", route: "RevenueDaily", icon: "💰", color: "#FFEB3B" }, // Yellow
        { key: "history", title: "Lịch sử", route: "History", icon: "📜", color: "#795548" }, // Brown
        { key: "settings", title: "Cài đặt", route: "Settings", icon: "⚙️", color: "#607D8B" }, // Slate
    ];

    // Animation scale khi bấm vào (Giữ nguyên logic)
    const renderItem = ({ item }: { item: typeof ADMIN_ITEMS[0] }) => {
        const scale = new Animated.Value(1);

        const onPressIn = () => {
            Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
        };
        const onPressOut = () => {
            Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
            navigation.navigate(item.route);
        };

        return (
            <Animated.View style={[{ transform: [{ scale }], flex: 1 / numColumns }, styles.gridItemContainer]}>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPressIn={onPressIn}
                    onPressOut={onPressOut}
                    style={styles.card}
                >
                    {/* Phần đầu Card: Màu mờ Glassmorphism */}
                    <View style={[styles.cardHeader, { backgroundColor: item.color + "10", borderColor: item.color + "50" }]}>
                        <View style={[styles.iconWrapper, { backgroundColor: item.color }]}>
                            <Text style={styles.icon}>{item.icon}</Text>
                        </View>
                        <Text style={[styles.cardHeaderText, { color: item.color }]}>
                            {item.title}
                        </Text>
                    </View>
                    
                    {/* Phần thân Card: Thông tin chi tiết */}
                    <View style={styles.cardBody}>
                        <Text style={styles.cardBodyText}>
                            Quản lý {item.key}
                        </Text>
                        <Text style={styles.cardBodyAction}>
                            Xem chi tiết <Text style={{ color: item.color, fontWeight: '700' }}>→</Text>
                        </Text>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Status Bar: Phù hợp với nền sáng */}
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

            {/* HEADER MỚI: Thiết kế phẳng, tập trung vào tên */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>QUẢN TRỊ VIÊN</Text>
                    <Text style={styles.headerSubtitle}>Tổng quan Hệ thống Y tế</Text>
                </View>

                {/* Avatar Box được làm nổi bật */}
                <View style={styles.avatarBox}>
                    <Image source={require("../../../assets/logo.png")} style={styles.avatar} />
                    <View style={styles.dot} />
                </View>
            </View>

            {/* GRID MỚI: 2 cột */}
            <FlatList
                data={ADMIN_ITEMS}
                numColumns={numColumns}
                renderItem={renderItem}
                keyExtractor={(i) => i.key}
                contentContainerStyle={styles.grid}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
}

// ======================= STYLE (Glassmorphism & Cao cấp) =======================
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        // Dùng gradientLight để giả lập nền động (nếu có thể)
    },

    // HEADER (Phẳng và Sắc nét)
    header: {
        paddingHorizontal: 20,
        paddingBottom: 20, 
        paddingTop: 15,
        backgroundColor: COLORS.background,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottomWidth: 1, 
        borderBottomColor: COLORS.divider,
    },

    headerTitle: {
        color: COLORS.textDark, 
        fontSize: 24, 
        fontWeight: "800",
        letterSpacing: 0.5,
    },
    headerSubtitle: {
        color: COLORS.textMuted, 
        fontSize: 14,
        marginTop: 4,
        fontWeight: "500",
    },

    avatarBox: {
        width: 80,
        height: 80,
        backgroundColor: COLORS.cardBase,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: COLORS.divider,
    },
    avatar: {
        width: 70,
        height: 70,
        tintColor: COLORS.primary,
    },
    dot: {
        width: 10,
        height: 10,
        backgroundColor: COLORS.primary, // Dùng Primary cho dot
        borderRadius: 5,
        position: "absolute",
        bottom: 0,
        right: 0,
        borderWidth: 2,
        borderColor: COLORS.cardBase, 
    },

    // GRID
    grid: {
        paddingHorizontal: 16,
        paddingVertical: 18,
        paddingBottom: 40,
    },
    gridItemContainer: {
        padding: 8, 
    },

    // CARD (Glassmorphism Effect)
    card: {
        backgroundColor: COLORS.cardBase,
        borderRadius: 16, 
        overflow: 'hidden', // Quan trọng cho hiệu ứng Glassmorphism
        height: (width / numColumns) * 0.95, // Chiều cao tốt cho 2 cột
        borderWidth: 1,
        borderColor: COLORS.divider,
        
        // Shadow tạo độ nổi cao cấp
        ...Platform.select({
            ios: {
                shadowColor: COLORS.textDark,
                shadowOpacity: 0.1,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 5 },
            },
            android: {
                elevation: 8,
            },
        }),
    },

    cardHeader: {
        // Màu nền mờ được đặt inline: backgroundColor: item.color + "10"
        padding: 15,
        borderBottomWidth: 1,
        // Viền được đặt inline: borderColor: item.color + "50"
        borderBottomColor: 'transparent', // Màu mặc định
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
    },

    iconWrapper: {
        width: 45, 
        height: 45,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
        // Màu nền Icon được đặt inline: backgroundColor: item.color
    },

    icon: {
        fontSize: 24, 
        color: COLORS.cardBase, // Icon màu trắng
    },
    
    cardHeaderText: {
        fontSize: 15, 
        fontWeight: "700", 
        // Màu text được đặt inline: color: item.color
        flexShrink: 1,
    },
    
    cardBody: {
        padding: 15,
        flex: 1,
        justifyContent: 'space-between',
        paddingBottom: 10,
    },

    cardBodyText: {
        fontSize: 13,
        color: COLORS.textMuted,
        fontWeight: '500',
    },
    cardBodyAction: {
        fontSize: 13,
        color: COLORS.textDark,
        fontWeight: '600',
        marginTop: 5,
    }
});