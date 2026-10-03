const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const Label = require("../models/Label");
const EmailLabel = require("../models/EmailLabel");

/* =========================================================
   MAILBOX OWNER (delegation support)

   actingAs middleware req.mailboxOwnerId set karta hai:
   - normal mode    -> logged-in user
   - delegated mode -> owner jiski mailbox khuli hai

   Labels aur email-label mappings hamesha OWNER ke naam par hote hain.
========================================================= */

const ownerOf = (req) => req.mailboxOwnerId || req.user._id;

/* =========================================================
   ADD LABEL TO EMAIL
========================================================= */

const addLabelToEmail = asyncHandler(async (req, res) => {
  const owner = ownerOf(req);
  const { emailId, labelId } = req.params;

  if (!emailId?.trim()) {
    throw new ApiError(400, "Email ID is required.");
  }

  if (!labelId?.trim()) {
    throw new ApiError(400, "Label ID is required.");
  }

  /* CHECK LABEL OWNERSHIP (owner ka label) */
  const label = await Label.findOne({
    _id: labelId,
    user: owner,
  });

  if (!label) {
    throw new ApiError(404, "Label not found.");
  }

  /* CHECK DUPLICATE */
  const existingMapping = await EmailLabel.findOne({
    user: owner,
    emailId: emailId.trim(),
    label: label._id,
  });

  if (existingMapping) {
    return res.status(200).json({
      success: true,
      message: "Label is already applied to this email.",
      data: existingMapping,
    });
  }

  /* CREATE MAPPING */
  const emailLabel = await EmailLabel.create({
    user: owner,
    emailId: emailId.trim(),
    label: label._id,
  });

  res.status(201).json({
    success: true,
    message: "Label applied to email successfully.",
    data: emailLabel,
  });
});

/* =========================================================
   REMOVE LABEL FROM EMAIL
========================================================= */

const removeLabelFromEmail = asyncHandler(async (req, res) => {
  const owner = ownerOf(req);
  const { emailId, labelId } = req.params;

  if (!emailId?.trim()) {
    throw new ApiError(400, "Email ID is required.");
  }

  if (!labelId?.trim()) {
    throw new ApiError(400, "Label ID is required.");
  }

  const emailLabel = await EmailLabel.findOneAndDelete({
    user: owner,
    emailId: emailId.trim(),
    label: labelId,
  });

  if (!emailLabel) {
    throw new ApiError(404, "This label is not applied to the email.");
  }

  res.status(200).json({
    success: true,
    message: "Label removed from email successfully.",
  });
});

/* =========================================================
   GET ALL LABELS FOR ONE EMAIL
========================================================= */

const getEmailLabels = asyncHandler(async (req, res) => {
  const owner = ownerOf(req);
  const { emailId } = req.params;

  if (!emailId?.trim()) {
    throw new ApiError(400, "Email ID is required.");
  }

  const emailLabels = await EmailLabel.find({
    user: owner,
    emailId: emailId.trim(),
  })
    .populate({
      path: "label",
      select: "name description color icon createdAt updatedAt",
    })
    .sort({ createdAt: -1 });

  /* RETURN ONLY VALID LABELS */
  const labels = emailLabels
    .filter((mapping) => mapping.label)
    .map((mapping) => mapping.label);

  res.status(200).json({
    success: true,
    count: labels.length,
    data: labels,
  });
});

/* =========================================================
   GET ALL EMAIL IDS FOR ONE LABEL
========================================================= */

const getEmailsForLabel = asyncHandler(async (req, res) => {
  const owner = ownerOf(req);
  const { labelId } = req.params;

  if (!labelId?.trim()) {
    throw new ApiError(400, "Label ID is required.");
  }

  const label = await Label.findOne({
    _id: labelId,
    user: owner,
  });

  if (!label) {
    throw new ApiError(404, "Label not found.");
  }

  const mappings = await EmailLabel.find({
    user: owner,
    label: label._id,
  })
    .sort({ createdAt: -1 })
    .select("emailId");

  const emailIds = mappings.map((mapping) => mapping.emailId);

  res.status(200).json({
    success: true,
    count: emailIds.length,
    data: emailIds,
  });
});

module.exports = {
  addLabelToEmail,
  removeLabelFromEmail,
  getEmailLabels,
  getEmailsForLabel,
};