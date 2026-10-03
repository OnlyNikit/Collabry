const mongoose = require("mongoose");

const actionItemSchema = new mongoose.Schema(
  {
    task: {
      type: String,
      default: "",
    },
    owner: {
      type: String,
      default: "",
    },
    deadline: {
      type: String,
      default: "",
    },
  },
  { _id: false },
);

const threadSummarySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    threadId: {
      type: String,
      required: true,
    },

    summary: {
      overview: {
        type: String,
        default: "",
      },

      keyPoints: {
        type: [String],
        default: [],
      },

      decisions: {
        type: [String],
        default: [],
      },

      actionItems: {
        type: [actionItemSchema],
        default: [],
      },

      deadlines: {
        type: [String],
        default: [],
      },

      participants: {
        type: [String],
        default: [],
      },
    },

    /*
      Jis latest message tak summary banayi gayi thi.
      Agar thread mein naya message aa gaya,
      ye value change hogi aur summary regenerate hogi.
    */
    sourceLatestMessageAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

threadSummarySchema.index(
  {
    user: 1,
    threadId: 1,
  },
  {
    unique: true,
  },
);

module.exports = mongoose.model("ThreadSummary", threadSummarySchema);