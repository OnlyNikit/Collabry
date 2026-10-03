const mongoose = require("mongoose");

const PERMISSIONS = [
  "read",
  "reply",
  "send",
  "label",
  "archive",
  "trash",
  "permanentDelete", // never part of any preset
];

const PERMISSION_PRESETS = {
  viewer: ["read"],
  assistant: ["read", "reply", "label"],
  full: ["read", "reply", "send", "label", "archive", "trash"],
};

const delegationSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Set when the invited person already has a Collabry account / after accept
    delegate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    // Set at invite time, matched on signup/login
    inviteEmail: {
      type: String,
      lowercase: true,
      trim: true,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "active", "declined", "revoked"],
      default: "pending",
      index: true,
    },
    preset: {
      type: String,
      enum: ["viewer", "assistant", "full", "custom"],
      default: "viewer",
    },
    permissions: {
      type: [{ type: String, enum: PERMISSIONS }],
      default: PERMISSION_PRESETS.viewer,
    },
    expiresAt: { type: Date, default: null },
    acceptedAt: { type: Date },
    revokedAt: { type: Date },
  },
  { timestamps: true }
);

// One live invite/delegation per owner + invited email
delegationSchema.index(
  { owner: 1, inviteEmail: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ["pending", "active"] } } }
);

// Used by the middleware on every delegated request
delegationSchema.index({ owner: 1, delegate: 1, status: 1 });

delegationSchema.methods.isUsable = function () {
  if (this.status !== "active") return false;
  if (this.expiresAt && this.expiresAt < new Date()) return false;
  return true;
};

delegationSchema.methods.can = function (permission) {
  return this.isUsable() && this.permissions.includes(permission);
};

const Delegation = mongoose.model("Delegation", delegationSchema);

module.exports = { Delegation, PERMISSIONS, PERMISSION_PRESETS };