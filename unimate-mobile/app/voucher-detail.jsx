import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../src/constants/colors';

const { width } = Dimensions.get('window');

export default function VoucherDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [redeemed, setRedeemed] = useState(false);

  const venueName = params.venueName || 'The Coffee House - Sư Vạn Hạnh';
  const voucherTitle = params.voucherTitle || 'Giảm 20% tổng hoá đơn';
  const voucherCode = params.voucherCode || 'VCH-2024-X9F2';

  const handleRedeem = () => {
    Alert.alert(
      'Xác nhận sử dụng',
      'Đưa mã này cho thu ngân quán để quét mã check-in. Bạn có muốn xác nhận?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: () => {
            setRedeemed(true);
            Alert.alert('Thành công', 'Voucher đã được ghi nhận check-in tại quán!');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết Voucher</Text>
        <TouchableOpacity style={styles.shareBtn}>
          <Ionicons name="share-outline" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Ticket Container with Cut-outs */}
        <View style={styles.ticketCard}>
          {/* Ticket Header */}
          <View style={styles.ticketHeader}>
            <View style={styles.brandBadge}>
              <Text style={styles.brandText}>UNI-MATE REWARDS</Text>
            </View>
            <Text style={styles.venueNameText}>{venueName}</Text>
            <Text style={styles.voucherTitleText}>{voucherTitle}</Text>
          </View>

          {/* Dotted Divider with Side Notches */}
          <View style={styles.dividerRow}>
            <View style={[styles.notch, styles.notchLeft]} />
            <View style={styles.dottedLine} />
            <View style={[styles.notch, styles.notchRight]} />
          </View>

          {/* QR Code Section */}
          <View style={styles.qrSection}>
            <View style={styles.qrFrame}>
              {/* Clean Mock QR Pattern */}
              <View style={styles.qrGrid}>
                {/* Simulated QR Code Blocks */}
                <View style={styles.qrCornerTL}>
                  <View style={styles.qrInnerSquare} />
                </View>
                <View style={styles.qrCornerTR}>
                  <View style={styles.qrInnerSquare} />
                </View>
                <View style={styles.qrCornerBL}>
                  <View style={styles.qrInnerSquare} />
                </View>
                <Ionicons name="qr-code" size={140} color={COLORS.textDark} />
              </View>
            </View>

            <Text style={styles.codeText}>{voucherCode}</Text>

            {/* Countdown Badge */}
            <View style={styles.countdownBox}>
              <Ionicons name="timer-outline" size={15} color={COLORS.primary} />
              <Text style={styles.countdownText}>Hết hạn trong: 04 ngày 18:32:10</Text>
            </View>
          </View>

          {/* Status stamp if redeemed */}
          {redeemed && (
            <View style={styles.redeemedStamp}>
              <Text style={styles.redeemedText}>ĐÃ SỬ DỤNG</Text>
            </View>
          )}
        </View>

        {/* How to use */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Hướng dẫn sử dụng</Text>
          <View style={styles.stepRow}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumText}>1</Text>
            </View>
            <Text style={styles.stepDesc}>
              Đến quán đối tác <Text style={{ fontWeight: '700' }}>{venueName}</Text> cùng bạn bè đã match.
            </Text>
          </View>

          <View style={styles.stepRow}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumText}>2</Text>
            </View>
            <Text style={styles.stepDesc}>
              Mở màn hình này và đưa mã QR cho nhân viên thu ngân quét trước khi gọi món.
            </Text>
          </View>

          <View style={styles.stepRow}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumText}>3</Text>
            </View>
            <Text style={styles.stepDesc}>
              Tận hưởng buổi hẹn cafe học tập cùng bạn bè và nhận giảm giá trực tiếp!
            </Text>
          </View>
        </View>

        {/* Terms */}
        <View style={styles.termsSection}>
          <Text style={styles.termsTitle}>Điều kiện áp dụng</Text>
          <Text style={styles.termLine}>• Mỗi voucher chỉ áp dụng cho 1 lần thanh toán.</Text>
          <Text style={styles.termLine}>• Có giá trị tại cơ sở được ghi rõ trên voucher.</Text>
          <Text style={styles.termLine}>• Không quy đổi thành tiền mặt hoặc hoàn lại tiền thừa.</Text>
        </View>

        {/* Actions */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.primaryAction, redeemed && styles.disabledAction]}
            onPress={handleRedeem}
            disabled={redeemed}
            activeOpacity={0.85}
          >
            <Ionicons name="scan-outline" size={18} color={COLORS.white} style={{ marginRight: 8 }} />
            <Text style={styles.primaryActionText}>
              {redeemed ? 'Voucher đã dùng' : 'Quét xác nhận tại quầy'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={() => router.push('/(tabs)/explore')}
            activeOpacity={0.7}
          >
            <Ionicons name="map-outline" size={18} color={COLORS.text} style={{ marginRight: 6 }} />
            <Text style={styles.secondaryActionText}>Tìm đường đến quán</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },
  shareBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  ticketCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  ticketHeader: {
    padding: 20,
    alignItems: 'center',
  },
  brandBadge: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  brandText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  venueNameText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  voucherTitleText: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    height: 30,
  },
  notch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  notchLeft: {
    left: -12,
  },
  notchRight: {
    right: -12,
  },
  dottedLine: {
    flex: 1,
    marginHorizontal: 16,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qrSection: {
    padding: 20,
    alignItems: 'center',
  },
  qrFrame: {
    padding: 16,
    backgroundColor: '#FAFAFA',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  qrGrid: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 3,
    marginTop: 14,
  },
  countdownBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '12',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 10,
    gap: 6,
  },
  countdownText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  redeemedStamp: {
    position: 'absolute',
    top: '40%',
    left: '20%',
    right: '20%',
    borderWidth: 4,
    borderColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    transform: [{ rotate: '-15deg' }],
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  redeemedText: {
    color: '#EF4444',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
  },
  infoSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 14,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  stepNumText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
  },
  stepDesc: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
  termsSection: {
    paddingHorizontal: 8,
    marginTop: 16,
  },
  termsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  termLine: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  actionButtons: {
    marginTop: 24,
    gap: 12,
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledAction: {
    backgroundColor: COLORS.textMuted,
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryActionText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingVertical: 14,
    borderRadius: 16,
  },
  secondaryActionText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
});
