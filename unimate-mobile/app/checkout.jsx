import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../src/constants/colors';
import { orderApi } from '../src/api/orderApi';
import { authApi } from '../src/api/auth';
import { useAuth } from '../src/context/AuthContext';

// Giá khớp với unimate-backend/src/config/plans.js (backend mới là nơi quyết định số tiền)
const STUDENT_PLANS = [
  { id: 'premium_monthly', name: 'Premium 1 tháng', price: '49.000đ', note: '30 ngày' },
  { id: 'premium_yearly', name: 'Premium 1 năm', price: '399.000đ', note: '365 ngày, rẻ hơn ~32%' },
];
const PARTNER_PLANS = [
  { id: 'partner_monthly', name: 'Gói Đối tác 1 tháng', price: '99.000đ', note: 'Quán lên đầu danh sách + huy hiệu nổi bật' },
];
const POLL_INTERVAL_MS = 4000;

const formatVnd = (n) => `${Number(n || 0).toLocaleString('vi-VN')}đ`;
const formatDate = (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '');

export default function CheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, updateUser } = useAuth();

  const isPartner = user?.role === 'partner';
  const plans = isPartner ? PARTNER_PLANS : STUDENT_PLANS;
  const initialPlan = plans.some((p) => p.id === params.plan) ? params.plan : plans[0].id;

  const [planId, setPlanId] = useState(initialPlan);
  const [checkout, setCheckout] = useState(null); // { order, payment }
  const [creating, setCreating] = useState(false);
  const [paid, setPaid] = useState(null); // user sau khi thanh toán xong
  const pollRef = useRef(null);
  // Giữ hàm updateUser mới nhất mà không làm khởi động lại vòng hỏi trạng thái
  const updateUserRef = useRef(updateUser);
  useEffect(() => {
    updateUserRef.current = updateUser;
  }, [updateUser]);

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  };
  useEffect(() => stopPolling, []);

  // Đợi SePay báo tiền về: hỏi trạng thái đơn mỗi vài giây
  useEffect(() => {
    const code = checkout?.order?.code;
    if (!code || paid) return undefined;
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await orderApi.getOrder(code);
        const status = res.data?.data?.order?.status;
        if (status === 'paid') {
          stopPolling();
          const me = await authApi.getMe();
          const freshUser = me.data?.data?.user;
          if (freshUser) updateUserRef.current(freshUser);
          setPaid(freshUser || {});
        } else if (status === 'cancelled') {
          stopPolling();
          setCheckout(null);
          Alert.alert('Đơn đã huỷ', 'Đơn hàng này đã bị huỷ. Bạn có thể tạo đơn mới.');
        }
      } catch {
        // Mạng chập chờn: lần hỏi sau thử lại
      }
    }, POLL_INTERVAL_MS);
    return stopPolling;
  }, [checkout?.order?.code, paid]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await orderApi.createOrder(planId);
      setCheckout(res.data?.data || null);
    } catch (err) {
      Alert.alert('Không tạo được đơn', err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = () => {
    const code = checkout?.order?.code;
    if (!code) return;
    Alert.alert('Huỷ đơn', 'Bạn chắc chắn muốn huỷ đơn này? Nếu đã chuyển khoản thì đừng huỷ, hãy chờ hệ thống xác nhận.', [
      { text: 'Không', style: 'cancel' },
      {
        text: 'Huỷ đơn',
        style: 'destructive',
        onPress: async () => {
          try {
            await orderApi.cancelOrder(code);
          } catch (err) {
            Alert.alert('Không huỷ được', err.message);
            return;
          }
          stopPolling();
          setCheckout(null);
        },
      },
    ]);
  };

  const order = checkout?.order;
  const payment = checkout?.payment;
  const expiresAt = isPartner ? paid?.partnerProfile?.planExpiresAt : paid?.premiumExpiresAt;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isPartner ? 'Mua Gói Đối tác' : 'Mua Premium'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {paid ? (
          /* ── Đã thanh toán ── */
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={72} color={COLORS.success} />
            <Text style={styles.successTitle}>Thanh toán thành công</Text>
            <Text style={styles.successText}>
              {isPartner
                ? 'Quán của bạn đã được xếp nổi bật trên UNI-MATE.'
                : 'Tài khoản đã lên Premium và có tích xanh xác thực.'}
              {expiresAt ? `\nHiệu lực đến ${formatDate(expiresAt)}.` : ''}
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => router.back()}>
              <Text style={styles.primaryBtnText}>Xong</Text>
            </TouchableOpacity>
          </View>
        ) : !order ? (
          /* ── Chọn gói ── */
          <>
            <Text style={styles.sectionTitle}>Chọn gói</Text>
            {plans.map((p) => {
              const selected = p.id === planId;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.planCard, selected && styles.planCardSelected]}
                  onPress={() => setPlanId(p.id)}
                  activeOpacity={0.85}
                >
                  <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? COLORS.primary : COLORS.textMuted} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.planName}>{p.name}</Text>
                    <Text style={styles.planNote}>{p.note}</Text>
                  </View>
                  <Text style={styles.planPrice}>{p.price}</Text>
                </TouchableOpacity>
              );
            })}
            <Text style={styles.hint}>
              Thanh toán bằng chuyển khoản ngân hàng qua mã VietQR. Hệ thống tự kích hoạt gói khi tiền về, thường dưới 1 phút. Mua thêm khi còn hạn thì thời hạn được cộng dồn.
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleCreate} disabled={creating}>
              {creating ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.primaryBtnText}>Tạo mã thanh toán</Text>}
            </TouchableOpacity>
          </>
        ) : (
          /* ── Chờ chuyển khoản ── */
          <>
            <Text style={styles.orderLine}>
              Đơn <Text style={styles.bold}>{order.code}</Text> · {order.planName}
            </Text>

            {payment?.configured ? (
              <>
                <View style={styles.qrBox}>
                  <Image source={{ uri: payment.qrImageUrl }} style={styles.qrImage} resizeMode="contain" />
                </View>
                <Text style={styles.hint}>
                  Mở app ngân hàng → Quét QR. Nếu đang dùng chính điện thoại này: chụp màn hình rồi chọn "Quét từ ảnh" trong app ngân hàng, hoặc chuyển khoản theo thông tin bên dưới (nhấn giữ để sao chép).
                </Text>
                <View style={styles.infoCard}>
                  <InfoRow label="Ngân hàng" value={payment.bankId} />
                  <InfoRow label="Số tài khoản" value={payment.accountNo} />
                  <InfoRow label="Chủ tài khoản" value={payment.accountName} />
                  <InfoRow label="Số tiền" value={formatVnd(payment.amount)} strong />
                  <InfoRow label="Nội dung" value={payment.transferContent} strong />
                </View>
                <Text style={styles.warn}>Ghi đúng nội dung {payment.transferContent} để hệ thống tự nhận diện đơn.</Text>
              </>
            ) : (
              <Text style={styles.warn}>{payment?.message || 'Chưa cấu hình tài khoản nhận tiền.'}</Text>
            )}

            <View style={styles.waitingRow}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.waitingText}>Đang chờ xác nhận thanh toán...</Text>
            </View>

            <TouchableOpacity style={styles.secondaryBtn} onPress={handleCancel}>
              <Text style={styles.secondaryBtnText}>Huỷ đơn</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value, strong }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, strong && styles.bold]} selectable>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10,
  },
  planCardSelected: { borderColor: COLORS.primary, backgroundColor: '#FFF3E0' },
  planName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  planNote: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  planPrice: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  hint: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19, marginVertical: 12 },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    alignSelf: 'stretch',
  },
  primaryBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '800' },
  secondaryBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  secondaryBtnText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '700' },
  orderLine: { fontSize: 14, color: COLORS.text, marginBottom: 12, textAlign: 'center' },
  bold: { fontWeight: '800', color: COLORS.text },
  qrBox: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qrImage: { width: 260, height: 300 },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  infoLabel: { fontSize: 13, color: COLORS.textSecondary },
  infoValue: { fontSize: 14, color: COLORS.text, flexShrink: 1, textAlign: 'right', marginLeft: 12 },
  warn: { fontSize: 12, color: COLORS.secondaryDark, marginTop: 10, lineHeight: 17 },
  waitingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 18, gap: 8 },
  waitingText: { fontSize: 13, color: COLORS.textSecondary },
  successBox: { alignItems: 'center', paddingVertical: 40 },
  successTitle: { fontSize: 22, fontWeight: '900', color: COLORS.text, marginTop: 12 },
  successText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 21, marginVertical: 12 },
});
