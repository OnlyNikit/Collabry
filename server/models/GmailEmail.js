const mongoose = require("mongoose");

const emailAddressSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      default: "",
    },
  },
  {
    _id: false,
  },
);

const gmailEmailSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    gmailMessageId: {
      type: String,
      required: true,
    },

    threadId: {
      type: String,
      required: true,
      index: true,
    },

    from: {
      type: emailAddressSchema,
      default: () => ({}),
    },

    sender: {
      type: String,
      default: "",
    },

    senderEmail: {
      type: String,
      default: "",
    },

    to: {
      type: [emailAddressSchema],
      default: [],
    },

    cc: {
      type: [emailAddressSchema],
      default: [],
    },

    bcc: {
      type: [emailAddressSchema],
      default: [],
    },

    subject: {
      type: String,
      default: "(No Subject)",
    },

    snippet: {
      type: String,
      default: "",
    },

    date: {
      type: Date,
      default: null,
    },

    timestamp: {
      type: Number,
      default: null,
    },

    internalDate: {
      type: String,
      default: null,
    },

    labels: {
      type: [String],
      default: [],
    },

    isRead: {
      type: Boolean,
      default: true,
    },

    isStarred: {
      type: Boolean,
      default: false,
    },

    isImportant: {
      type: Boolean,
      default: false,
    },

    isSent: {
      type: Boolean,
      default: false,
    },

    hasAttachments: {
      type: Boolean,
      default: false,
    },

    historyId: {
      type: String,
      default: null,
    },

    body: {
      text: {
        type: String,
        default: "",
      },

      html: {
        type: String,
        default: "",
      },
    },

    attachments: {
      type: [
        {
          filename: String,
          mimeType: String,
          size: Number,
          attachmentId: String,
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

gmailEmailSchema.index(
  {
    user: 1,
    gmailMessageId: 1,
  },
  {
    unique: true,
  },
);

gmailEmailSchema.index({
  user: 1,
  timestamp: -1,
});

gmailEmailSchema.index({
  user: 1,
  threadId: 1,
  timestamp: 1,
});

module.exports = mongoose.model(
  "GmailEmail",
  gmailEmailSchema,
);