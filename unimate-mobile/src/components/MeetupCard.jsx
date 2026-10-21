import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

export const isMeetupMessage = (item) => item?.type === 'meetup' && Boolean(item.meetup);

const STATUS = {
  proposed: { label: 'Chờ trả lời', color: '#B45309', bg: '#FEF3C7' },
  accepted: { label: 'Đã chốt hẹn', color: '#047857', bg: '#D1FAE5' },
  completed: { label: 'Đã gặp tại quán', color: '#1D4ED8', bg: '#DBEAFE' },
  declined: { label: 'Đã từ chối', color: '#64748B', bg: '#F1F5F9' },
  cancelled: { label: 'Đã huỷ', color: '#64748B', bg: '#F1F5F9' },
};

const formatMeetupTime = (value) =>
  value
    ? new Date(value).toLocaleString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : null;

/**
 * Thẻ "Rủ đi cafe" trong phòng chat.
 * isMine: mình là người mời. busy: đang gửi trả lời. onOpenWallet: mở ví voucher.
 */
export function MeetupCard({ meetup, isMine, buddyName, busy, onRespond, onCancel, onOpenWallet }) {
  const status = STATUS[meetup.status] || STATUS.proposed;
  const time = formatMeetupTime(meetup.scheduledAt);
  const rewardDone = meetup.status === 'accepted' || meetup.status === 'completed';

  return (
    <View style={styles.card}>
      {Boolean(meetup.venueImage) && <Image source={{ uri: meetup.venueImage }} style={styles.image} />}
      <View style={styles.body}>
        <View style={styles.headRow}>
          <Text style={styles.kicker}>☕ Rủ đi cafe</Text>
          <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <Text style={styles.venueName}>{meetup.venueName}</Text>
        <Text style={styles.venueAddress}>{meetup.venueAddress}</Text>

        {Boolean(time) && (
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={13} color="#334155" />
            <Text style={styles.timeText}>{time}</Text>
          </View>
        )}

        {meetup.rewardTitle ? (
          <View style={styles.rewardBox}>
            <Ionicons name="gift-outline" size={14} color="#9A3412" />
            <Text style={styles.rewardText}>
              {rewardDone ? 'Đã vào ví của cả hai: ' : 'Chốt hẹn, cả hai cùng nhận: '}
              <Text style={styles.bold}>{meetup.rewardTitle}</Text>
            </Text>
          </View>
        ) : (
          meetup.status === 'accepted' && <Text style={styles.muted}>Quán chưa có ưu đãi hẹn cafe.</Text>
        )}

        {meetup.status === 'proposed' && !isMine && (
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} disabled={busy} onPress={() => onRespond('accept')}>
              {busy ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={styles.btnPrimaryText}>Đồng ý</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnGhost]} disabled={busy} onPress={() => onRespond('decline')}>
              <Text style={styles.btnGhostText}>Để lần khác</Text>
            </TouchableOpacity>
          </View>
        )}

        {meetup.status === 'proposed' && isMine && (
          <View style={styles.waitRow}>
            <Text style={styles.muted}>Đang chờ {buddyName || 'bạn ấy'} trả lời</Text>
            <TouchableOpacity disabled={busy} onPress={onCancel}>
              <Text style={styles.cancelText}>Huỷ lời mời</Text>
            </TouchableOpacity>
          </View>
        )}

        {meetup.status === 'accepted' && (
          <>
            {Boolean(meetup.rewardTitle) && (
              <TouchableOpacity style={[styles.btn, styles.btnPrimary, { marginTop: 4 }]} onPress={onOpenWallet}>
                <Text style={styles.btnPrimaryText}>Mở ví voucher</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.muted}>Tới quán, mỗi người đưa mã QR trong ví cho quán quét để dùng ưu đãi.</Text>
          </>
        )}

        {meetup.status === 'completed' && (
          <Text style={styles.doneText}>Hai bạn đã gặp nhau tại quán. Mỗi người được thưởng UniCoin 🎉</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: 240, backgroundColor: COLORS.white, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
  image: { width: '100%', height: 100 },
  body: { padding: 10, gap: 6 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kicker: { fontSize: 11, fontWeight: '800', color: COLORS.primary },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  statusText: { fontSize: 10.5, fontWeight: '800' },
  venueName: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  venueAddress: { fontSize: 12, color: '#64748B' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  timeText: { fontSize: 12, color: '#334155', fontWeight: '600' },
  rewardBox: { flexDirection: 'row', gap: 6, padding: 8, borderRadius: 8, backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FDBA74', borderStyle: 'dashed' },
  rewardText: { flex: 1, fontSize: 12, color: '#9A3412' },
  bold: { fontWeight: '800' },
  muted: { fontSize: 11.5, color: '#64748B' },
  actions: { flexDirection: 'row', gap: 6, marginTop: 2 },
  btn: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: COLORS.primary },
  btnPrimaryText: { color: COLORS.white, fontSize: 12.5, fontWeight: '800' },
  btnGhost: { borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: COLORS.white },
  btnGhostText: { color: '#475569', fontSize: 12.5, fontWeight: '800' },
  waitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cancelText: { fontSize: 11.5, color: '#94A3B8', fontWeight: '700', textDecorationLine: 'underline' },
  doneText: { fontSize: 11.5, color: '#1D4ED8', fontWeight: '700' },
});
