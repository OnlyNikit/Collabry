    const mongoose = require("mongoose");

    const gmailSyncStateSchema = new mongoose.Schema(
    {
        user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
        index: true,
        },

        emailAddress: {
        type: String,
        default: "",
        },

        historyId: {
        type: String,
        default: null,
        },

        watchExpiration: {
        type: Date,
        default: null,
        },

        watchHistoryId: {
        type: String,
        default: null,
        },

        syncStatus: {
        type: String,
        enum: [
            "idle",
            "syncing",
            "error",
        ],
        default: "idle",
        },

        lastSyncAt: {
        type: Date,
        default: null,
        },

        lastError: {
        type: String,
        default: "",
        },
    },
    {
        timestamps: true,
    },
    );

    module.exports = mongoose.model(
    "GmailSyncState",
    gmailSyncStateSchema,
    );