const asyncHandler = require("../utils/asyncHandler");

const ApiError = require("../utils/apiError");

const {
  listEmails,
  getEmailById,
  getEmailThread,

  markEmailAsRead,
  markEmailAsUnread,

  starEmail,
  unstarEmail,

  archiveEmail,
  moveEmailToInbox,

  trashEmail,
  permanentlyDeleteEmail,

  sendNewEmail: sendGmailEmail,
  replyEmail: replyGmailEmail,
} = require("../services/gmailService");

/* =========================================================
  GET EMAIL LIST
========================================================= */

const getEmails = asyncHandler(async (req, res) => {
  const { maxResults, pageToken, labelIds, query } = req.query;

  const parsedLabelIds = labelIds
    ? Array.isArray(labelIds)
      ? labelIds
      : labelIds
          .split(",")
          .map((label) => label.trim())
          .filter(Boolean)
    : undefined;

  const result = await listEmails(req.user._id, {
    maxResults,
    pageToken,
    labelIds: parsedLabelIds,
    query,
  });

  return res.status(200).json({
    success: true,

    data: {
      emails: result.messages,

      nextPageToken: result.nextPageToken,

      resultSizeEstimate: result.resultSizeEstimate,
    },
  });
});

/* =========================================================
  GET SINGLE EMAIL
========================================================= */

const getEmail = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Email ID is required");
  }

  const email = await getEmailById(req.user._id, id);

  return res.status(200).json({
    success: true,

    data: {
      email,
    },
  });
});

/* =========================================================
  GET THREAD
========================================================= */

const getThread = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Email ID is required");
  }

  const thread = await getEmailThread(req.user._id, id);

  return res.status(200).json({
    success: true,

    data: {
      thread,
    },
  });
});

/* =========================================================
  MARK READ
========================================================= */

const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Email ID is required");
  }

  const result = await markEmailAsRead(req.user._id, id);

  return res.status(200).json({
    success: true,

    message: "Email marked as read",

    data: result,
  });
});

/* =========================================================
  MARK UNREAD
========================================================= */

const markAsUnread = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Email ID is required");
  }

  const result = await markEmailAsUnread(req.user._id, id);

  return res.status(200).json({
    success: true,

    message: "Email marked as unread",

    data: result,
  });
});

/* =========================================================
  STAR
========================================================= */

const starEmailController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Email ID is required");
  }

  const result = await starEmail(req.user._id, id);

  return res.status(200).json({
    success: true,

    message: "Email starred",

    data: result,
  });
});

/* =========================================================
  UNSTAR
========================================================= */

const unstarEmailController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Email ID is required");
  }

  const result = await unstarEmail(req.user._id, id);

  return res.status(200).json({
    success: true,

    message: "Email unstarred",

    data: result,
  });
});

/* =========================================================
  ARCHIVE
========================================================= */

const archiveEmailController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Email ID is required");
  }

  const result = await archiveEmail(req.user._id, id);

  return res.status(200).json({
    success: true,

    message: "Email archived",

    data: result,
  });
});

/* =========================================================
  MOVE TO INBOX
========================================================= */

const moveToInbox = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Email ID is required");
  }

  const result = await moveEmailToInbox(req.user._id, id);

  return res.status(200).json({
    success: true,

    message: "Email moved to inbox",

    data: result,
  });
});

/* =========================================================
  MOVE TO TRASH
========================================================= */

const trashEmailController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Email ID is required");
  }

  const result = await trashEmail(req.user._id, id);

  return res.status(200).json({
    success: true,

    message: "Email moved to trash",

    data: result,
  });
});

/* =========================================================
  PERMANENT DELETE
========================================================= */

const permanentlyDeleteEmailController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Email ID is required");
  }

  const result = await permanentlyDeleteEmail(req.user._id, id);

  return res.status(200).json({
    success: true,

    message: "Email permanently deleted",

    data: result,
  });
});

/* =========================================================
  SEND EMAIL
========================================================= */

const sendNewEmail = asyncHandler(async (req, res) => {
  const { to, cc, bcc, subject, text, html } = req.body || {};

  const result = await sendGmailEmail(req.user._id, {
    to,
    cc,
    bcc,
    subject,

    // gmailService expects "body"
    body: text,

    html,
  });

  return res.status(201).json({
    success: true,

    message: "Email sent successfully",

    data: {
      email: result,
    },
  });
});

/* =========================================================
  REPLY EMAIL
========================================================= */

const replyEmail = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { text, body, html, replyAll = false } = req.body || {};

  if (!id) {
    throw new ApiError(400, "Email ID is required");
  }

  const replyText =
    typeof text === "string"
      ? text.trim()
      : typeof body === "string"
        ? body.trim()
        : "";

  const replyHtml = typeof html === "string" ? html.trim() : "";

  if (!replyText && !replyHtml) {
    throw new ApiError(400, "Reply content is required");
  }

  const result = await replyGmailEmail(req.user._id, id, {
    // gmailService expects "body"
    body: replyText || undefined,

    html: replyHtml || undefined,
  });

  return res.status(201).json({
    success: true,

    message: "Reply sent successfully",

    data: {
      email: result,
    },
  });
});

/* =========================================================
  EXPORTS
========================================================= */

module.exports = {
  getEmails,
  getEmail,
  getThread,

  markAsRead,
  markAsUnread,

  starEmailController,
  unstarEmailController,

  archiveEmailController,
  moveToInbox,

  trashEmailController,
  permanentlyDeleteEmailController,

  sendNewEmail,
  replyEmail,
};
