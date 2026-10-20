import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../src/constants/colors';
import { useAuth } from '../../src/context/AuthContext';
import { venueApi } from '../../src/api/venueApi';
import { voucherApi } from '../../src/api/voucherApi';

export default function PartnerDashboard() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [venues, setVenues] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [redemptionsCount, setRedemptionsCount] = useState(0);
  const [activeTab, setActiveTab] = useState('venues'); // 'venues' | 'vouchers'

  // Modal QR Check-in Quán
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [selectedQrVenue, setSelectedQrVenue] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);

  // Modal Thêm Quán Mới
  const [venueModalVisible, setVenueModalVisible] = useState(false);
  const [creatingVenue, setCreatingVenue] = useState(false);
  const [venueForm, setVenueForm] = useState({
    name: '',
    address: '',
    phone: '',
    openHours: '07:00 - 22:30',
    priceRange: '25.000đ - 65.000đ',
    description: '',
  });

  // Modal Thêm Voucher Mới
  const [voucherModalVisible, setVoucherModalVisible] = useState(false);
  const [creatingVoucher, setCreatingVoucher] = useState(false);
  const [voucherForm, setVoucherForm] = useState({
    title: '',
    code: '',
    discountPercent: '20',
    totalQuantity: '50',
    validDays: '30',
    venueId: '',
  });

  const loadData = useCallback(async () => {
    try {
      const [venuesRes, vouchersRes, redemptionsRes] = await Promise.all([
        venueApi.getMyVenues().catch(() => ({ data: { data: [] } })),
        voucherApi.getMyPartnerVouchers().catch(() => ({ data: { data: [] } })),
        voucherApi.getPartnerRedemptions(50).catch(() => ({ data: { data: [] } })),
      ]);

      const vList = venuesRes?.data?.data || [];
      setVenues(vList);
      setVouchers(vouchersRes?.data?.data || []);
      setRedemptionsCount((redemptionsRes?.data?.data || []).length);

      if (vList.length > 0 && !voucherForm.venueId) {
        setVoucherForm((prev) => ({ ...prev, venueId: vList[0]._id }));
      }
    } catch (err) {
      console.log('Error loading partner data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [voucherForm.venueId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleToggleVoucher = async (voucherId) => {
    try {
      await voucherApi.toggleVoucherStatus(voucherId);
      setVouchers((prev) =>
        prev.map((v) => (v._id === voucherId ? { ...v, isActive: !v.isActive } : v))
      );
    } catch (err) {
      Alert.alert('Thao tác thất bại', err.message || 'Không thể đổi trạng thái voucher');
    }
  };

  // Mở modal xem QR check-in quán
  const handleOpenCheckinQr = async (venue) => {
    setSelectedQrVenue(null);
    setQrModalVisible(true);
    setQrLoading(true);
    try {
      const res = await venueApi.getCheckinQr(venue._id);
      if (res?.data?.success) {
        setSelectedQrVenue(res.data.data);
      } else {
        throw new Error('Không thể tải mã QR check-in');
      }
    } catch (err) {
      Alert.alert('Lỗi', err?.response?.data?.message || err.message || 'Không thể tải mã QR');
      setQrModalVisible(false);
    } finally {
      setQrLoading(false);
    }
  };

  // Xử lý tạo Quán mới
  const handleCreateVenue = async () => {
    if (!venueForm.name.trim()) {
      return Alert.alert('Thông báo', 'Vui lòng nhập tên quán cafe');
    }
    if (!venueForm.address.trim()) {
      return Alert.alert('Thông báo', 'Vui lòng nhập địa chỉ quán');
    }

    try {
      setCreatingVenue(true);
      const res = await venueApi.createVenue({
        name: venueForm.name.trim(),
        address: venueForm.address.trim(),
        phone: venueForm.phone.trim() || user?.phone || '',
        openHours: venueForm.openHours.trim() || '07:00 - 22:30',
        priceRange: venueForm.priceRange.trim() || '25.000đ - 65.000đ',
        description: venueForm.description.trim() || 'Quán đối tác UNI-MATE dành cho sinh viên.',
        category: 'cafe',
        tags: ['Wifi mạnh', 'Ổ cắm', 'Sinh viên', 'Yên tĩnh'],
      });

      if (res?.data?.success || res?.status === 201) {
        Alert.alert('Thành công 🎉', 'Đã thêm quán cafe mới vào hệ thống!');
        setVenueModalVisible(false);
        setVenueForm({
          name: '',
          address: '',
          phone: '',
          openHours: '07:00 - 22:30',
          priceRange: '25.000đ - 65.000đ',
          description: '',
        });
        loadData();
      }
    } catch (err) {
      Alert.alert('Thêm quán thất bại', err?.response?.data?.message || err.message || 'Có lỗi xảy ra');
    } finally {
      setCreatingVenue(false);
    }
  };

  // Xử lý tạo Voucher mới
  const handleCreateVoucher = async () => {
    if (!voucherForm.title.trim()) {
      return Alert.alert('Thông báo', 'Vui lòng nhập tiêu đề voucher');
    }
    if (!voucherForm.code.trim()) {
      return Alert.alert('Thông báo', 'Vui lòng nhập mã voucher');
    }

    const discount = parseInt(voucherForm.discountPercent, 10) || 20;
    const qty = parseInt(voucherForm.totalQuantity, 10) || 50;
    const days = parseInt(voucherForm.validDays, 10) || 30;

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + days);

    try {
      setCreatingVoucher(true);
      const payload = {
        title: voucherForm.title.trim(),
        code: voucherForm.code.trim().toUpperCase(),
        codeType: 'shared',
        discountPercent: discount,
        totalQuantity: qty,
        remainingCount: qty,
        validUntil: validUntil.toISOString(),
        isActive: true,
      };

      if (voucherForm.venueId) {
        payload.venueId = voucherForm.venueId;
      }

      const res = await voucherApi.createVoucher(payload);
      if (res?.data?.success || res?.status === 201) {
        Alert.alert('Thành công 🎉', 'Đã phát hành voucher mới!');
        setVoucherModalVisible(false);
        setVoucherForm({
          title: '',
          code: '',
          discountPercent: '20',
          totalQuantity: '50',
          validDays: '30',
          venueId: venues[0]?._id || '',
        });
        loadData();
      }
    } catch (err) {
      Alert.alert('Tạo voucher thất bại', err?.response?.data?.message || err.message || 'Mã voucher đã tồn tại');
    } finally {
      setCreatingVoucher(false);
    }
  };

  const businessName =
    user?.partnerProfile?.businessName || user?.fullName || 'Đối tác UNI-MATE';
  const planExpiresAt = user?.partnerProfile?.planExpiresAt;
  const planActive = Boolean(planExpiresAt && new Date(planExpiresAt).getTime() > Date.now());

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Header Profile Bar */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarBox}>
              <Ionicons name="business" size={26} color={COLORS.primary} />
            </View>
            <View style={{ marginLeft: 12 }}>
              <View style={styles.partnerBadge}>
                <Ionicons name="shield-checkmark" size={13} color="#D97706" />
                <Text style={styles.partnerBadgeText}>ĐỐI TÁC CHÍNH THỨC</Text>
              </View>
              <Text style={styles.businessName}>{businessName}</Text>
              <Text style={styles.partnerEmail}>{user?.email}</Text>
            </View>
          </View>
        </View>

        {/* Quick QR Scanner Banner */}
        <TouchableOpacity
          style={styles.quickScanCard}
          onPress={() => router.push('/(partner)/scanner')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[COLORS.primary, '#E64A19']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.quickScanGradient}
          >
            <View style={styles.quickScanIconBox}>
              <Ionicons name="qr-code" size={32} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.quickScanTitle}>Máy quét đối soát Voucher</Text>
              <Text style={styles.quickScanSubtitle}>
                Quét mã QR từ ví sinh viên hoặc nhập mã để áp dụng ưu đãi tại quầy
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Gói Đối tác: quán lên đầu danh sách sinh viên xem */}
        <TouchableOpacity style={styles.planCard} onPress={() => router.push('/checkout?plan=partner_monthly')} activeOpacity={0.85}>
          <Ionicons name="trending-up" size={22} color="#D97706" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.planTitle}>
              {planActive ? `Gói Đối tác còn hạn đến ${new Date(planExpiresAt).toLocaleDateString('vi-VN')}` : 'Gói Đối tác 99.000đ/tháng'}
            </Text>
            <Text style={styles.planSubtitle}>
              {planActive ? 'Nhấn để gia hạn, thời hạn được cộng dồn' : 'Quán lên đầu danh sách sinh viên xem, có huy hiệu nổi bật'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>

        {/* Stats Row */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{venues.length}</Text>
            <Text style={styles.statLabel}>Quán cafe</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{vouchers.length}</Text>
            <Text style={styles.statLabel}>Vouchers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{redemptionsCount}</Text>
            <Text style={styles.statLabel}>Lượt Check-in</Text>
          </View>
        </View>

        {/* Tabs Switcher */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.switchTab, activeTab === 'venues' && styles.activeSwitchTab]}
            onPress={() => setActiveTab('venues')}
          >
            <Ionicons
              name="cafe-outline"
              size={18}
              color={activeTab === 'venues' ? COLORS.primary : COLORS.textMuted}
            />
            <Text
              style={[
                styles.switchTabText,
                activeTab === 'venues' && styles.activeSwitchTabText,
              ]}
            >
              Quán của tôi ({venues.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.switchTab, activeTab === 'vouchers' && styles.activeSwitchTab]}
            onPress={() => setActiveTab('vouchers')}
          >
            <Ionicons
              name="ticket-outline"
              size={18}
              color={activeTab === 'vouchers' ? COLORS.primary : COLORS.textMuted}
            />
            <Text
              style={[
                styles.switchTabText,
                activeTab === 'vouchers' && styles.activeSwitchTabText,
              ]}
            >
              Vouchers ({vouchers.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Action Button Row */}
        <View style={styles.actionHeaderRow}>
          <Text style={styles.tabSectionTitle}>
            {activeTab === 'venues' ? 'Danh sách cơ sở quán' : 'Khuyến mãi đang phát hành'}
          </Text>
          {activeTab === 'venues' ? (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setVenueModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle" size={18} color="#FFF" style={{ marginRight: 4 }} />
              <Text style={styles.addBtnText}>Thêm quán mới</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setVoucherModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle" size={18} color="#FFF" style={{ marginRight: 4 }} />
              <Text style={styles.addBtnText}>Tạo voucher</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Content Section */}
        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ marginTop: 12, color: COLORS.textSecondary, fontSize: 13 }}>
              Đang tải dữ liệu quán & voucher...
            </Text>
          </View>
        ) : activeTab === 'venues' ? (
          /* Venues List */
          venues.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="storefront-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Chưa có quán nào</Text>
              <Text style={styles.emptySubtitle}>
                Bấm vào nút "Thêm quán mới" phía trên để đăng ký quán cafe của bạn trên UNI-MATE.
              </Text>
            </View>
          ) : (
            venues.map((venue) => {
              const statusColor =
                venue.status === 'approved'
                  ? '#10B981'
                  : venue.status === 'rejected'
                  ? '#EF4444'
                  : '#F59E0B';
              const statusText =
                venue.status === 'approved'
                  ? 'Đã phê duyệt'
                  : venue.status === 'rejected'
                  ? 'Bị từ chối'
                  : 'Đang chờ duyệt';

              const coverUri =
                venue.images?.[0] ||
                venue.image ||
                'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600';

              return (
                <View key={venue._id} style={styles.venueCard}>
                  <Image source={{ uri: coverUri }} style={styles.venueImage} />
                  <View style={styles.venueBody}>
                    <View style={styles.venueHeaderRow}>
                      <Text style={styles.venueName} numberOfLines={1}>
                        {venue.name}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
                        <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                          {statusText}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.venueMetaRow}>
                      <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
                      <Text style={styles.venueAddress} numberOfLines={1}>
                        {venue.address}
                      </Text>
                    </View>

                    <View style={styles.venueMetaRow}>
                      <Ionicons name="time-outline" size={14} color={COLORS.textMuted} />
                      <Text style={styles.venueHours}>
                        {venue.openHours || '07:00 - 22:30'}
                      </Text>
                    </View>

                    {/* Button Xem mã QR check-in quán */}
                    <TouchableOpacity
                      style={styles.qrCheckinActionBtn}
                      onPress={() => handleOpenCheckinQr(venue)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="qr-code-outline" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                      <Text style={styles.qrCheckinActionText}>Xem mã QR Check-in quán</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )
        ) : (
          /* Vouchers List */
          vouchers.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="ticket-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Chưa có voucher nào</Text>
              <Text style={styles.emptySubtitle}>
                Bấm nút "Tạo voucher" phía trên để phát hành ưu đãi hấp dẫn dành cho sinh viên.
              </Text>
            </View>
          ) : (
            vouchers.map((voucher) => (
              <View key={voucher._id} style={styles.voucherItemCard}>
                <View style={styles.voucherItemHeader}>
                  <View style={styles.voucherItemTitleRow}>
                    <Ionicons name="gift" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
                    <Text style={styles.voucherItemTitle} numberOfLines={1}>
                      {voucher.title}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleToggleVoucher(voucher._id)}
                    style={[
                      styles.toggleBtn,
                      voucher.isActive ? styles.toggleBtnActive : styles.toggleBtnInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.toggleBtnText,
                        { color: voucher.isActive ? '#10B981' : COLORS.textMuted },
                      ]}
                    >
                      {voucher.isActive ? 'Đang bật' : 'Tạm dừng'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.voucherCodePill}>
                  <Text style={styles.voucherCodeLabel}>MÃ VOUCHER:</Text>
                  <Text style={styles.voucherCodeValue}>{voucher.code}</Text>
                </View>

                <View style={styles.voucherDetailsRow}>
                  <Text style={styles.voucherDetailItem}>
                    🎟️ Còn lại: {voucher.remainingCount ?? voucher.totalQuantity ?? '---'} lượt
                  </Text>
                  <Text style={styles.voucherDetailItem}>
                    📅 HSD: {voucher.validUntil ? new Date(voucher.validUntil).toLocaleDateString('vi-VN') : 'Không hạn'}
                  </Text>
                </View>
              </View>
            ))
          )
        )}
      </ScrollView>

      {/* Modal Xem Mã QR Check-in Quán */}
      <Modal visible={qrModalVisible} transparent animationType="fade" onRequestClose={() => setQrModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.qrModalBox}>
            <View style={styles.modalHeaderClose}>
              <Text style={styles.modalHeaderTitle}>Mã QR Check-in Quán</Text>
              <TouchableOpacity onPress={() => setQrModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {qrLoading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={{ marginTop: 12, color: COLORS.textSecondary }}>Đang tải mã QR...</Text>
              </View>
            ) : selectedQrVenue ? (
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.qrVenueName}>{selectedQrVenue.venueName}</Text>
                <Text style={styles.qrVenueHint}>Dán mã QR này tại quầy thu ngân để sinh viên quét nhận coin</Text>

                <View style={styles.qrImageFrame}>
                  <Image
                    source={{
                      uri: selectedQrVenue.qrImageUrl || `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(selectedQrVenue.qrContent)}`
                    }}
                    style={styles.qrBigImage}
                    resizeMode="contain"
                  />
                </View>

                <View style={styles.qrTextBadge}>
                  <Text style={styles.qrTextLabel}>Chuỗi mã check-in:</Text>
                  <Text style={styles.qrTextContent} selectable>{selectedQrVenue.qrContent}</Text>
                </View>

                <TouchableOpacity
                  style={styles.closeQrBtn}
                  onPress={() => setQrModalVisible(false)}
                >
                  <Text style={styles.closeQrBtnText}>Đóng</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Modal Thêm Quán Mới */}
      <Modal visible={venueModalVisible} transparent animationType="slide" onRequestClose={() => setVenueModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBackdrop}>
          <View style={styles.formModalBox}>
            <View style={styles.modalHeaderClose}>
              <Text style={styles.modalHeaderTitle}>Thêm Quán Cafe Mới</Text>
              <TouchableOpacity onPress={() => setVenueModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Tên quán cafe (*)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ví dụ: The Coffee House - Làng Đại Học"
                value={venueForm.name}
                onChangeText={(v) => setVenueForm({ ...venueForm, name: v })}
              />

              <Text style={styles.inputLabel}>Địa chỉ cụ thể (*)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ví dụ: Số 12 Đường A, Khu phố 6, Linh Trung, TP. Thủ Đức"
                value={venueForm.address}
                onChangeText={(v) => setVenueForm({ ...venueForm, address: v })}
              />

              <Text style={styles.inputLabel}>Số điện thoại liên hệ</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ví dụ: 0901234567"
                keyboardType="phone-pad"
                value={venueForm.phone}
                onChangeText={(v) => setVenueForm({ ...venueForm, phone: v })}
              />

              <View style={styles.twoColRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Giờ mở cửa</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="07:00 - 22:30"
                    value={venueForm.openHours}
                    onChangeText={(v) => setVenueForm({ ...venueForm, openHours: v })}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.inputLabel}>Khoảng giá</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="25.000đ - 65.000đ"
                    value={venueForm.priceRange}
                    onChangeText={(v) => setVenueForm({ ...venueForm, priceRange: v })}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Mô tả không gian quán</Text>
              <TextInput
                style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
                placeholder="Ví dụ: Quán có nhiều ổ cắm, wifi 5GHz, không gian máy lạnh yên tĩnh học bài."
                multiline
                value={venueForm.description}
                onChangeText={(v) => setVenueForm({ ...venueForm, description: v })}
              />

              <TouchableOpacity
                style={[styles.submitFormBtn, creatingVenue && { opacity: 0.7 }]}
                onPress={handleCreateVenue}
                disabled={creatingVenue}
              >
                {creatingVenue ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitFormBtnText}>Lưu & Đăng ký Quán</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Tạo Voucher Mới */}
      <Modal visible={voucherModalVisible} transparent animationType="slide" onRequestClose={() => setVoucherModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBackdrop}>
          <View style={styles.formModalBox}>
            <View style={styles.modalHeaderClose}>
              <Text style={styles.modalHeaderTitle}>Tạo Voucher Mới</Text>
              <TouchableOpacity onPress={() => setVoucherModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Tiêu đề voucher (*)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ví dụ: Giảm 20% tổng hóa đơn cho sinh viên"
                value={voucherForm.title}
                onChangeText={(v) => setVoucherForm({ ...voucherForm, title: v })}
              />

              <Text style={styles.inputLabel}>Mã voucher (*)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ví dụ: UNIMATE20"
                autoCapitalize="characters"
                value={voucherForm.code}
                onChangeText={(v) => setVoucherForm({ ...voucherForm, code: v.toUpperCase() })}
              />

              <View style={styles.twoColRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Mức giảm (%)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="20"
                    keyboardType="number-pad"
                    value={voucherForm.discountPercent}
                    onChangeText={(v) => setVoucherForm({ ...voucherForm, discountPercent: v })}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.inputLabel}>Số lượt phát hành</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="50"
                    keyboardType="number-pad"
                    value={voucherForm.totalQuantity}
                    onChangeText={(v) => setVoucherForm({ ...voucherForm, totalQuantity: v })}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Số ngày hiệu lực (kể từ hôm nay)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="30"
                keyboardType="number-pad"
                value={voucherForm.validDays}
                onChangeText={(v) => setVoucherForm({ ...voucherForm, validDays: v })}
              />

              <TouchableOpacity
                style={[styles.submitFormBtn, creatingVoucher && { opacity: 0.7 }]}
                onPress={handleCreateVoucher}
                disabled={creatingVoucher}
              >
                {creatingVoucher ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitFormBtnText}>Phát hành Voucher</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarBox: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  partnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  partnerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  businessName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  partnerEmail: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  quickScanCard: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  quickScanGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  quickScanIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickScanTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  quickScanSubtitle: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 3,
    lineHeight: 16,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  planTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  planSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.border,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  switchTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  activeSwitchTab: {
    backgroundColor: COLORS.primary + '15',
  },
  switchTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginLeft: 6,
  },
  activeSwitchTabText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  actionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tabSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  venueCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  venueImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#E2E8F0',
  },
  venueBody: {
    padding: 14,
  },
  venueHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  venueName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  venueMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  venueAddress: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 6,
    flex: 1,
  },
  venueHours: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 6,
  },
  qrCheckinActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    paddingVertical: 8,
    marginTop: 12,
  },
  qrCheckinActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  voucherItemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  voucherItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  voucherItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  voucherItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  toggleBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  toggleBtnInactive: {
    backgroundColor: '#F1F5F9',
    borderColor: COLORS.border,
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  voucherCodePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  voucherCodeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginRight: 6,
  },
  voucherCodeValue: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  voucherDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  voucherDetailItem: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  // Modal Backdrop
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalHeaderClose: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  qrModalBox: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  qrVenueName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  qrVenueHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  qrImageFrame: {
    padding: 12,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  qrBigImage: {
    width: 220,
    height: 220,
  },
  qrTextBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 10,
    width: '100%',
    marginBottom: 16,
  },
  qrTextLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  qrTextContent: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  closeQrBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  closeQrBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  formModalBox: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: '#F8FAFC',
  },
  twoColRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  submitFormBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  submitFormBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
});
