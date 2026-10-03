const mongoose = require("mongoose");

const shareLinkSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["tracker", "collaboration"],
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// one link per user per type
shareLinkSchema.index({ user: 1, type: 1 }, { unique: true });

module.exports = mongoose.model("ShareLink", shareLinkSchema);