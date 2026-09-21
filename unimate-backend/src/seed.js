require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Venue = require('./models/Venue');
const Voucher = require('./models/Voucher');
const Match = require('./models/Match');
const Message = require('./models/Message');
const UserVoucher = require('./models/UserVoucher');
const Report = require('./models/Report');
const crypto = require('crypto');

const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://localhost:27017/unimate';

async function seedData() {
  try {
    console.log('⏳ Đang kết nối tới MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Đã kết nối MongoDB thành công');

    // Xoá dữ liệu seed cũ nhưng BẢO VỆ tuyệt đối các user thật do người dùng đăng ký
    console.log('🧹 Đang dọn dẹp dữ liệu seed cũ...');
    const SEED_EMAILS = [
      'admin@unimate.vn',
      'partner@thecoffeehouse.vn',
      'toan.nguyen@fpt.edu.vn',
      'thao.le@hcmut.edu.vn',
      'nam.tran@ueh.edu.vn',
      'linh.pham@uit.edu.vn',
    ];
    await User.deleteMany({ email: { $in: SEED_EMAILS } });
    await Venue.deleteMany({});
    await Voucher.deleteMany({});
    await Match.deleteMany({});
    await Message.deleteMany({});
    await UserVoucher.deleteMany({});
    await Report.deleteMany({});

    // ─────────────────────────────────────────────────────────
    // 1. USERS
    // ─────────────────────────────────────────────────────────
    console.log('👤 Đang tạo Users mẫu (Admin, Partner, Sinh viên)...');
    const admin = await User.create({
      email: 'admin@unimate.vn',
      password: 'password123',
      fullName: 'Quản Trị Viên (Admin)',
      role: 'admin',
      status: 'active',
      isProfileCompleted: true,
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200',
    });

    const partner = await User.create({
      email: 'partner@thecoffeehouse.vn',
      password: 'password123',
      fullName: 'The Coffee House Partner',
      role: 'partner',
      status: 'active',
      isProfileCompleted: true,
      phone: '0901234567',
      partnerProfile: { businessName: 'The Coffee House Việt Nam' },
      avatar: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=200',
    });

    const studentToan = await User.create({
      email: 'toan.nguyen@fpt.edu.vn',
      password: 'password123',
      fullName: 'Nguyễn Văn Toàn',
      role: 'student',
      status: 'active',
      isProfileCompleted: true,
      phone: '0981234567',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      studentProfile: {
        studentId: 'SE181848',
        university: 'Đại học FPT TP.HCM',
        major: 'Kỹ thuật Phần mềm',
        year: 'Năm 3',
        gender: 'male',
        bio: 'Tìm bạn cùng cày deadline & khám phá các quán cafe yên tĩnh khu Công nghệ cao 🚀',
        interests: ['Lập trình React', 'Cà phê học bài', 'Boardgame', 'Nhiếp ảnh'],
        objectives: ['study_buddy', 'project'],
        uniCoin: 450,
        trustScore: 98,
        isVerifiedStudent: true,
      },
    });

    const studentThao = await User.create({
      email: 'thao.le@hcmut.edu.vn',
      password: 'password123',
      fullName: 'Lê Phương Thảo',
      role: 'student',
      status: 'active',
      isProfileCompleted: true,
      phone: '0977889900',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200',
      studentProfile: {
        studentId: '2110482',
        university: 'ĐH Bách Khoa TP.HCM',
        major: 'Khoa học Máy tính',
        year: 'Năm 3',
        gender: 'female',
        bio: 'Thích học cafe cuối tuần, đang cày LeetCode & ôn IELTS 7.5.',
        interests: ['Lập trình', 'IELTS 7.0', 'Cafe chill', 'Đọc sách'],
        objectives: ['study_buddy'],
        uniCoin: 380,
        trustScore: 97,
        isVerifiedStudent: true,
      },
    });

    const studentNam = await User.create({
      email: 'nam.tran@ueh.edu.vn',
      password: 'password123',
      fullName: 'Trần Hoàng Nam',
      role: 'student',
      status: 'active',
      isProfileCompleted: true,
      phone: '0933445566',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200',
      studentProfile: {
        studentId: '3120102',
        university: 'ĐH Kinh Tế TP.HCM (UEH)',
        major: 'Tài chính - Fintech',
        year: 'Năm 4',
        gender: 'male',
        bio: 'Tìm bạn đi cafe The Coffee House thảo luận ý tưởng khởi nghiệp.',
        interests: ['Tài chính', 'Đọc sách', 'Chụp ảnh film', 'Startup'],
        objectives: ['networking', 'study_buddy'],
        uniCoin: 520,
        trustScore: 94,
        isVerifiedStudent: true,
      },
    });

    const studentLinh = await User.create({
      email: 'linh.pham@uit.edu.vn',
      password: 'password123',
      fullName: 'Phạm Ngọc Linh',
      role: 'student',
      status: 'active',
      isProfileCompleted: true,
      phone: '0922334455',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200',
      studentProfile: {
        studentId: '21521081',
        university: 'ĐH Công nghệ Thông tin (UIT)',
        major: 'An toàn Thông tin',
        year: 'Năm 3',
        gender: 'female',
        bio: 'Đam mê CTF, tìm teammate cho các giải bảo mật và học nhóm môn mạng.',
        interests: ['Cybersecurity', 'CTF', 'Python', 'Gaming'],
        objectives: ['project', 'study_buddy'],
        uniCoin: 300,
        trustScore: 96,
        isVerifiedStudent: true,
      },
    });

    // ─────────────────────────────────────────────────────────
    // 2. VENUES
    // ─────────────────────────────────────────────────────────
    console.log('☕ Đang tạo các Quán cafe đối tác...');
    const venueTCH = await Venue.create({
      name: 'The Coffee House - Sư Vạn Hạnh',
      partnerId: partner._id,
      address: '798 Sư Vạn Hạnh, Phường 12, Quận 10, TP.HCM',
      district: 'Quận 10',
      city: 'TP.HCM',
      openHours: '07:00 - 22:30',
      priceRange: '35.000 - 65.000 VNĐ',
      rating: 4.8,
      reviewsCount: 142,
      category: 'study',
      image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800',
      tags: ['Wifi cực mạnh', 'Nhiều ổ cắm', 'Không gian rộng'],
      description: 'Quán có không gian mở 3 tầng, tầng 2 và 3 yên tĩnh phù hợp cho học nhóm và làm bài.',
      amenities: {
        wifiSpeed: '120 Mbps',
        powerSockets: 'Mỗi bàn đều có',
        quietScore: '4.9/5.0',
        airConditioning: 'Mát lạnh 24/7',
      },
      status: 'approved',
    });

    const venueCong = await Venue.create({
      name: 'Cộng Cà Phê - Tô Hiến Thành',
      partnerId: partner._id,
      address: '274 Tô Hiến Thành, Phường 14, Quận 10, TP.HCM',
      district: 'Quận 10',
      city: 'TP.HCM',
      openHours: '07:30 - 23:00',
      priceRange: '39.000 - 69.000 VNĐ',
      rating: 4.7,
      reviewsCount: 98,
      category: 'chill',
      image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800',
      tags: ['Decor hoài niệm', 'Chill trò chuyện', 'Nhạc nhẹ'],
      description: 'Phong cách bao cấp độc đáo, ấm cúng để chia sẻ câu chuyện.',
      status: 'approved',
    });

    const venueWorkshop = await Venue.create({
      name: 'The Workshop Coffee & Boardgame',
      partnerId: partner._id,
      address: '152 Nguyễn Trãi, Phường 3, Quận 5, TP.HCM',
      district: 'Quận 5',
      city: 'TP.HCM',
      openHours: '08:00 - 22:00',
      priceRange: '45.000 - 85.000 VNĐ',
      rating: 4.9,
      reviewsCount: 210,
      category: 'boardgame',
      image: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800',
      tags: ['Boardgame hơn 100 bộ', 'Máy lạnh êm', 'Đồ uống ngon'],
      description: 'Không gian tích hợp cafe specialty và thư viện boardgame.',
      status: 'approved',
    });

    // Quán chờ duyệt
    await Venue.create({
      name: 'Chill Corner Specialty Coffee',
      partnerId: partner._id,
      address: '45 Võ Văn Tần, Phường 6, Quận 3, TP.HCM',
      district: 'Quận 3',
      city: 'TP.HCM',
      openHours: '08:00 - 22:00',
      priceRange: '40.000 - 70.000 VNĐ',
      category: 'study',
      image: 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=800',
      tags: ['Yên tĩnh', 'Cà phê rang mộc'],
      description: 'Quán cafe mới mở xin gia nhập hệ thống đối tác Uni-Mate.',
      status: 'pending',
    });

    // ─────────────────────────────────────────────────────────
    // 3. VOUCHERS
    // ─────────────────────────────────────────────────────────
    console.log('🎟️ Đang tạo các Voucher khuyến mãi...');
    const [voucherTCH, voucherCong, voucherBG] = await Voucher.create([
      {
        code: 'TCH-UNI20',
        title: 'Giảm 20% tổng hoá đơn',
        description: 'Áp dụng cho sinh viên có thẻ học sinh/sinh viên tại quầy',
        discountPercent: 20,
        venueId: venueTCH._id,
        partnerId: partner._id,
        quantity: 200,
        usedCount: 35,
        validUntil: new Date('2026-12-31'),
        isActive: true,
        terms: ['Áp dụng tại The Coffee House Sư Vạn Hạnh', 'Đưa mã QR khi gọi món'],
      },
      {
        code: 'CONG-B1G1',
        title: 'Mua 1 tặng 1 đồ uống',
        description: 'Tặng 01 ly đồ uống đồng giá cho cặp đôi ghép đôi thành công',
        discountPercent: 50,
        venueId: venueCong._id,
        partnerId: partner._id,
        quantity: 100,
        usedCount: 22,
        validUntil: new Date('2026-11-30'),
        isActive: true,
        terms: ['Áp dụng tại Cộng Tô Hiến Thành', 'Áp dụng dùng tại quán'],
      },
      {
        code: 'WS-BG2H',
        title: 'Tặng 2 giờ chơi Boardgame',
        description: 'Miễn phí tiền giờ chơi boardgame cho nhóm từ 2 bạn',
        discountPercent: 100,
        venueId: venueWorkshop._id,
        partnerId: partner._id,
        quantity: 80,
        usedCount: 14,
        validUntil: new Date('2026-12-15'),
        isActive: true,
        terms: ['Mỗi người gọi ít nhất 1 đồ uống'],
      },
    ]);

    // ─────────────────────────────────────────────────────────
    // 4. USER VOUCHERS (Ví sinh viên)
    // ─────────────────────────────────────────────────────────
    console.log('💰 Đang tạo Ví Voucher cho sinh viên...');
    await UserVoucher.create([
      {
        userId: studentToan._id,
        voucherId: voucherTCH._id,
        status: 'saved',
        qrPayload: `UVM-${crypto.randomBytes(8).toString('hex').toUpperCase()}`,
      },
      {
        userId: studentToan._id,
        voucherId: voucherBG._id,
        status: 'used',
        qrPayload: `UVM-${crypto.randomBytes(8).toString('hex').toUpperCase()}`,
        usedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        userId: studentThao._id,
        voucherId: voucherCong._id,
        status: 'saved',
        qrPayload: `UVM-${crypto.randomBytes(8).toString('hex').toUpperCase()}`,
      },
    ]);

    // ─────────────────────────────────────────────────────────
    // 5. MATCHES
    // ─────────────────────────────────────────────────────────
    console.log('💘 Đang tạo các Match ghép đôi...');

    // Match 1: Toàn ↔ Thảo (đã ghép thành công)
    const matchToanThao = await Match.create({
      user1: studentToan._id,
      user2: studentThao._id,
      user1Action: 'like',
      user2Action: 'like',
      status: 'matched',
      matchedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 ngày trước
      proposedVenue: venueTCH._id,
    });

    // Match 2: Toàn ↔ Linh (đã ghép)
    const matchToanLinh = await Match.create({
      user1: studentLinh._id,
      user2: studentToan._id,
      user1Action: 'like',
      user2Action: 'like',
      status: 'matched',
      matchedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 ngày trước
    });

    // Match 3: Nam ↔ Thảo (đang pending)
    await Match.create({
      user1: studentNam._id,
      user2: studentThao._id,
      user1Action: 'like',
      user2Action: 'pending',
      status: 'pending',
    });

    // Match 4: Nam ↔ Linh (pass)
    await Match.create({
      user1: studentNam._id,
      user2: studentLinh._id,
      user1Action: 'pass',
      user2Action: 'pending',
      status: 'passed',
    });

    // ─────────────────────────────────────────────────────────
    // 6. MESSAGES (Chat mẫu)
    // ─────────────────────────────────────────────────────────
    console.log('💬 Đang tạo tin nhắn mẫu...');
    const now = Date.now();

    // Toàn ↔ Thảo (có cuộc trò chuyện đầy đủ)
    await Message.create([
      {
        matchId: matchToanThao._id,
        sender: studentThao._id,
        receiver: studentToan._id,
        text: 'Chào Toàn! Mình cũng đang tìm bạn học LeetCode! 😊',
        isRead: true,
        createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000 - 60 * 60 * 1000),
      },
      {
        matchId: matchToanThao._id,
        sender: studentToan._id,
        receiver: studentThao._id,
        text: 'Ồ hay quá Thảo! Bạn đang học tới đâu rồi? Mình đang ôn Dynamic Programming.',
        isRead: true,
        createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000 - 30 * 60 * 1000),
      },
      {
        matchId: matchToanThao._id,
        sender: studentThao._id,
        receiver: studentToan._id,
        text: 'Mình đang ôn Graph algorithms nè. Cuối tuần này mình hay ra The Coffee House Sư Vạn Hạnh học bạn có muốn cùng không?',
        isRead: true,
        createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
      },
      {
        matchId: matchToanThao._id,
        sender: studentToan._id,
        receiver: studentThao._id,
        text: 'Ok Thảo ơi! Thứ 7 này mình free từ 9h sáng. Mình có voucher giảm 20% The Coffee House luôn nè 🎉',
        isRead: true,
        createdAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
      },
      {
        matchId: matchToanThao._id,
        sender: studentThao._id,
        receiver: studentToan._id,
        text: 'Perfect! Hẹn Thứ 7 lúc 9h tại TCH Sư Vạn Hạnh nha! 📚',
        isRead: false,
        createdAt: new Date(now - 2 * 60 * 60 * 1000),
      },
    ]);

    // Toàn ↔ Linh (mới match, ít tin)
    await Message.create([
      {
        matchId: matchToanLinh._id,
        sender: studentLinh._id,
        receiver: studentToan._id,
        text: 'Hi Toàn! Mình thấy bạn cũng thích boardgame! Bạn hay chơi bộ gì vậy?',
        isRead: false,
        createdAt: new Date(now - 3 * 60 * 60 * 1000),
      },
    ]);

    // ─────────────────────────────────────────────────────────
    // 7. REPORTS
    // ─────────────────────────────────────────────────────────
    console.log('🛡️ Đang tạo Báo cáo mẫu cho Admin Queue...');
    await Report.create({
      reporter: studentToan._id,
      targetType: 'user',
      targetId: studentNam._id,
      reason: 'Spam tin nhắn quảng cáo khoá học',
      description: 'Tài khoản nhắn nhiều tin rác vào hộp thư làm phiền học tập.',
      status: 'pending',
    });

    // ─────────────────────────────────────────────────────────
    console.log('\n=============================================');
    console.log('🎉 SEED DỮ LIỆU UNI-MATE v1.1 THÀNH CÔNG!');
    console.log('=============================================');
    console.log('🔑 TÀI KHOẢN MẪU:');
    console.log('1. Admin:   admin@unimate.vn              / password123');
    console.log('2. Partner: partner@thecoffeehouse.vn     / password123');
    console.log('3. Student: toan.nguyen@fpt.edu.vn        / password123  (MSSV: SE181848)');
    console.log('4. Student: thao.le@hcmut.edu.vn          / password123  (MSSV: 2110482)');
    console.log('5. Student: nam.tran@ueh.edu.vn           / password123  (MSSV: 3120102)');
    console.log('6. Student: linh.pham@uit.edu.vn          / password123  (MSSV: 21521081)');
    console.log('=============================================');
    console.log('📦 DỮ LIỆU ĐÃ TẠO:');
    console.log('- 4 Venues (3 approved, 1 pending)');
    console.log('- 3 Vouchers (active)');
    console.log('- 3 UserVouchers trong ví sinh viên');
    console.log('- 4 Matches (2 matched, 1 pending, 1 passed)');
    console.log('- 6 Messages chat mẫu');
    console.log('- 1 Report pending');
    console.log('=============================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi seed dữ liệu:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedData();
