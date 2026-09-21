const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

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
    avatar: { type: String, default: null },
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
      year: { type: String, trim: true, default: "Năm 3" }, // Ví dụ: "Năm 1", "Năm 2", "Năm 3", "K21"
      gender: { type: String, enum: ["male", "female", "other"], default: "other" },
      bio: { type: String, trim: true, default: "Tìm bạn cùng học bài & khám phá quán cafe yên tĩnh 🚀" },
      interests: [{ type: String }],
      objectives: [{ type: String }], // study_buddy | project | networking | dating
      uniCoin: { type: Number, default: 200 },
      trustScore: { type: Number, default: 95 },
      isVerifiedStudent: { type: Boolean, default: true },
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
    },

    lastActiveAt: { type: Date, default: Date.now },
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
  return {
    id: this._id,
    email: this.email,
    fullName: this.fullName,
    name: this.fullName,
    role: normalizedRole,
    originalRole: this.role,
    avatar:
      this.avatar ||
      (normalizedRole === 'partner'
        ? 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=200'
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'),
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
    uniCoin: this.studentProfile?.uniCoin ?? 200,
    trustScore: this.studentProfile?.trustScore ?? 95,
    isVerifiedStudent: this.studentProfile?.isVerifiedStudent ?? true,
    // Nested objects
    studentProfile: (this.role === "student" || this.role === "user") ? this.studentProfile : undefined,
    partnerProfile: this.role === "partner" ? this.partnerProfile : undefined,
  };
};

module.exports = mongoose.model("User", userSchema);


