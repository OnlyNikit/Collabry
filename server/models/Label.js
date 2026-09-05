const mongoose = require("mongoose");

/* ========================================
   LABEL SCHEMA
======================================== */

const labelSchema = new mongoose.Schema(
  {
    /* ========================================
       OWNER
    ======================================== */

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /* ========================================
       LABEL DETAILS
    ======================================== */

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    color: {
      type: String,
      trim: true,
      default: "pink",
    },

    icon: {
      type: String,
      trim: true,
      default: "🏷️",
    },
  },
  {
    timestamps: true,
  }
);

/* ========================================
   UNIQUE LABEL NAME PER USER

   Same user cannot create:

   Follow Up
   Follow Up

   But different users can have
   their own "Follow Up" label.
======================================== */

labelSchema.index(
  {
    user: 1,
    name: 1,
  },
  {
    unique: true,
  }
);

/* ========================================
   MODEL
======================================== */

const Label =
  mongoose.models.Label ||
  mongoose.model(
    "Label",
    labelSchema
  );

module.exports = Label;