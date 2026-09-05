const mongoose = require("mongoose");

const trackerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    brandName: {
      type: String,
      required: true,
      trim: true,
    },

    contactName: {
      type: String,
      trim: true,
      default: "",
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    collaborationTitle: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "new_inquiry",
        "interested",
        "negotiation",
        "proposal_sent",
        "awaiting_reply",
        "deal_confirmed",
        "content_in_progress",
        "content_submitted",
        "revision_required",
        "awaiting_approval",
        "campaign_live",
        "completed",
        "declined",
        
        "follow_up_due",
      ],
      default: "new_inquiry",
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    followUpDate: {
      type: Date,
      default: null,
    },

    deadline: {
      type: Date,
      default: null,
    },

    proposedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    currency: {
      type: String,
      enum: ["INR", "USD", "EUR"],
      default: "INR",
    },

    paymentStatus: {
      type: String,
      enum: [
        "not_discussed",
        "negotiating",
        "pending",
        "partially_paid",
        "paid",
      ],
      default: "not_discussed",
    },

    notes: {
      type: String,
      default: "",
    },

    label: {
      type: String,
      default: "",
    },

    threadId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Tracker", trackerSchema);
