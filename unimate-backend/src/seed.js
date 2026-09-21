require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Venue = require('./models/Venue');
const Voucher = require('./models/Voucher');
const Report = require('./models/Report');

const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://localhost:27017/unimate';

async function seedData() {
  try {
    console.log('⏳ Đang kết nối tới MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Đã kết nối MongoDB thành công');

    // Xoá dữ liệu cũ
    console.log('🧹 Đang dọn dẹp dữ liệu cũ...');
    await User.deleteMany({});
    await Venue.deleteMany({});
    await Voucher.deleteMany({});
    await Report.deleteMany({});

    // 1. Tạo Users mẫu
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
      partnerProfile: {
        businessName: 'The Coffee House Việt Nam',
      },
      avatar: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=200',
    });

    const studentToan = await User.create({
      email: 'toan.nguyen@fpt.edu.vn',
      password: 'password123',
      fullName: 'Nguyễn Văn Toàn',
      role: 'student',
      status: 'active',
      isProfileCompleted: true,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      studentProfile: {
        university: 'Đại học FPT TP.HCM',
        major: 'Kỹ thuật Phần mềm',
        year: 3,
        bio: 'Tìm bạn cùng cày deadline & khám phá các quán cafe yên tĩnh khu Công nghệ cao 🚀',
        interests: ['Lập trình React', 'Cà phê học bài', 'Boardgame', 'Nhiếp ảnh'],
        objectives: ['study_buddy', 'project'],
      },
    });

    const studentThao = await User.create({
      email: 'thao.le@hcmut.edu.vn',
      password: 'password123',
      fullName: 'Lê Phương Thảo',
      role: 'student',
      status: 'active',
      isProfileCompleted: true,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
      studentProfile: {
        university: 'ĐH Bách Khoa TP.HCM',
        major: 'Khoa học Máy tính',
        year: 3,
        bio: 'Thích học cafe cuối tuần, đang cày LeetCode & ôn IELTS 7.5.',
        interests: ['Lập trình', 'IELTS 7.0', 'Cafe chill'],
        objectives: ['study_buddy'],
      },
    });

    const studentNam = await User.create({
      email: 'nam.tran@ueh.edu.vn',
      password: 'password123',
      fullName: 'Trần Hoàng Nam',
      role: 'student',
      status: 'active',
      isProfileCompleted: true,
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800',
      studentProfile: {
        university: 'ĐH Kinh Tế TP.HCM (UEH)',
        major: 'Tài chính - Fintech',
        year: 4,
        bio: 'Tìm bạn đi cafe The Coffee House thảo luận ý tưởng khởi nghiệp.',
        interests: ['Tài chính', 'Đọc sách', 'Chụp ảnh film'],
        objectives: ['networking', 'study_buddy'],
      },
    });

    // 2. Tạo Venues mẫu
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
      description:
        'Quán có không gian mở 3 tầng, tầng 2 và 3 yên tĩnh phù hợp cho học nhóm và làm bài.',
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

    // 1 Quán chờ duyệt cho Admin test
    const venuePending = await Venue.create({
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

    // 3. Tạo Vouchers mẫu
    console.log('🎟️ Đang tạo các Voucher khuyến mãi...');
    await Voucher.create([
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

    // 4. Tạo Báo cáo mẫu cho Admin Queue
    console.log('🛡️ Đang tạo Báo cáo mẫu cho Admin Queue...');
    await Report.create({
      reporter: studentToan._id,
      targetType: 'user',
      targetId: studentNam._id,
      reason: 'Spam tin nhắn quảng cáo khoá học',
      description: 'Tài khoản nhắn nhiều tin rác vào hộp thư làm phiền học tập.',
      status: 'pending',
    });

    console.log('\n=============================================');
    console.log('🎉 SEED DỮ LIỆU UNI-MATE THÀNH CÔNG!');
    console.log('=============================================');
    console.log('🔑 TÀI KHOẢN MẪU:');
    console.log('1. Admin:   admin@unimate.vn        / password123');
    console.log('2. Partner: partner@thecoffeehouse.vn / password123');
    console.log('3. Student: toan.nguyen@fpt.edu.vn  / password123');
    console.log('=============================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi seed dữ liệu:', error);
    process.exit(1);
  }
}

seedData();
