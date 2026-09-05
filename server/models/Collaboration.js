const mongoose = require("mongoose");

const collaborationSchema =
  new mongoose.Schema(
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

      title: {
        type: String,
        required: true,
        trim: true,
      },

      status: {
        type: String,
        enum: [
          "script_pending",
          "script_ready",
          "editing",
          "review",
          "revision",
          "awaiting_approval",
          "approved",
          "live",
          "completed",
        ],
        default: "script_pending",
      },

      priority: {
        type: String,
        enum: [
          "low",
          "medium",
          "high",
        ],
        default: "medium",
      },

      editor: {
        type: String,
        trim: true,
        default: "",
      },

      platform: {
        type: String,
        trim: true,
        default: "YouTube",
      },

      amount: {
        type: Number,
        default: 0,
        min: 0,
      },

      currency: {
        type: String,
        enum: [
          "INR",
          "USD",
          "EUR",
        ],
        default: "INR",
      },

      paymentStatus: {
        type: String,
        enum: [
          "not_discussed",
          "pending",
          "partially_paid",
          "paid",
        ],
        default: "not_discussed",
      },

      deadline: {
        type: Date,
        default: null,
      },

      notes: {
        type: String,
        trim: true,
        default: "",
      },
    },
    {
      timestamps: true,
    }
  );


collaborationSchema.index({
  user: 1,
  status: 1,
});


collaborationSchema.index({
  user: 1,
  deadline: 1,
});


const Collaboration =
  mongoose.model(
    "Collaboration",
    collaborationSchema
  );


module.exports =
  Collaboration;