
    const mongoose = require("mongoose");

    /* ========================================
    EMAIL LABEL MAPPING SCHEMA
    ======================================== */

    const emailLabelSchema = new mongoose.Schema(
    {
        /* =====================================
        OWNER

        Logged-in user.
        ===================================== */

        user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
        },

        /* =====================================
        GMAIL EMAIL ID

        Gmail message ID from Google API.
        ===================================== */

        emailId: {
        type: String,
        required: true,
        trim: true,
        index: true,
        },

        /* =====================================
        CUSTOM LABEL
        ===================================== */

        label: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Label",
        required: true,
        index: true,
        },
    },
    {
        timestamps: true,
    }
    );

    /* ========================================
    PREVENT DUPLICATE LABEL ASSIGNMENT

    Same user cannot assign the same label
    to the same Gmail email more than once.
    ======================================== */

    emailLabelSchema.index(
    {
        user: 1,
        emailId: 1,
        label: 1,
    },
    {
        unique: true,
    }
    );

    /* ========================================
    USEFUL QUERY INDEX

    Find all emails inside one label.
    ======================================== */

    emailLabelSchema.index({
    user: 1,
    label: 1,
    });

    /* ========================================
    MODEL
    ======================================== */

    const EmailLabel =
    mongoose.models.EmailLabel ||
    mongoose.model(
        "EmailLabel",
        emailLabelSchema
    );

    module.exports = EmailLabel;

