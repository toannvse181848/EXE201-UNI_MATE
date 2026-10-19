const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const DEFAULT_STUDENT_AVATAR = 'https://res.cloudinary.com/xzjfoa0p/image/upload/v1791901630/unimate/defaults/default_avatar.png';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email là bắt buộc"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      minlength: 6,
      select: false, // không trả về password khi query
    },
    googleId: {
      type: String,
      default: null,
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    role: {
      type: String,
      enum: ["student", "user", "partner", "admin"],
      required: true,
      default: "user",
    },
    fullName: { type: String, required: true, trim: true },
    avatar: { type: String, default: DEFAULT_STUDENT_AVATAR },
    phone: { type: String, default: null },

    status: {
      type: String,
      enum: ["active", "pending", "suspended"],
      default: "active",
    },
    isProfileCompleted: { type: Boolean, default: false },

    studentProfile: {
      studentId: { type: String, trim: true }, // Mã số sinh viên (MSSV)
      university: { type: String, trim: true },
      major: { type: String, trim: true },
      year: { type: String, trim: true, default: "Sinh viên năm 3" }, // Ví dụ: "Sinh viên năm 1", "Sinh viên năm 2"
      gender: { type: String, enum: ["male", "female", "other"], default: "other" },
      bio: { type: String, trim: true, default: "Tìm bạn cùng học bài & khám phá quán cafe yên tĩnh 🚀" },
      interests: [{ type: String }],
      objectives: [{ type: String }], // study_buddy | project | certificate | activities | hangout
      // === Onboarding Matching Preferences ===
      studyHabits: {
        timeSlots: [{ type: String }], // morning | afternoon | evening | weekend
        spaceType: { type: String, enum: ["quiet", "social", "any"], default: "any" },
      },
      distancePreference: { type: Number, default: 5 }, // km radius
      onboardingCompleted: { type: Boolean, default: false },
      // =========================================
      uniCoin: { type: Number, default: 200 },
      trustScore: { type: Number, default: 95 },
      isVerifiedStudent: { type: Boolean, default: false },
      isPremium: { type: Boolean, default: false },
      premiumPlan: { type: String, enum: ["monthly", "yearly", "lifetime", null], default: null },
      premiumExpiresAt: { type: Date, default: null },
      // === UniCoin System ===
      lastDailyCheckin: { type: Date, default: null },
      checkinStreak: { type: Number, default: 0 },
      dailyEarned: { type: Number, default: 0 },
      lastEarnDate: { type: Date, default: null },
      venueCheckinsToday: [{
        venueId: { type: String },
        venueName: { type: String },
        date: { type: Date },
        coinEarned: { type: Number },
      }],
      coinLog: [{
        type: { type: String },
        amount: { type: Number },
        description: { type: String },
        createdAt: { type: Date, default: Date.now },
      }],
      location: {
        type: {
          type: String,
          enum: ["Point"],
        },
        coordinates: {
          type: [Number],
        },
      },
    },


    partnerProfile: {
      businessName: String,
      // Gói Đối tác trả phí (xem config/plans.js)
      plan: { type: String, default: null },
      planExpiresAt: { type: Date, default: null },
    },

    lastActiveAt: { type: Date, default: Date.now },

    // Nguồn biết đến UNI-MATE lúc đăng ký, để so sánh hiệu quả kênh (xem config/acquisition.js)
    acquisition: {
      heardFrom: { type: String, default: null }, // người dùng tự chọn
      utmSource: { type: String, default: null },
      utmMedium: { type: String, default: null },
      utmCampaign: { type: String, default: null },
      utmContent: { type: String, default: null },
      referrer: { type: String, default: null },
      landingPath: { type: String, default: null },
    },

    // Reset password
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.index({ "studentProfile.location": "2dsphere" }, { sparse: true });

// Tự hash password trước khi lưu
userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// So sánh password khi login
userSchema.methods.comparePassword = function (candidate) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

// Chuẩn hoá object trả về cho frontend
userSchema.methods.toPublicJSON = function () {
  const normalizedRole = (this.role === "student" || this.role === "user") ? "user" : this.role;
  // Premium chỉ còn hiệu lực khi chưa quá hạn
  const premiumExpiresAt = this.studentProfile?.premiumExpiresAt;
  const isPremium = Boolean(
    this.studentProfile?.isPremium &&
    (!premiumExpiresAt || new Date(premiumExpiresAt) > new Date())
  );
  return {
    id: this._id,
    email: this.email,
    fullName: this.fullName,
    name: this.fullName,
    role: normalizedRole,
    originalRole: this.role,
    avatar:
      (this.avatar && !this.avatar.includes('photo-1534528741775-53994a69daeb'))
        ? this.avatar
        : (normalizedRole === 'partner'
            ? 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=200'
            : DEFAULT_STUDENT_AVATAR),
    phone: this.phone,
    status: this.status,
    isProfileCompleted: this.isProfileCompleted,
    // Flattened profile fields
    studentId: this.studentProfile?.studentId || null,
    university: this.studentProfile?.university || null,
    major: this.studentProfile?.major || null,
    year: this.studentProfile?.year || null,
    gender: this.studentProfile?.gender || null,
    bio: this.studentProfile?.bio || null,
    interests: this.studentProfile?.interests || [],
    objectives: this.studentProfile?.objectives || [],
    studyHabits: this.studentProfile?.studyHabits || { timeSlots: [], spaceType: 'any' },
    distancePreference: this.studentProfile?.distancePreference ?? 5,
    onboardingCompleted: this.studentProfile?.onboardingCompleted ?? false,
    uniCoin: this.studentProfile?.uniCoin ?? 200,
    trustScore: this.studentProfile?.trustScore ?? 95,
    isPremium,
    premiumPlan: isPremium ? (this.studentProfile?.premiumPlan || null) : null,
    premiumExpiresAt: premiumExpiresAt || null,
    // Tài khoản được xác thực tích xanh khi và chỉ khi là Premium hoặc isVerifiedStudent là true
    isVerifiedStudent: Boolean(isPremium || this.studentProfile?.isVerifiedStudent),
    // Nested objects
    studentProfile: (this.role === "student" || this.role === "user") ? this.studentProfile : undefined,
    partnerProfile: this.role === "partner" ? this.partnerProfile : undefined,
  };
};

module.exports = mongoose.model("User", userSchema);


