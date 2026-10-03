const crypto = require("crypto");

const ShareLink = require("../models/ShareLink");
const Tracker = require("../models/tracker");
const Collaboration = require("../models/Collaboration");

const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const { emitShareRevoked } = require("../utils/shareSocket");

const VALID_TYPES = ["tracker", "collaboration"];

const generateToken = () => crypto.randomBytes(24).toString("hex");

function validateType(type) {
  if (!VALID_TYPES.includes(type)) {
    throw new ApiError(400, "Invalid share type");
  }
}

/* =========================================================
   GET MY LINK STATUS
========================================================= */

const getShareLink = asyncHandler(async (req, res) => {
  const { type } = req.params;
  validateType(type);

  const link = await ShareLink.findOne({
    user: req.user._id,
    type,
    isActive: true,
  }).lean();

  res.status(200).json({
    success: true,
    data: { token: link ? link.token : null },
  });
});

/* =========================================================
   CREATE (OR RETURN EXISTING) LINK
========================================================= */

const getOrCreateShareLink = asyncHandler(async (req, res) => {
  const { type } = req.params;
  validateType(type);

  let link = await ShareLink.findOne({ user: req.user._id, type });

  if (!link) {
    link = await ShareLink.create({
      user: req.user._id,
      type,
      token: generateToken(),
    });
  } else if (!link.isActive) {
    link.isActive = true;
    await link.save();
  }

  res.status(200).json({
    success: true,
    data: { token: link.token },
  });
});

/* =========================================================
   REGENERATE (purana link kaam karna band)
========================================================= */

const regenerateShareLink = asyncHandler(async (req, res) => {
  const { type } = req.params;
  validateType(type);

  const existing = await ShareLink.findOne({ user: req.user._id, type });

  let link;

  if (existing) {
    emitShareRevoked(existing.token);
    existing.token = generateToken();
    existing.isActive = true;
    link = await existing.save();
  } else {
    link = await ShareLink.create({
      user: req.user._id,
      type,
      token: generateToken(),
    });
  }

  res.status(200).json({
    success: true,
    data: { token: link.token },
  });
});

/* =========================================================
   REVOKE (sharing band)
========================================================= */

const revokeShareLink = asyncHandler(async (req, res) => {
  const { type } = req.params;
  validateType(type);

  const link = await ShareLink.findOne({ user: req.user._id, type });

  if (link && link.isActive) {
    link.isActive = false;
    await link.save();
    emitShareRevoked(link.token);
  }

  res.status(200).json({
    success: true,
    message: "Sharing disabled",
  });
});

/* =========================================================
   PUBLIC: GET SHARED DATA BY TOKEN
========================================================= */

const getSharedData = asyncHandler(async (req, res) => {
  const link = await ShareLink.findOne({
    token: req.params.token,
    isActive: true,
  }).lean();

  if (!link) {
    throw new ApiError(404, "This link is invalid or has been disabled");
  }

  let items;

  if (link.type === "tracker") {
    items = await Tracker.find({ user: link.user })
      .select("-user -threadId -label -__v")
      .sort({ createdAt: -1 })
      .lean();
  } else {
    items = await Collaboration.find({ user: link.user })
      .select("-user -__v")
      .sort({ createdAt: -1 })
      .lean();
  }

  res.status(200).json({
    success: true,
    data: { type: link.type, items },
  });
});

module.exports = {
  getShareLink,
  getOrCreateShareLink,
  regenerateShareLink,
  revokeShareLink,
  getSharedData,
};