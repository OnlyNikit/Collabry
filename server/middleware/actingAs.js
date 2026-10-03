const mongoose = require("mongoose");
const { Delegation } = require("../models/Delegation");
const DelegationLog = require("../models/DelegationLog");

/*
  Route -> permission map, har mount ke liye alag.
  Paths router ke mount point ke relative hote hain
  (req.path), mount ka naam req.baseUrl se milta hai.

  ORDER MATTERS: specific rules pehle.
  Jo rule match nahi karega wo delegated mode me DENY hoga
  (default-deny), isliye naye routes tab tak safe hain jab tak map na karo.
*/

/* ---------- /api/emails ---------- */
const EMAIL_RULES = [
  /* SEND / REPLY */
  ["POST", /^\/send\/?$/, "send"],
  ["POST", /^\/[^/]+\/forward\/?$/, "send"],
  ["POST", /^\/[^/]+\/reply\/?$/, "reply"],

  /* AI */
  ["POST", /^\/ai\/.*$/, "reply"], // /ai/compose
  ["POST", /^\/[^/]+\/ai-reply\/?$/, "reply"],
  ["POST", /^\/[^/]+\/ai-(summary|message-summary)\/?$/, "read"],

  /* READ STATE / STAR
     Viewer (read only) ye nahi badal sakta. Agar viewers ko read/unread
     allow karna hai to "label" ki jagah "read" likho. */
  ["PATCH", /^\/[^/]+\/(read|unread|star|unstar)\/?$/, "label"],
  ["PATCH", /^\/[^/]+\/labels?\/?$/, "label"],

  /* ARCHIVE / INBOX / TRASH */
  ["PATCH", /^\/[^/]+\/(archive|inbox)\/?$/, "archive"],
  ["PATCH", /^\/[^/]+\/trash\/?$/, "trash"],

  /* DELETE /:id = PERMANENT delete */
  ["DELETE", /^\/[^/]+\/?$/, "permanentDelete"],

  /* READS (list, thread, single email, attachments) */
  ["GET", /^\/.*$/, "read"],
];

/* ---------- /api/email-labels (email pe label lagana/hatana) ---------- */
const EMAIL_LABEL_RULES = [
  ["POST", /^\/.*$/, "label"],
  ["PUT", /^\/.*$/, "label"],
  ["PATCH", /^\/.*$/, "label"],
  ["DELETE", /^\/.*$/, "label"],
  ["GET", /^\/.*$/, "read"],
];

/* ---------- /api/labels (labels banana/edit/delete) ----------
   "label" permission wale delegate (assistant / full) owner ke labels
   create/edit/delete kar sakte hain. Viewer sirf padh sakta hai. */
const LABEL_RULES = [
  ["POST", /^\/.*$/, "label"],
  ["PUT", /^\/.*$/, "label"],
  ["PATCH", /^\/.*$/, "label"],
  ["DELETE", /^\/.*$/, "label"],
  ["GET", /^\/.*$/, "read"],
];

const RULES_BY_MOUNT = {
  "/api/emails": EMAIL_RULES,
  "/api/email-labels": EMAIL_LABEL_RULES,
  "/api/labels": LABEL_RULES,
};

// Reads bahut noisy hote hain; full read trail chahiye to true karo.
const LOG_READS = false;

const requiredPermission = (method, path, baseUrl = "/api/emails") => {
  const rules = RULES_BY_MOUNT[baseUrl] || [];
  const rule = rules.find(([m, re]) => m === method && re.test(path));
  return rule ? rule[2] : null;
};

const actingAs = async (req, res, next) => {
  try {
    const header = req.header("X-Acting-As");

    // Normal mode: user apni hi mailbox pe kaam kar raha hai
    if (!header || String(header) === String(req.user._id)) {
      req.mailboxOwnerId = req.user._id;
      return next();
    }

    if (!mongoose.isValidObjectId(header)) {
      return res.status(400).json({ message: "Invalid X-Acting-As header" });
    }

    const permission = requiredPermission(req.method, req.path, req.baseUrl);

    if (!permission) {
      return res
        .status(403)
        .json({ message: "This action is not available in delegated mode" });
    }

    const delegation = await Delegation.findOne({
      owner: header,
      delegate: req.user._id,
      status: "active",
    });

    // can() andar isUsable() se status + expiresAt dono check karta hai
    if (!delegation || !delegation.can(permission)) {
      return res
        .status(403)
        .json({ message: "You don't have permission for this action" });
    }

    req.mailboxOwnerId = delegation.owner;
    req.delegation = delegation;

    // Abhi capture karo: routing ke baad req.path/params badal sakte hain
    const firstSegment = req.path.split("/")[1];
    const NON_ID_SEGMENTS = ["ai", "send"];

    const logInfo = {
      delegation: delegation._id,
      owner: delegation.owner,
      delegate: req.user._id,
      action: permission,
      method: req.method,
      path: `${req.baseUrl}${req.path}`,
      targetId:
        firstSegment && !NON_ID_SEGMENTS.includes(firstSegment)
          ? firstSegment
          : undefined,
    };

    res.on("finish", () => {
      if (res.statusCode >= 400) return;
      if (permission === "read" && !LOG_READS) return;

      DelegationLog.create({ ...logInfo, statusCode: res.statusCode }).catch(
        (err) => console.error("DelegationLog error:", err.message),
      );
    });

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { actingAs, requiredPermission };