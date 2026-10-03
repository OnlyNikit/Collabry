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

  /*
    gmailService "moveToInbox" naam se export karta hai.
    Alias se controller ka apna `moveToInbox` handler clash nahi karega.
  */
  moveToInbox: moveEmailToInbox,

  trashEmail,
  permanentlyDeleteEmail,

  sendNewEmail: sendGmailEmail,
  replyEmail: replyGmailEmail,

  getAttachmentFile,
} = require("../services/gmailService");

const {
  generateEmailBody,
  generateThreadSummary,
} = require("../services/aiService");

const ThreadSummary = require("../models/ThreadSummary");
const User = require("../models/User");

/* =========================================================
   MAILBOX OWNER (delegation support)

   actingAs middleware sets req.mailboxOwnerId:
   - normal mode    -> logged-in user
   - delegated mode -> owner whose inbox the delegate is working in

   Saare Gmail / DB / cache operations OWNER ke naam par hone chahiye,
   isliye req.user._id ki jagah hamesha ownerOf(req) use karo.
========================================================= */

const ownerOf = (req) => req.mailboxOwnerId || req.user._id;

const isDelegated = (req) =>
  String(ownerOf(req)) !== String(req.user._id);

/*
  AI drafts owner ke naam/phone se likhe jayein, kyunki mail owner ke
  Gmail address se hi jaati hai.
*/
const getMailboxOwner = async (req) => {
  if (!isDelegated(req)) {
    return req.user;
  }

  const owner = await User.findById(ownerOf(req))
    .select(
      "name fullName firstName lastName email googleEmail phone phoneNumber mobile",
    )
    .lean();

  if (!owner) {
    throw new ApiError(404, "Mailbox owner not found");
  }

  return owner;
};

/* =========================================================
   HELPERS
========================================================= */

/* FormData mein cc/bcc arrays JSON string ban kar aate hain */
const parseList = (value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      /* plain string maano */
    }
  }

  return value;
};

/* multer files -> gmail attachments */
const mapFiles = (files = []) =>
  files.map((file) => ({
    filename: file.originalname,
    content: file.buffer,
    contentType: file.mimetype,
  }));

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

  const result = await listEmails(ownerOf(req), {
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

  const email = await getEmailById(ownerOf(req), id);

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

  const thread = await getEmailThread(ownerOf(req), id);

  return res.status(200).json({
    success: true,
    data: {
      thread,
    },
  });
});

/* =========================================================
   SIMPLE ACTION HANDLER FACTORY
========================================================= */

const createActionController = (action, message) =>
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new ApiError(400, "Email ID is required");
    }

    const result = await action(ownerOf(req), id);

    return res.status(200).json({
      success: true,
      message,
      data: result,
    });
  });

const markAsRead = createActionController(
  markEmailAsRead,
  "Email marked as read",
);

const markAsUnread = createActionController(
  markEmailAsUnread,
  "Email marked as unread",
);

const starEmailController = createActionController(
  starEmail,
  "Email starred",
);

const unstarEmailController = createActionController(
  unstarEmail,
  "Email unstarred",
);

const archiveEmailController = createActionController(
  archiveEmail,
  "Email archived",
);

const moveToInbox = createActionController(
  moveEmailToInbox,
  "Email moved to inbox",
);

const trashEmailController = createActionController(
  trashEmail,
  "Email moved to trash",
);

const permanentlyDeleteEmailController = createActionController(
  permanentlyDeleteEmail,
  "Email permanently deleted",
);

/* =========================================================
   SEND EMAIL
========================================================= */

