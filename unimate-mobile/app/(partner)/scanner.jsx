import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/colors';
import { Button } from '../../src/components/Button';
import { voucherApi } from '../../src/api/voucherApi';

export default function PartnerScanner() {
  const [inputCode, setInputCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifyError, setVerifyError] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const loadHistory = async () => {
    try {
      const res = await voucherApi.getPartnerRedemptions(30);
      setHistory(res?.data?.data || []);
    } catch (err) {
      console.log('Error loading redemptions:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const toPayload = (raw) => {
    const code = raw.trim().toUpperCase();
    return code.startsWith('UVM-') ? { qrPayload: code } : { code };
  };

  const handleVerify = async () => {
    if (!inputCode.trim()) {
      return Alert.alert('Thông báo', 'Vui lòng nhập hoặc dán mã QR / mã voucher');
    }

    setVerifying(true);
    setVerifyError(null);
    setVerifyResult(null);

    try {
      const payload = toPayload(inputCode);
      const res = await voucherApi.verifyVoucher(payload);
      setVerifyResult(res?.data?.data || res?.data);
    } catch (err) {
      setVerifyError(err.message || 'Mã voucher không hợp lệ hoặc không tồn tại');
    } finally {
      setVerifying(false);
    }
  };

  const handleRedeem = async () => {
    if (!verifyResult) return;

    setRedeeming(true);
    try {
      const payload = toPayload(inputCode);
      const res = await voucherApi.redeemVoucher(payload);

      Alert.alert(
        'Check-in Thành công! 🎉',
        res.data?.data?.meetupCompleted
          ? 'Voucher đã được xác nhận. Cặp hẹn cafe đã đủ 2 người, buổi hẹn được ghi nhận 🤝'
          : 'Voucher đã được xác nhận sử dụng thành công cho sinh viên.'
      );

      setInputCode('');
      setVerifyResult(null);
      setVerifyError(null);
      loadHistory();
    } catch (err) {
      Alert.alert('Thất bại', err.message || 'Không thể xác nhận voucher lúc này');
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="qr-code" size={24} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.title}>Đối Soát Voucher Tại Quầy</Text>
              <Text style={styles.subtitle}>
                Nhập hoặc dán mã QR (UVM-xxxx) từ điện thoại sinh viên
              </Text>
            </View>
          </View>

          {/* Input Box Card */}
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>Mã Voucher / Mã QR Sinh viên:</Text>
            <View style={styles.inputRow}>
              <Ionicons name="barcode-outline" size={20} color={COLORS.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.textInput}
                placeholder="VD: UVM-123456 hoặc DISCOUNT20"
                placeholderTextColor={COLORS.textMuted}
                value={inputCode}
                onChangeText={(t) => {
                  setInputCode(t);
                  setVerifyError(null);
                }}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              {inputCode.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setInputCode('');
                    setVerifyResult(null);
                    setVerifyError(null);
                  }}
                  style={{ padding: 4 }}
                >
                  <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <Button
              title="Kiểm tra tính hợp lệ"
              onPress={handleVerify}
              loading={verifying}
              style={{ marginTop: 12 }}
            />
          </View>

          {/* Error Message */}
          {verifyError && (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle" size={22} color={COLORS.error} />
              <Text style={styles.errorText}>{verifyError}</Text>
            </View>
          )}

          {/* Verification Result Card */}
          {verifyResult && (
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <View style={styles.validBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.validBadgeText}>MÃ HỢP LỆ ĐỦ ĐIỀU KIỆN</Text>
                </View>
              </View>

              <Text style={styles.resultVoucherTitle}>
                {verifyResult.voucher?.title || verifyResult.title || 'Voucher giảm giá'}
              </Text>

              {/* Student info */}
              {verifyResult.user && (
                <View style={styles.studentInfoBox}>
                  <View style={styles.studentAvatar}>
                    <Ionicons name="person" size={18} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.studentName}>
                      Sinh viên: {verifyResult.user.fullName || 'Thành viên UNI-MATE'}
                    </Text>
                    <Text style={styles.studentSub}>
                      {verifyResult.user.university || verifyResult.user.email}
                    </Text>
                  </View>
                </View>
              )}

              {/* Redeem Button */}
              <TouchableOpacity
                style={styles.redeemBtn}
                onPress={handleRedeem}
                disabled={redeeming}
                activeOpacity={0.85}
              >
                {redeeming ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.redeemBtnText}>XÁC NHẬN SỬ DỤNG VOUCHER</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* History Section */}
          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <Ionicons name="time-outline" size={18} color={COLORS.textSecondary} />
              <Text style={styles.historyTitle}>Lịch sử check-in gần đây tại quán</Text>
            </View>

            {historyLoading ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: 16 }} />
            ) : history.length === 0 ? (
              <View style={styles.emptyHistoryCard}>
                <Text style={styles.emptyHistoryText}>Chưa có lượt quét nào gần đây</Text>
              </View>
            ) : (
              history.map((item, idx) => (
                <View key={item._id || idx} style={styles.historyItem}>
                  <View style={styles.historyIconCircle}>
                    <Ionicons name="checkmark" size={16} color="#10B981" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.historyVoucherName} numberOfLines={1}>
                      {item.voucherId?.title || 'Voucher ưu đãi'}
                    </Text>
                    <Text style={styles.historyStudentName}>
                      {item.userId?.fullName || 'Sinh viên UNI-MATE'}
                    </Text>
                  </View>
                  <Text style={styles.historyTime}>
                    {item.redeemedAt
                      ? new Date(item.redeemedAt).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Vừa xong'}
                  </Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  inputCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 50,
  },
  textInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    gap: 10,
  },
  errorText: {
    flex: 1,
    color: COLORS.error,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  resultCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: '#10B981',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  validBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },
  validBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46',
  },
  resultVoucherTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 12,
  },
  studentInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
  },
  studentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  studentSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  redeemBtn: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  redeemBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  historySection: {
    marginTop: 10,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  emptyHistoryCard: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyHistoryText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  historyIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyVoucherName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  historyStudentName: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  historyTime: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
});
