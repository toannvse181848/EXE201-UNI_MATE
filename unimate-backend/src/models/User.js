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
      enum: ["student", "partner", "admin"],
      required: true,
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
      university: String,
      major: String,
      year: Number,
      bio: String,
      interests: [String],
      objectives: [String], // study_buddy | project | networking | dating
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
  return {
    id: this._id,
    email: this.email,
    fullName: this.fullName,
    role: this.role,
    avatar: this.avatar,
    status: this.status,
    isProfileCompleted: this.isProfileCompleted,
    studentProfile: this.role === "student" ? this.studentProfile : undefined,
    partnerProfile: this.role === "partner" ? this.partnerProfile : undefined,
  };
};

module.exports = mongoose.model("User", userSchema);
