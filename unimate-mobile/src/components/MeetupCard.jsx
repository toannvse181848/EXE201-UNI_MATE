import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

export const isMeetupMessage = (item) => item?.type === 'meetup' && Boolean(item.meetup);

const STATUS = {
  proposed: { label: 'Chờ trả lời', color: '#B45309', bg: '#FEF3C7' },
  accepted: { label: 'Đã chốt hẹn', color: '#047857', bg: '#D1FAE5' },
  completed: { label: 'Đã gặp tại quán', color: '#1D4ED8', bg: '#DBEAFE' },
  declined: { label: 'Đã từ chối', color: '#64748B', bg: '#F1F5F9' },
  cancelled: { label: 'Đã huỷ', color: '#64748B', bg: '#F1F5F9' },
  expired: { label: 'Hết hạn', color: '#64748B', bg: '#F1F5F9' },
  no_show: { label: 'Không diễn ra', color: '#64748B', bg: '#F1F5F9' },
};

const formatMeetupTime = (value) =>
  value
    ? new Date(value).toLocaleString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : null;

/**
 * Thẻ "Rủ cả nhóm đi cafe" trong chat nhóm.
 * currentUserId: người đang xem. busy: đang gửi thao tác. onAction('join' | 'leave' | 'cancel'). onOpenWallet: mở ví voucher.
 */
