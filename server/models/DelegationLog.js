const mongoose = require("mongoose");

const delegationLogSchema = new mongoose.Schema(
  {
    delegation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Delegation",
      required: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    delegate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // e.g. "read", "reply", "send", "label", "archive", "trash"
    action: { type: String, required: true },
    method: { type: String },
    path: { type: String },
    // Optional: thread/message the action touched
    targetId: { type: String },
    statusCode: { type: Number },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Owner's audit view: latest first
delegationLogSchema.index({ owner: 1, createdAt: -1 });

module.exports = mongoose.model("DelegationLog", delegationLogSchema);