const mongoose = require("mongoose");
const { Delegation, PERMISSIONS, PERMISSION_PRESETS } = require("../models/Delegation");
const DelegationLog = require("../models/DelegationLog");
const User = require("../models/User"); // adjust path/name if different

const LIVE = ["pending", "active"];

// body: { preset?: "viewer"|"assistant"|"full", permissions?: string[] }
const resolvePermissions = ({ preset, permissions }) => {
  if (Array.isArray(permissions) && permissions.length) {
    const clean = [...new Set(permissions)];
    if (!clean.every((p) => PERMISSIONS.includes(p))) {
      return { error: "Invalid permission in list" };
    }
    if (!clean.includes("read")) clean.unshift("read"); // every delegate can read
    return { preset: "custom", permissions: clean };
  }
  const name = preset || "viewer";
  if (!PERMISSION_PRESETS[name]) return { error: "Invalid preset" };
  return { preset: name, permissions: PERMISSION_PRESETS[name] };
};

const parseExpiry = (value) => {
  if (!value) return { value: null };
  const d = new Date(value);
  if (isNaN(d) || d <= new Date()) return { error: "expiresAt must be a future date" };
  return { value: d };
};

const validId = (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ message: "Invalid id" });
    return false;
  }
  return true;
};

// POST /api/delegations
const invite = async (req, res) => {
  try {
    const email = String(req.body.email || "").toLowerCase().trim();
    if (!email) return res.status(400).json({ message: "Email is required" });
    if (email === String(req.user.email).toLowerCase()) {
      return res.status(400).json({ message: "You can't invite yourself" });
    }

    const perms = resolvePermissions(req.body);
    if (perms.error) return res.status(400).json({ message: perms.error });

    const expiry = parseExpiry(req.body.expiresAt);
    if (expiry.error) return res.status(400).json({ message: expiry.error });

    const existingUser = await User.findOne({ email }).select("_id");

    const delegation = await Delegation.create({
      owner: req.user._id,
      delegate: existingUser?._id,
      inviteEmail: email,
      preset: perms.preset,
      permissions: perms.permissions,
      expiresAt: expiry.value,
    });

    res.status(201).json(delegation);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "This person already has an invite or access" });
    }
    console.error(err);
    res.status(500).json({ message: "Could not create invite" });
  }
};

// GET /api/delegations/given
const listGiven = async (req, res) => {
  const items = await Delegation.find({ owner: req.user._id, status: { $in: LIVE } })
    .populate("delegate", "name email")
    .sort({ createdAt: -1 });
  res.json(items);
};

// GET /api/delegations/received
const listReceived = async (req, res) => {
  const items = await Delegation.find({
    status: { $in: LIVE },
    $or: [{ delegate: req.user._id }, { inviteEmail: String(req.user.email).toLowerCase() }],
  })
    .populate("owner", "name email")
    .sort({ createdAt: -1 });
  res.json(items);
};

const findInviteForMe = async (req) => {
  const d = await Delegation.findById(req.params.id);
  if (!d || d.status !== "pending") return null;
  const mine =
    String(d.delegate) === String(req.user._id) ||
    d.inviteEmail === String(req.user.email).toLowerCase();
  return mine ? d : null;
};

// PATCH /api/delegations/:id/accept
const accept = async (req, res) => {
  if (!validId(req, res)) return;
  const d = await findInviteForMe(req);
  if (!d) return res.status(404).json({ message: "Invite not found" });
  if (d.expiresAt && d.expiresAt < new Date()) {
    return res.status(410).json({ message: "Invite has expired" });
  }
  d.delegate = req.user._id;
  d.status = "active";
  d.acceptedAt = new Date();
  await d.save();
  res.json(d);
};

// PATCH /api/delegations/:id/decline
const decline = async (req, res) => {
  if (!validId(req, res)) return;
  const d = await findInviteForMe(req);
  if (!d) return res.status(404).json({ message: "Invite not found" });
  d.status = "declined";
  await d.save();
  res.json(d);
};

// PATCH /api/delegations/:id/permissions   (owner only)
const updatePermissions = async (req, res) => {
  if (!validId(req, res)) return;
  const d = await Delegation.findOne({
    _id: req.params.id,
    owner: req.user._id,
    status: { $in: LIVE },
  });
  if (!d) return res.status(404).json({ message: "Delegation not found" });

  const perms = resolvePermissions(req.body);
  if (perms.error) return res.status(400).json({ message: perms.error });

  if ("expiresAt" in req.body) {
    const expiry = parseExpiry(req.body.expiresAt);
    if (expiry.error) return res.status(400).json({ message: expiry.error });
    d.expiresAt = expiry.value;
  }

  d.preset = perms.preset;
  d.permissions = perms.permissions;
  await d.save();
  res.json(d);
};

// DELETE /api/delegations/:id   (owner revokes, or delegate leaves)
const revoke = async (req, res) => {
  if (!validId(req, res)) return;
  const d = await Delegation.findOne({
    _id: req.params.id,
    status: { $in: LIVE },
    $or: [{ owner: req.user._id }, { delegate: req.user._id }],
  });
  if (!d) return res.status(404).json({ message: "Delegation not found" });
  d.status = "revoked";
  d.revokedAt = new Date();
  await d.save();

  // Realtime: stop sending the owner's live events to the delegate's open
  // tabs, and tell those tabs to go back to their own mailbox.
  if (global.io && d.delegate) {
    const delegateRoom = `self:${d.delegate}`;

    global.io.in(delegateRoom).socketsLeave(`user:${d.owner}`);
    global.io
      .in(delegateRoom)
      .emit("mailbox:revoked", { ownerId: String(d.owner) });
  }

  res.json({ message: "Access revoked" });
};

// GET /api/delegations/:id/logs   (owner only)
const logs = async (req, res) => {
  if (!validId(req, res)) return;
  const d = await Delegation.findOne({ _id: req.params.id, owner: req.user._id });
  if (!d) return res.status(404).json({ message: "Delegation not found" });
  const items = await DelegationLog.find({ delegation: d._id })
    .sort({ createdAt: -1 })
    .limit(100);
  res.json(items);
};

module.exports = {
  invite,
  listGiven,
  listReceived,
  accept,
  decline,
  updatePermissions,
  revoke,
  logs,
};