export function GroupMeetupCard({ meetup, currentUserId, busy, onAction, onOpenWallet }) {
  const status = STATUS[meetup.status] || STATUS.proposed;
  const time = formatMeetupTime(meetup.scheduledAt);
  const participants = meetup.participants || [];
  const joined = participants.some((p) => String(p.user) === String(currentUserId));
  const isOrganizer = String(meetup.proposedBy) === String(currentUserId);
  const isOpen = meetup.status === 'proposed' || meetup.status === 'accepted';
  const isFull = participants.length >= (meetup.maxPeople || Infinity);
  const rewardDone = meetup.status === 'accepted' || meetup.status === 'completed';
  const rewardRevoked = Boolean(meetup.rewardTitle) && (meetup.status === 'cancelled' || meetup.status === 'no_show');

  const confirmThen = (title, text, label, action) => {
    Alert.alert(title, text, [
      { text: 'Không', style: 'cancel' },
      { text: label, style: 'destructive', onPress: () => onAction(action) },
    ]);
  };

  return (
    <View style={styles.card}>
      {Boolean(meetup.venueImage) && <Image source={{ uri: meetup.venueImage }} style={styles.image} />}
      <View style={styles.body}>
        <View style={styles.headRow}>
          <Text style={styles.kicker}>☕ Rủ cả nhóm đi cafe</Text>
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

        {Boolean(meetup.rewardTitle) && (rewardDone || meetup.status === 'proposed') && (
          <View style={styles.rewardBox}>
            <Ionicons name="gift-outline" size={14} color="#9A3412" />
            <Text style={styles.rewardText}>
              {rewardDone ? 'Mỗi bạn tham gia có trong ví: ' : 'Có từ 2 bạn tham gia, mỗi bạn nhận: '}
              <Text style={styles.bold}>{meetup.rewardTitle}</Text>
            </Text>
          </View>
        )}
        {!meetup.rewardTitle && meetup.status === 'accepted' && <Text style={styles.muted}>Quán chưa có ưu đãi hẹn cafe.</Text>}

        <Text style={styles.timeText}>
          <Text style={styles.bold}>
            {participants.length}{meetup.maxPeople ? `/${meetup.maxPeople}` : ''} bạn tham gia:{' '}
          </Text>
          {participants.map((p) => p.fullName).join(', ')}
        </Text>

        {isOpen && !joined && !isFull && (
          <TouchableOpacity style={[styles.btn, styles.btnPrimary, { marginTop: 2 }]} disabled={busy} onPress={() => onAction('join')}>
            {busy ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={styles.btnPrimaryText}>Tham gia</Text>}
          </TouchableOpacity>
        )}
        {isOpen && !joined && isFull && <Text style={styles.muted}>Buổi hẹn này đã đủ người.</Text>}

        {meetup.status === 'proposed' && isOrganizer && (
          <View style={styles.waitRow}>
            <Text style={[styles.muted, { flex: 1 }]}>Đang chờ các bạn trong nhóm tham gia</Text>
            <TouchableOpacity disabled={busy} onPress={() => onAction('cancel')}>
              <Text style={styles.cancelText}>Huỷ lời mời</Text>
            </TouchableOpacity>
          </View>
        )}

        {meetup.status === 'accepted' && joined && (
          <>
            {Boolean(meetup.rewardTitle) && (
              <TouchableOpacity style={[styles.btn, styles.btnPrimary, { marginTop: 4 }]} onPress={onOpenWallet}>
                <Text style={styles.btnPrimaryText}>Mở ví voucher</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.muted}>
              {meetup.rewardTitle
                ? 'Cả nhóm cùng tới quán: quán quét mã QR trong ví của từ 2 bạn trở lên rồi mới áp dụng ưu đãi (đi một mình không dùng được). Hoặc từ 2 bạn cùng quét QR check-in của quán để được tính là đã gặp.'
                : 'Tới quán, từ 2 bạn cùng quét mã QR check-in dán tại quán trong ngày để được tính là đã gặp.'}
            </Text>
            {isOrganizer ? (
              <TouchableOpacity disabled={busy} onPress={() => confirmThen('Huỷ buổi hẹn này?', 'Ưu đãi chưa dùng của mọi người sẽ bị thu hồi khỏi ví.', 'Huỷ buổi hẹn', 'cancel')}>
                <Text style={styles.cancelText}>Huỷ buổi hẹn</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity disabled={busy} onPress={() => confirmThen('Không đi nữa?', 'Ưu đãi chưa dùng của bạn sẽ bị thu hồi khỏi ví.', 'Không đi nữa', 'leave')}>
                <Text style={styles.cancelText}>Không đi nữa</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {meetup.status === 'completed' && (
          <Text style={styles.doneText}>Nhóm đã gặp nhau tại quán. Bạn nào có mặt được thưởng UniCoin 🎉 (tính trong giới hạn 60 UniCoin/ngày). Bạn đến muộn vẫn dùng được ưu đãi trong 24 giờ.</Text>
        )}

        {rewardRevoked && <Text style={styles.muted}>Ưu đãi chưa dùng của buổi này đã được thu hồi khỏi ví.</Text>}

        {meetup.status === 'expired' && (
          <Text style={styles.muted}>Lời mời không có ai tham gia trong 48 giờ nên đã hết hạn.</Text>
        )}

        {meetup.status === 'no_show' && (
          <Text style={styles.muted}>Đã quá giờ hẹn mà chưa ghi nhận nhóm tới quán.</Text>
        )}
      </View>
    </View>
  );
}

/**
 * Thẻ "Rủ đi cafe" trong phòng chat.
 * isMine: mình là người mời. busy: đang gửi trả lời. onOpenWallet: mở ví voucher.
 */
export function MeetupCard({ meetup, isMine, buddyName, busy, onRespond, onCancel, onOpenWallet }) {
  const status = STATUS[meetup.status] || STATUS.proposed;
  const time = formatMeetupTime(meetup.scheduledAt);
  const rewardDone = meetup.status === 'accepted' || meetup.status === 'completed';
  // Lời mời bị từ chối / huỷ / hết hạn thì không còn ưu đãi để hứa
  const rewardOpen = rewardDone || meetup.status === 'proposed';
  // Buổi đã chốt có voucher trong ví mà không diễn ra thì voucher bị thu hồi
  const rewardRevoked = Boolean(meetup.rewardTitle) && (meetup.status === 'cancelled' || meetup.status === 'no_show');

  const handleCancelAccepted = () => {
    Alert.alert('Huỷ buổi hẹn này?', 'Ưu đãi chưa dùng của cả hai bạn sẽ bị thu hồi khỏi ví.', [
      { text: 'Không', style: 'cancel' },
      { text: 'Huỷ buổi hẹn', style: 'destructive', onPress: onCancel },
    ]);
  };

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

        {meetup.rewardTitle && rewardOpen ? (
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
            <Text style={styles.muted}>
              {meetup.rewardTitle
                ? 'Hai bạn cùng tới quán: quán quét mã QR trong ví của cả hai rồi mới áp dụng ưu đãi (đi một mình không dùng được). Hoặc cả hai quét QR check-in của quán để được tính là đã gặp.'
                : 'Tới quán, cả hai cùng quét mã QR check-in dán tại quán trong ngày để được tính là đã gặp.'}
            </Text>
            <TouchableOpacity disabled={busy} onPress={handleCancelAccepted}>
              <Text style={styles.cancelText}>Huỷ buổi hẹn</Text>
            </TouchableOpacity>
          </>
        )}

        {meetup.status === 'completed' && (
          <Text style={styles.doneText}>Hai bạn đã gặp nhau tại quán. Mỗi người được thưởng UniCoin 🎉 (tính trong giới hạn 60 UniCoin/ngày)</Text>
        )}

        {rewardRevoked && <Text style={styles.muted}>Ưu đãi chưa dùng của buổi này đã được thu hồi khỏi ví.</Text>}

        {meetup.status === 'expired' && (
          <Text style={styles.muted}>Lời mời không được trả lời trong 48 giờ nên đã hết hạn.</Text>
        )}

        {meetup.status === 'no_show' && (
          <Text style={styles.muted}>Đã quá giờ hẹn mà chưa ghi nhận hai bạn tới quán.</Text>
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
