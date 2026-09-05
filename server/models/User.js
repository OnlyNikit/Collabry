const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    /* ========================================
       GOOGLE ACCOUNT
    ======================================== */

    googleId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    profilePicture: {
      type: String,
      default: null,
    },

    /* ========================================
       GMAIL OAUTH TOKENS

       Never expose these in normaal API queries.
    ======================================== */

    googleAccessToken: {
      type: String,
      default: null,
      select: false,
    },

    googleRefreshToken: {
      type: String,
      default: null,
      select: false,
    },

    googleTokenExpiry: {
      type: Date,
      default: null,
      select: false,
    },

    /* ========================================
       PROFILE
    ======================================== */

    username: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    bio: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    /* ========================================
       STATUS
    ======================================== */

    isActive: {
      type: Boolean,
      default: true,
    },

    lastLogin: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const User =
  mongoose.models.User ||
  mongoose.model("User", userSchema);

module.exports = User;