const sendNewEmail = asyncHandler(async (req, res) => {
  const { to, cc, bcc, subject, text, html } = req.body || {};

  const result = await sendGmailEmail(ownerOf(req), {
    to: parseList(to),
    cc: parseList(cc),
    bcc: parseList(bcc),
    subject,

    // gmailService expects "body"
    body: text,

    html,

    attachments: mapFiles(req.files),
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

  const { text, body, html, replyAll } = req.body || {};

  if (!id) {
    throw new ApiError(400, "Email ID is required");
  }

  // FormData mein boolean string "true" ban jata hai
  const shouldReplyAll = replyAll === true || replyAll === "true";

  const replyText =
    typeof text === "string"
      ? text.trim()
      : typeof body === "string"
        ? body.trim()
        : "";

  const replyHtml = typeof html === "string" ? html.trim() : "";

  const attachments = mapFiles(req.files);

  if (!replyText && !replyHtml && !attachments.length) {
    throw new ApiError(400, "Reply content is required");
  }

  const result = await replyGmailEmail(ownerOf(req), id, {
    body: replyText || undefined,
    html: replyHtml || undefined,
    replyAll: shouldReplyAll,
    attachments,
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
   DOWNLOAD / PREVIEW ATTACHMENT
========================================================= */

const downloadAttachment = asyncHandler(async (req, res) => {
  const { id, attachmentId } = req.params;

  if (!id || !attachmentId) {
    throw new ApiError(400, "Email ID and attachment ID are required");
  }

  const file = await getAttachmentFile(ownerOf(req), id, attachmentId);

  res.setHeader("Content-Type", file.mimeType);

  res.setHeader("Content-Length", file.buffer.length);

  res.setHeader(
    "Content-Disposition",
    `inline; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
  );

  res.setHeader("X-Content-Type-Options", "nosniff");

  res.setHeader("Cache-Control", "private, max-age=3600");

  return res.status(200).send(file.buffer);
});

/* =========================================================
   AI DRAFTS
========================================================= */

const MAX_INSTRUCTION_CHARS = 1000;

/*
  Sender ki info server user record se li jaati hai.
  Frontend se trust nahi karte.
*/
const getSenderProfile = (user = {}) => ({
  name:
    user.name ||
    user.fullName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    "",

  email: user.email || user.googleEmail || "",

  phone: user.phone || user.phoneNumber || user.mobile || "",
});

const cleanText = (value, maxChars) =>
  typeof value === "string" ? value.trim().slice(0, maxChars) : "";

/* =========================================================
   AI COMPOSE
   POST /api/emails/ai/compose
========================================================= */

const generateComposeDraft = asyncHandler(async (req, res) => {
  const { to, subject, instruction, tone } = req.body || {};

  const cleanInstruction = cleanText(instruction, MAX_INSTRUCTION_CHARS);

  if (!cleanInstruction) {
    throw new ApiError(400, "Please describe what the email should say");
  }

  const mailboxOwner = await getMailboxOwner(req);

  const body = await generateEmailBody({
    mode: "compose",

    sender: getSenderProfile(mailboxOwner),

    to: cleanText(to, 320),

    subject: cleanText(subject, 300),

    instruction: cleanInstruction,

    tone,
  });

  return res.status(200).json({
    success: true,

    data: {
      body,
    },
  });
});

/* =========================================================
   AI REPLY
   POST /api/emails/:id/ai-reply
========================================================= */

const generateReplyDraft = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { instruction, tone } = req.body || {};

  if (!id) {
    throw new ApiError(400, "Email ID is required");
  }

  /*
    Poora thread DB/cache se.
    gmailService zarurat par full body fetch karega.
  */
  const thread = await getEmailThread(ownerOf(req), id);

  const mailboxOwner = await getMailboxOwner(req);

  const body = await generateEmailBody({
    mode: "reply",

    sender: getSenderProfile(mailboxOwner),

    thread,

    targetId: id,

    instruction: cleanText(instruction, MAX_INSTRUCTION_CHARS),

    tone,
  });

  return res.status(200).json({
    success: true,

    data: {
      body,
    },
  });
});

/* =========================================================
   AI THREAD SUMMARY
   POST /api/emails/:id/ai-summary
========================================================= */

/*
  Latest message ka timestamp nikalne ke liye
  multiple possible field names support kar rahe hain.
*/
const getMessageTimestamp = (message) => {
  if (!message) return null;

  const value =
    message.date ||
    message.timestamp ||
    message.internalDate ||
    message.createdAt ||
    message.receivedAt;

  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

/*
  getEmailThread() ka result array ho ya object,
  dono shape se messages array nikaalo.
*/
const extractMessages = (thread) => {
  if (Array.isArray(thread)) {
    return thread;
  }

  if (thread && typeof thread === "object") {
    if (Array.isArray(thread.messages)) {
      return thread.messages;
    }

    if (Array.isArray(thread.emails)) {
      return thread.emails;
    }
  }

  return [];
};

const generateThreadSummaryController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Email ID is required");
  }

  const ownerId = ownerOf(req);

  /*
    IMPORTANT:
    Yahan sirf selected email/thread ko fetch kiya ja raha hai.
    Kisi doosre thread ka data AI ko nahi jayega.
  */
  const thread = await getEmailThread(ownerId, id);

  const messages = extractMessages(thread);

  let threadId = null;

  if (!Array.isArray(thread) && thread && typeof thread === "object") {
    threadId = thread.threadId || thread.id || null;
  }

  /*
    Agar threadId service response mein nahi mila,
    selected message se threadId nikaalo.
  */
  if (!threadId && messages.length) {
    threadId = messages[0]?.threadId || messages[0]?.thread?.id || null;
  }

  /*
    Last fallback:
    selected email ko fetch karke threadId nikaalo.
  */
  if (!threadId) {
    const selectedEmail = await getEmailById(ownerId, id);

    threadId = selectedEmail?.threadId || selectedEmail?.thread?.id || id;
  }

  /*
    Empty thread ko AI par bhejne ka koi reason nahi.
  */
  if (!messages.length) {
    throw new ApiError(404, "No messages found in this thread");
  }

  /*
    Thread ka latest message.
    Date na mile to last array element ko use karenge.
  */
  let latestMessage = messages[messages.length - 1];

  let latestMessageAt = getMessageTimestamp(latestMessage);

  /*
    Agar messages sorted nahi hain,
    actual latest message find karo.
  */
  for (const message of messages) {
    const messageDate = getMessageTimestamp(message);

    if (messageDate && (!latestMessageAt || messageDate > latestMessageAt)) {
      latestMessage = message;

      latestMessageAt = messageDate;
    }
  }

  /*
    Mongo cache check.

    Cache owner + thread dono se scoped hai. Delegate aur owner
    ek hi mailbox ka summary share karte hain (same thread, same data).
  */
  const cachedSummary = await ThreadSummary.findOne({
    user: ownerId,
    threadId: String(threadId),
  }).lean();

  /*
    Agar cached summary ke source ka latest message
    current thread ke latest message ke equal hai,
    to AI call ki zarurat nahi.
  */
  if (
    cachedSummary &&
    latestMessageAt &&
    cachedSummary.sourceLatestMessageAt
  ) {
    const cachedTime = new Date(cachedSummary.sourceLatestMessageAt);

    if (
      !Number.isNaN(cachedTime.getTime()) &&
      cachedTime.getTime() === latestMessageAt.getTime()
    ) {
      return res.status(200).json({
        success: true,

        cached: true,

        data: {
          threadId: String(threadId),

          summary: cachedSummary.summary,
        },
      });
    }
  }

  /*
    IMPORTANT:
    AI ko ONLY isi selected thread ke messages
    diye ja rahe hain.
  */
  const summary = await generateThreadSummary(messages);

  const sourceLatestMessageAt = latestMessageAt || new Date();

  /*
    Thread-wise upsert.
    Same owner + same thread = same Mongo document.
  */
  await ThreadSummary.findOneAndUpdate(
    {
      user: ownerId,
      threadId: String(threadId),
    },
    {
      $set: {
        summary,
        sourceLatestMessageAt,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );

  return res.status(200).json({
    success: true,

    cached: false,

    data: {
      threadId: String(threadId),

      summary,
    },
  });
});

/* =========================================================
   AI SINGLE MESSAGE SUMMARY
   POST /api/emails/:id/ai-message-summary
   (:id = us particular message ki id)
========================================================= */

const generateMessageSummaryController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Message ID is required");
  }

  const ownerId = ownerOf(req);

  /*
    Gmail message immutable hota hai, isliye cache
    kabhi stale nahi hoga. ThreadSummary collection hi
    use kar rahe hain, key "message:<id>" se, taaki
    thread summary se mix na ho.
  */
  const cacheKey = `message:${id}`;

  const cachedSummary = await ThreadSummary.findOne({
    user: ownerId,
    threadId: cacheKey,
  }).lean();

  if (cachedSummary?.summary?.overview) {
    return res.status(200).json({
      success: true,

      cached: true,

      data: {
        threadId: cacheKey,

        summary: cachedSummary.summary,
      },
    });
  }

  const thread = await getEmailThread(ownerId, id);

  const messages = extractMessages(thread);

  const message = messages.find(
    (item) => String(item?.id || item?._id) === String(id),
  );

  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  /*
    IMPORTANT:
    AI ko ONLY yehi ek message diya ja raha hai.
  */
  const summary = await generateThreadSummary([message]);

  await ThreadSummary.findOneAndUpdate(
    {
      user: ownerId,
      threadId: cacheKey,
    },
    {
      $set: {
        summary,
        sourceLatestMessageAt: getMessageTimestamp(message) || new Date(),
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );

  return res.status(200).json({
    success: true,

    cached: false,

    data: {
      threadId: cacheKey,

      summary,
    },
  });
});

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  /* AI */
  generateComposeDraft,
  generateReplyDraft,
  generateThreadSummaryController,
  generateMessageSummaryController,

  /* Attachments */
  downloadAttachment,

  /* Email reads */
  getEmails,
  getEmail,
  getThread,

  /* Email actions */
  markAsRead,
  markAsUnread,

  starEmailController,
  unstarEmailController,

  archiveEmailController,
  moveToInbox,

  trashEmailController,
  permanentlyDeleteEmailController,

  /* Send / Reply */
  sendNewEmail,
  replyEmail,
};