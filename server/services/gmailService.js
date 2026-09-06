const { google } = require("googleapis");

const mongoose = require("mongoose");

const User = require("../models/User");

const GmailEmail = require("../models/GmailEmail");

const GmailSyncState = require("../models/GmailSyncState");

const ApiError = require("../utils/apiError");

/* =========================================================
   CONSTANTS
========================================================= */

const DEFAULT_MAX_RESULTS = 25;

const MAX_RESULTS_LIMIT = 50;

const REQUEST_CONCURRENCY = 3;

/* =========================================================
   VALIDATION
========================================================= */

const validateUserId = (userId) => {
  if (!userId) {
    throw new ApiError(401, "Authentication required");
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  return userId.toString();
};

const validateMessageId = (messageId) => {
  if (!messageId || typeof messageId !== "string") {
    throw new ApiError(400, "Valid Gmail message ID is required");
  }

  const cleanMessageId = messageId.trim();

  if (!cleanMessageId) {
    throw new ApiError(400, "Valid Gmail message ID is required");
  }

  if (/\s/.test(cleanMessageId)) {
    throw new ApiError(400, "Invalid Gmail message ID format");
  }

  return cleanMessageId;
};

/* =========================================================
   HEADER HELPERS
========================================================= */

const getHeader = (headers = [], name = "") => {
  if (!Array.isArray(headers)) {
    return "";
  }

  const targetName = name.toLowerCase();

  const header = headers.find(
    (item) => item?.name?.toLowerCase() === targetName,
  );

  return header?.value || "";
};

/* =========================================================
   EMAIL ADDRESS PARSING
========================================================= */

const parseEmailAddress = (value = "") => {
  if (!value || typeof value !== "string") {
    return {
      name: "",
      email: "",
    };
  }

  const trimmedValue = value.trim();

  const angleMatch = trimmedValue.match(/^(.*?)<([^<>\s]+@[^<>\s]+)>$/);

  if (angleMatch) {
    return {
      name: angleMatch[1].trim().replace(/^["']|["']$/g, ""),

      email: angleMatch[2].trim().toLowerCase(),
    };
  }

  const emailMatch = trimmedValue.match(/^[^<>\s]+@[^<>\s]+$/);

  if (emailMatch) {
    return {
      name: "",
      email: trimmedValue.toLowerCase(),
    };
  }

  return {
    name: trimmedValue,
    email: "",
  };
};

const splitEmailAddresses = (value = "") => {
  if (!value || typeof value !== "string") {
    return [];
  }

  const addresses = [];

  let current = "";

  let inQuotes = false;

  let angleDepth = 0;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];

    if (char === '"') {
      inQuotes = !inQuotes;
    }

    if (char === "<" && !inQuotes) {
      angleDepth += 1;
    }

    if (char === ">" && !inQuotes && angleDepth > 0) {
      angleDepth -= 1;
    }

    if (char === "," && !inQuotes && angleDepth === 0) {
      if (current.trim()) {
        addresses.push(current.trim());
      }

      current = "";

      continue;
    }

    current += char;
  }

  if (current.trim()) {
    addresses.push(current.trim());
  }

  return addresses;
};

const parseEmailAddresses = (value = "") => {
  return splitEmailAddresses(value)
    .map(parseEmailAddress)
    .filter((item) => item.email);
};

/* =========================================================
   LABEL HELPERS
========================================================= */

const normalizeLabelIds = (labelIds) => {
  if (!labelIds) {
    return undefined;
  }

  if (Array.isArray(labelIds)) {
    const cleaned = labelIds
      .map((label) => String(label).trim())
      .filter(Boolean);

    return cleaned.length ? cleaned : undefined;
  }

  if (typeof labelIds === "string") {
    const cleaned = labelIds
      .split(",")
      .map((label) => label.trim())
      .filter(Boolean);

    return cleaned.length ? cleaned : undefined;
  }

  return undefined;
};

/* =========================================================
   BASE64
========================================================= */

const decodeBase64Url = (data = "") => {
  if (!data || typeof data !== "string") {
    return "";
  }

  try {
    const base64 = data.replace(/-/g, "+").replace(/_/g, "/");

    return Buffer.from(base64, "base64").toString("utf-8");
  } catch {
    return "";
  }
};

const encodeBase64Url = (value = "") => {
  return Buffer.from(value, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

/* =========================================================
   DATE
========================================================= */

const formatEmailDate = (dateValue, internalDate) => {
  if (dateValue) {
    const parsedDate = new Date(dateValue);

    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString();
    }
  }

  if (internalDate) {
    const timestamp = Number(internalDate);

    if (!Number.isNaN(timestamp)) {
      return new Date(timestamp).toISOString();
    }
  }

  return null;
};

const getTimestamp = (internalDate) => {
  if (!internalDate) {
    return null;
  }

  const timestamp = Number(internalDate);

  return Number.isNaN(timestamp) ? null : timestamp;
};

const formatDisplayTime = (dateValue, internalDate) => {
  const date = formatEmailDate(dateValue, internalDate);

  if (!date) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(date));
  } catch {
    return date;
  }
};

/* =========================================================
   BODY
========================================================= */

const extractEmailBody = (
  payload,
  result = {
    text: "",
    html: "",
  },
) => {
  if (!payload) {
    return result;
  }

  const mimeType = payload.mimeType || "";

  if (mimeType === "text/plain" && payload.body?.data) {
    const decoded = decodeBase64Url(payload.body.data);

    if (decoded && !result.text) {
      result.text = decoded;
    }
  }

  if (mimeType === "text/html" && payload.body?.data) {
    const decoded = decodeBase64Url(payload.body.data);

    if (decoded && !result.html) {
      result.html = decoded;
    }
  }

  if (Array.isArray(payload.parts)) {
    payload.parts.forEach((part) => extractEmailBody(part, result));
  }

  return result;
};

/* =========================================================
   ATTACHMENTS
========================================================= */

const extractAttachments = (payload, attachments = []) => {
  if (!payload) {
    return attachments;
  }

  if (payload.filename && payload.body?.attachmentId) {
    attachments.push({
      filename: payload.filename,

      mimeType: payload.mimeType || "application/octet-stream",

      size: Number(payload.body.size) || 0,

      attachmentId: payload.body.attachmentId,
    });
  }

  if (Array.isArray(payload.parts)) {
    payload.parts.forEach((part) => extractAttachments(part, attachments));
  }

  return attachments;
};

const hasAttachments = (payload) => {
  if (!payload) {
    return false;
  }

  if (payload.filename && payload.body?.attachmentId) {
    return true;
  }

  if (Array.isArray(payload.parts)) {
    return payload.parts.some((part) => hasAttachments(part));
  }

  return false;
};

/* =========================================================
   FORMAT EMAIL
========================================================= */

const formatEmail = (message = {}) => {
  const payload = message.payload || {};

  const headers = payload.headers || [];

  const fromHeader = getHeader(headers, "From");

  const toHeader = getHeader(headers, "To");

  const ccHeader = getHeader(headers, "Cc");

  const bccHeader = getHeader(headers, "Bcc");

  const subject = getHeader(headers, "Subject");

  const dateHeader = getHeader(headers, "Date");

  const parsedFrom = parseEmailAddress(fromHeader);

  const to = parseEmailAddresses(toHeader);

  const cc = parseEmailAddresses(ccHeader);

  const bcc = parseEmailAddresses(bccHeader);

  const labels = Array.isArray(message.labelIds) ? message.labelIds : [];

  const body = extractEmailBody(payload);

  const attachmentList = extractAttachments(payload);

  const internalDate = message.internalDate || null;

  const date = formatEmailDate(dateHeader, internalDate);

  return {
    id: message.id || "",

    threadId: message.threadId || "",

    from: parsedFrom,

    sender: parsedFrom.name || parsedFrom.email || "Unknown Sender",

    senderEmail: parsedFrom.email || "",

    to,

    cc,

    bcc,

    subject: subject || "(No Subject)",

    snippet: message.snippet || "",

    date,

    timestamp: getTimestamp(internalDate),

    internalDate,

    labels,

    isRead: !labels.includes("UNREAD"),

    isStarred: labels.includes("STARRED"),

    isImportant: labels.includes("IMPORTANT"),

    isSent: labels.includes("SENT"),

    hasAttachments: attachmentList.length > 0,

    body,

    attachments: attachmentList,

    historyId: message.historyId || null,
  };
};

/* =========================================================
   FORMAT FULL EMAIL
========================================================= */

const formatFullEmail = (message = {}) => {
  const email = formatEmail(message);

  return {
    ...email,

    body: {
      text: email.body?.text || "",

      html: email.body?.html || "",
    },

    attachments: Array.isArray(email.attachments) ? email.attachments : [],
  };
};

/* =========================================================
   ERROR HANDLER
========================================================= */

const handleGmailError = (error) => {
  const status = error?.response?.status;

  const message =
    error?.response?.data?.error?.message ||
    error?.message ||
    "Gmail request failed";

  const lowerMessage = String(message).toLowerCase();

  if (
    status === 429 ||
    lowerMessage.includes("quota exceeded") ||
    lowerMessage.includes("rate limit") ||
    lowerMessage.includes("too many requests") ||
    lowerMessage.includes("resource exhausted")
  ) {
    throw new ApiError(
      429,
      "Gmail API quota exceeded. Please try again later.",
    );
  }

  if (
    status === 401 ||
    lowerMessage.includes("invalid credentials") ||
    lowerMessage.includes("unauthorized")
  ) {
    throw new ApiError(
      401,
      "Gmail authentication expired. Please reconnect Gmail.",
    );
  }

  if (status === 403) {
    throw new ApiError(403, message);
  }

  if (status === 404) {
    throw new ApiError(404, "Gmail resource not found");
  }

  throw error;
};

/* =========================================================
   OAUTH CLIENT
========================================================= */

const getOAuthClient = async (userId) => {
  validateUserId(userId);

  const user = await User.findById(userId).select(
    "+googleAccessToken +googleRefreshToken +googleTokenExpiry",
  );
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const refreshToken = user.googleRefreshToken || user.refreshToken;

  if (!refreshToken) {
    throw new ApiError(401, "Gmail is not connected");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALLBACK_URL,
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  return oauth2Client;
};

/* =========================================================
   GMAIL CLIENT
========================================================= */

const getGmailClient = async (userId) => {
  const auth = await getOAuthClient(userId);

  return google.gmail({
    version: "v1",
    auth,
  });
};

/* =========================================================
   MONGO PAGE TOKEN
========================================================= */

const encodeMongoPageToken = (offset) => {
  return Buffer.from(
    JSON.stringify({
      offset,
    }),
    "utf-8",
  )
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

const decodeMongoPageToken = (token) => {
  if (!token) {
    return 0;
  }

  try {
    const normalized = String(token).replace(/-/g, "+").replace(/_/g, "/");

    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);

    const decoded = JSON.parse(Buffer.from(padded, "base64").toString("utf-8"));

    const offset = Number(decoded?.offset);

    if (!Number.isInteger(offset) || offset < 0) {
      return 0;
    }

    return offset;
  } catch {
    return 0;
  }
};

/* =========================================================
   BUILD MONGO QUERY
========================================================= */

const buildMongoEmailQuery = (userId, labelIds, query) => {
  const mongoQuery = {
    user: userId,
  };

  const normalizedLabels = normalizeLabelIds(labelIds);

  if (normalizedLabels?.length) {
    mongoQuery.labels = {
      $all: normalizedLabels,
    };
  }

  if (!query || typeof query !== "string") {
    return mongoQuery;
  }

  const parts = query.trim().split(/\s+/).filter(Boolean);

  const textParts = [];

  for (const part of parts) {
    const lowerPart = part.toLowerCase();

    if (lowerPart === "is:unread") {
      mongoQuery.isRead = false;
      continue;
    }

    if (lowerPart === "is:read") {
      mongoQuery.isRead = true;
      continue;
    }

    if (lowerPart === "is:starred") {
      mongoQuery.isStarred = true;
      continue;
    }

    if (lowerPart === "is:important") {
      mongoQuery.isImportant = true;
      continue;
    }

    if (lowerPart === "is:sent" || lowerPart === "in:sent") {
      mongoQuery.labels = {
        ...(mongoQuery.labels || {}),
        $all: [...(mongoQuery.labels?.$all || []), "SENT"],
      };

      continue;
    }

    if (lowerPart === "in:trash") {
      mongoQuery.labels = {
        ...(mongoQuery.labels || {}),
        $all: [...(mongoQuery.labels?.$all || []), "TRASH"],
      };

      continue;
    }

    if (lowerPart === "in:drafts") {
      mongoQuery.labels = {
        ...(mongoQuery.labels || {}),
        $all: [...(mongoQuery.labels?.$all || []), "DRAFT"],
      };

      continue;
    }

    if (lowerPart.startsWith("from:")) {
      const value = part.slice(5).trim();

      if (value) {
        mongoQuery.$or = [
          ...(mongoQuery.$or || []),
          {
            senderEmail: {
              $regex: value,
              $options: "i",
            },
          },
          {
            sender: {
              $regex: value,
              $options: "i",
            },
          },
        ];
      }

      continue;
    }

    if (lowerPart.startsWith("to:")) {
      const value = part.slice(3).trim();

      if (value) {
        mongoQuery.$or = [
          ...(mongoQuery.$or || []),
          {
            "to.email": {
              $regex: value,
              $options: "i",
            },
          },
          {
            "to.name": {
              $regex: value,
              $options: "i",
            },
          },
        ];
      }

      continue;
    }

    if (lowerPart.startsWith("subject:")) {
      const value = part.slice(8).trim();

      if (value) {
        mongoQuery.subject = {
          $regex: value,
          $options: "i",
        };
      }

      continue;
    }

    if (lowerPart.startsWith("has:attachment")) {
      mongoQuery.hasAttachments = true;

      continue;
    }

    textParts.push(part);
  }

  if (textParts.length) {
    const textSearch = textParts.join(" ");

    const textRegex = {
      $regex: textSearch,
      $options: "i",
    };

    const textConditions = [
      {
        subject: textRegex,
      },
      {
        snippet: textRegex,
      },
      {
        sender: textRegex,
      },
      {
        senderEmail: textRegex,
      },
      {
        "body.text": textRegex,
      },
      {
        "body.html": textRegex,
      },
    ];

    mongoQuery.$and = [
      ...(mongoQuery.$and || []),
      {
        $or: textConditions,
      },
    ];
  }

  return mongoQuery;
};

const serializeCachedEmail = (email, full = false) => {
  if (!email) {
    return null;
  }

  const labels = Array.isArray(email.labels) ? email.labels : [];

  const formatted = {
    id: email.gmailMessageId,

    threadId: email.threadId,

    from: email.from || {
      name: email.sender || "",

      email: email.senderEmail || "",
    },

    sender:
      email.sender || email.from?.name || email.from?.email || "Unknown Sender",

    senderEmail: email.senderEmail || email.from?.email || "",

    to: Array.isArray(email.to) ? email.to : [],

    cc: Array.isArray(email.cc) ? email.cc : [],

    bcc: Array.isArray(email.bcc) ? email.bcc : [],

    subject: email.subject || "(No Subject)",

    snippet: email.snippet || "",

    date:
      email.date ||
      (email.internalDate
        ? new Date(Number(email.internalDate)).toISOString()
        : null),

    time: formatDisplayTime(email.date, email.internalDate),

    timestamp: email.timestamp || getTimestamp(email.internalDate),

    internalDate: email.internalDate || null,

    labels,

    isRead:
      typeof email.isRead === "boolean"
        ? email.isRead
        : !labels.includes("UNREAD"),

    isStarred:
      typeof email.isStarred === "boolean"
        ? email.isStarred
        : labels.includes("STARRED"),

    isImportant:
      typeof email.isImportant === "boolean"
        ? email.isImportant
        : labels.includes("IMPORTANT"),

    isSent:
      typeof email.isSent === "boolean"
        ? email.isSent
        : labels.includes("SENT"),

    hasAttachments: Boolean(email.hasAttachments || email.attachments?.length),
  };

  if (full) {
    formatted.body = {
      text: email.body?.text || "",

      html: email.body?.html || "",
    };

    formatted.attachments = Array.isArray(email.attachments)
      ? email.attachments
      : [];
  }

  return formatted;
};

/* =========================================================
   LIST EMAILS — MONGODB ONLY
========================================================= */

const listEmails = async (userId, options = {}) => {
  try {
    validateUserId(userId);

    const {
      maxResults = DEFAULT_MAX_RESULTS,

      pageToken,

      labelIds,

      query,
    } = options;

    const requestedLimit = Number(maxResults) || DEFAULT_MAX_RESULTS;

    const limit = Math.min(Math.max(requestedLimit, 1), MAX_RESULTS_LIMIT);

    const offset = decodeMongoPageToken(pageToken);

    const mongoQuery = buildMongoEmailQuery(userId, labelIds, query);

    const [emails, total] = await Promise.all([
      GmailEmail.find(mongoQuery)
        .sort({
          internalDate: -1,
          timestamp: -1,
          _id: -1,
        })
        .skip(offset)
        .limit(limit)
        .lean(),

      GmailEmail.countDocuments(mongoQuery),
    ]);

    const formattedEmails = emails.map((email) =>
      serializeCachedEmail(email, false),
    );

    const nextOffset = offset + formattedEmails.length;

    const nextPageToken =
      nextOffset < total ? encodeMongoPageToken(nextOffset) : null;

    return {
      messages: formattedEmails,

      nextPageToken,

      resultSizeEstimate: total,
    };
  } catch (error) {
    handleGmailError(error);
  }
};

/* =========================================================
   GET EMAIL BY ID — MONGODB ONLY
========================================================= */

const getEmailById = async (userId, messageId) => {
  try {
    validateUserId(userId);

    const cleanMessageId = validateMessageId(messageId);

    const email = await GmailEmail.findOne({
      user: userId,

      gmailMessageId: cleanMessageId,
    }).lean();

    if (!email) {
      throw new ApiError(404, "Email not found");
    }

    return serializeCachedEmail(email, true);
  } catch (error) {
    handleGmailError(error);
  }
};

/* =========================================================
   GET EMAIL THREAD — MONGODB ONLY
========================================================= */

const getEmailThread = async (userId, messageId) => {
  try {
    validateUserId(userId);

    const cleanMessageId = validateMessageId(messageId);

    const selectedEmail = await GmailEmail.findOne({
      user: userId,

      gmailMessageId: cleanMessageId,
    }).lean();

    if (!selectedEmail) {
      throw new ApiError(404, "Email not found");
    }

    const threadId = selectedEmail.threadId;

    if (!threadId) {
      return [serializeCachedEmail(selectedEmail, true)];
    }

    const threadEmails = await GmailEmail.find({
      user: userId,

      threadId,
    })
      .sort({
        internalDate: 1,
        timestamp: 1,
        _id: 1,
      })
      .lean();

    return threadEmails.map((email) => serializeCachedEmail(email, true));
  } catch (error) {
    handleGmailError(error);
  }
};

/* =========================================================
   UPDATE CACHED EMAIL
========================================================= */

const updateCachedEmail = async (userId, messageId, gmail) => {
  const cleanMessageId = validateMessageId(messageId);

  const response = await gmail.users.messages.get({
    userId: "me",

    id: cleanMessageId,

    format: "full",
  });

  const email = formatFullEmail(response.data);

  const updated = await GmailEmail.findOneAndUpdate(
    {
      user: userId,

      gmailMessageId: cleanMessageId,
    },

    {
      $set: {
        user: userId,

        gmailMessageId: email.id,

        threadId: email.threadId,

        from: email.from,

        sender: email.sender,

        senderEmail: email.senderEmail,

        to: email.to,

        cc: email.cc,

        bcc: email.bcc,

        subject: email.subject,

        snippet: email.snippet,

        date: email.date,

        timestamp: email.timestamp,

        internalDate: email.internalDate,

        labels: email.labels,

        isRead: email.isRead,

        isStarred: email.isStarred,

        isImportant: email.isImportant,

        isSent: email.isSent,

        hasAttachments: email.hasAttachments,

        body: email.body,

        attachments: email.attachments,

        historyId: response.data.historyId || null,
      },
    },

    {
      upsert: true,

      new: true,
    },
  ).lean();

  return serializeCachedEmail(updated, true);
};

/* =========================================================
   MARK AS READ
========================================================= */

const markEmailAsRead = async (userId, messageId) => {
  try {
    validateUserId(userId);

    const cleanMessageId = validateMessageId(messageId);

    const gmail = await getGmailClient(userId);

    await gmail.users.messages.modify({
      userId: "me",

      id: cleanMessageId,

      requestBody: {
        removeLabelIds: ["UNREAD"],
      },
    });

    return await updateCachedEmail(userId, cleanMessageId, gmail);
  } catch (error) {
    handleGmailError(error);
  }
};

/* =========================================================
   MARK AS UNREAD
========================================================= */

const markEmailAsUnread = async (userId, messageId) => {
  try {
    validateUserId(userId);

    const cleanMessageId = validateMessageId(messageId);

    const gmail = await getGmailClient(userId);

    await gmail.users.messages.modify({
      userId: "me",

      id: cleanMessageId,

      requestBody: {
        addLabelIds: ["UNREAD"],
      },
    });

    return await updateCachedEmail(userId, cleanMessageId, gmail);
  } catch (error) {
    handleGmailError(error);
  }
};

/* =========================================================
   STAR EMAIL
========================================================= */

const starEmail = async (userId, messageId) => {
  try {
    validateUserId(userId);

    const cleanMessageId = validateMessageId(messageId);

    const gmail = await getGmailClient(userId);

    await gmail.users.messages.modify({
      userId: "me",

      id: cleanMessageId,

      requestBody: {
        addLabelIds: ["STARRED"],
      },
    });

    return await updateCachedEmail(userId, cleanMessageId, gmail);
  } catch (error) {
    handleGmailError(error);
  }
};

/* =========================================================
   UNSTAR EMAIL
========================================================= */

const unstarEmail = async (userId, messageId) => {
  try {
    validateUserId(userId);

    const cleanMessageId = validateMessageId(messageId);

    const gmail = await getGmailClient(userId);

    await gmail.users.messages.modify({
      userId: "me",

      id: cleanMessageId,

      requestBody: {
        removeLabelIds: ["STARRED"],
      },
    });

    return await updateCachedEmail(userId, cleanMessageId, gmail);
  } catch (error) {
    handleGmailError(error);
  }
};

/* =========================================================
   ARCHIVE EMAIL
========================================================= */

const archiveEmail = async (userId, messageId) => {
  try {
    validateUserId(userId);

    const cleanMessageId = validateMessageId(messageId);

    const gmail = await getGmailClient(userId);

    await gmail.users.messages.modify({
      userId: "me",

      id: cleanMessageId,

      requestBody: {
        removeLabelIds: ["INBOX"],
      },
    });

    return await updateCachedEmail(userId, cleanMessageId, gmail);
  } catch (error) {
    handleGmailError(error);
  }
};

/* =========================================================
   MOVE TO INBOX
========================================================= */

const moveToInbox = async (userId, messageId) => {
  try {
    validateUserId(userId);

    const cleanMessageId = validateMessageId(messageId);

    const gmail = await getGmailClient(userId);

    await gmail.users.messages.modify({
      userId: "me",

      id: cleanMessageId,

      requestBody: {
        addLabelIds: ["INBOX"],

        removeLabelIds: ["TRASH"],
      },
    });

    return await updateCachedEmail(userId, cleanMessageId, gmail);
  } catch (error) {
    handleGmailError(error);
  }
};

/* =========================================================
   TRASH EMAIL
========================================================= */

const trashEmail = async (userId, messageId) => {
  try {
    validateUserId(userId);

    const cleanMessageId = validateMessageId(messageId);

    const gmail = await getGmailClient(userId);

    await gmail.users.messages.trash({
      userId: "me",

      id: cleanMessageId,
    });

    return await updateCachedEmail(userId, cleanMessageId, gmail);
  } catch (error) {
    handleGmailError(error);
  }
};

/* =========================================================
   PERMANENTLY DELETE EMAIL
========================================================= */

const permanentlyDeleteEmail = async (userId, messageId) => {
  try {
    validateUserId(userId);

    const cleanMessageId = validateMessageId(messageId);

    const gmail = await getGmailClient(userId);

    await gmail.users.messages.delete({
      userId: "me",

      id: cleanMessageId,
    });

    await GmailEmail.deleteOne({
      user: userId,

      gmailMessageId: cleanMessageId,
    });

    return {
      success: true,

      id: cleanMessageId,
    };
  } catch (error) {
    handleGmailError(error);
  }
};

/* =========================================================
   CREATE RAW EMAIL
========================================================= */

const createRawEmail = ({
  to,
  cc,
  bcc,
  subject,
  body,
  html,
  inReplyTo,
  references,
}) => {
  const headers = [];

  if (to) {
    headers.push(`To: ${to}`);
  }

  if (cc) {
    headers.push(`Cc: ${cc}`);
  }

  if (bcc) {
    headers.push(`Bcc: ${bcc}`);
  }

  headers.push(`Subject: ${subject || ""}`);

  headers.push("MIME-Version: 1.0");

  if (inReplyTo) {
    headers.push(`In-Reply-To: ${inReplyTo}`);
  }

  if (references) {
    headers.push(`References: ${references}`);
  }

  const textBody = body || "";

  const htmlBody = html || "";

  if (htmlBody) {
    const boundary = `boundary_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;

    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);

    const raw = [
      headers.join("\r\n"),
      "",
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      "",
      textBody,
      "",
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      "",
      htmlBody,
      "",
      `--${boundary}--`,
    ].join("\r\n");

    return encodeBase64Url(raw);
  }

  headers.push('Content-Type: text/plain; charset="UTF-8"');

  const raw = [headers.join("\r\n"), "", textBody].join("\r\n");

  return encodeBase64Url(raw);
};
/* =========================================================
   SEND NEW EMAIL
========================================================= */

const sendNewEmail = async (userId, options = {}) => {
  try {
    validateUserId(userId);

    const { to, cc, bcc, subject, body, html } = options;

    if (!to) {
      throw new ApiError(400, "Recipient email is required");
    }

    const gmail = await getGmailClient(userId);

    const raw = createRawEmail({
      to,
      cc,
      bcc,
      subject,
      body,
      html,
    });

    const response = await gmail.users.messages.send({
      userId: "me",

      requestBody: {
        raw,
      },
    });

    const messageId = response.data?.id;

    if (!messageId) {
      return response.data;
    }

    /*
     * Fetch the newly sent message and cache it.
     */
    try {
      await updateCachedEmail(userId, messageId, gmail);
    } catch (cacheError) {
      console.error("[GMAIL SEND] Failed to cache sent email:", cacheError);
    }

    return response.data;
  } catch (error) {
    handleGmailError(error);
  }
};

/* =========================================================
   REPLY EMAIL
========================================================= */

const replyEmail = async (userId, messageId, options = {}) => {
  try {
    validateUserId(userId);

    const cleanMessageId = validateMessageId(messageId);

    const { body, html } = options;

    const gmail = await getGmailClient(userId);

    /*
     * Fetch original message headers.
     */
    const original = await gmail.users.messages.get({
      userId: "me",

      id: cleanMessageId,

      format: "metadata",

      metadataHeaders: [
        "From",
        "To",
        "Cc",
        "Subject",
        "Message-ID",
        "References",
      ],
    });

    const originalPayload = original.data?.payload || {};

    const headers = originalPayload.headers || [];

    const fromHeader = getHeader(headers, "From");

    const subjectHeader = getHeader(headers, "Subject");

    const messageIdHeader = getHeader(headers, "Message-ID");

    const referencesHeader = getHeader(headers, "References");

    const parsedFrom = parseEmailAddress(fromHeader);

    if (!parsedFrom.email) {
      throw new ApiError(400, "Unable to determine reply recipient");
    }

    let replySubject = subjectHeader || "";

    if (!/^re:/i.test(replySubject.trim())) {
      replySubject = `Re: ${replySubject}`;
    }

    const references = [referencesHeader, messageIdHeader]
      .filter(Boolean)
      .join(" ");

    const raw = createRawEmail({
      to: parsedFrom.email,

      subject: replySubject,

      body: body || "",

      html: html || "",

      inReplyTo: messageIdHeader,

      references,
    });

    const response = await gmail.users.messages.send({
      userId: "me",

      requestBody: {
        raw,

        threadId: original.data?.threadId,
      },
    });

    const sentMessageId = response.data?.id;

    if (sentMessageId) {
      try {
        await updateCachedEmail(userId, sentMessageId, gmail);
      } catch (cacheError) {
        console.error("[GMAIL REPLY] Failed to cache sent email:", cacheError);
      }
    }

    return response.data;
  } catch (error) {
    handleGmailError(error);
  }
};

/* =========================================================
   GET ATTACHMENT
========================================================= */

const getAttachment = async (userId, messageId, attachmentId) => {
  try {
    validateUserId(userId);

    const cleanMessageId = validateMessageId(messageId);

    if (!attachmentId || typeof attachmentId !== "string") {
      throw new ApiError(400, "Attachment ID is required");
    }

    const gmail = await getGmailClient(userId);

    const response = await gmail.users.messages.attachments.get({
      userId: "me",

      messageId: cleanMessageId,

      id: attachmentId,
    });

    return {
      data: response.data?.data || "",

      size: response.data?.size || 0,
    };
  } catch (error) {
    handleGmailError(error);
  }
};

/* =========================================================
   START GMAIL WATCH
========================================================= */

const startGmailWatch = async (userId) => {
  validateUserId(userId);

  const topicName = process.env.GMAIL_PUBSUB_TOPIC;

  if (!topicName) {
    throw new ApiError(500, "GMAIL_PUBSUB_TOPIC is not configured");
  }

  console.log(`[GMAIL WATCH] Starting watch for user ${userId}`);

  console.log(`[GMAIL WATCH] Topic: ${topicName}`);

  const gmail = await getGmailClient(userId);

  /*
   * IMPORTANT:
   *
   * We keep the current incremental historyId.
   *
   * Gmail watch returns a new historyId.
   *
   * The new watch historyId is NOT automatically used
   * as our sync checkpoint because that could skip events
   * between the old checkpoint and the new watch.
   */
  const existingState = await GmailSyncState.findOne({
    user: userId,
  }).lean();

  const existingHistoryId = existingState?.historyId || null;

  const watchResponse = await gmail.users.watch({
    userId: "me",

    requestBody: {
      topicName,
    },
  });

  const {
    historyId: watchHistoryId,

    expiration,
  } = watchResponse.data || {};

  if (!watchHistoryId) {
    throw new ApiError(500, "Gmail watch did not return a historyId");
  }

  /*
   * Get the Gmail account address.
   */
  const profile = await gmail.users.getProfile({
    userId: "me",
  });

  const emailAddress =
    profile.data?.emailAddress || existingState?.emailAddress || "";

  if (!emailAddress) {
    throw new ApiError(500, "Unable to determine Gmail account email address");
  }

  /*
   * FIRST WATCH:
   *
   * There is no previous history checkpoint.
   *
   * We use the watch historyId as the initial checkpoint.
   *
   * EXISTING WATCH:
   *
   * Preserve existing historyId.
   */
  const syncHistoryId = existingHistoryId || watchHistoryId;

  const expirationDate = expiration ? new Date(Number(expiration)) : null;

  await GmailSyncState.findOneAndUpdate(
    {
      user: userId,
    },

    {
      $set: {
        emailAddress: emailAddress.toLowerCase(),

        historyId: syncHistoryId,

        watchHistoryId: watchHistoryId,

        watchExpiration: expirationDate,

        syncStatus: existingState?.syncStatus || "idle",

        lastError: "",
      },
    },

    {
      upsert: true,

      new: true,
    },
  );

  console.log(`[GMAIL WATCH] Watch started`, {
    userId,

    emailAddress,

    historyId: syncHistoryId,

    watchHistoryId,

    expiration: expirationDate ? expirationDate.toISOString() : null,
  });

  return {
    success: true,

    emailAddress,

    historyId: syncHistoryId,

    watchHistoryId,

    expiration: expirationDate,
  };
};

/* =========================================================
   GMAIL MESSAGE FETCH
========================================================= */

const getGmailMessage = async (userId, messageId, format = "full") => {
  validateUserId(userId);

  const cleanMessageId = validateMessageId(messageId);

  const gmail = await getGmailClient(userId);

  try {
    const response = await gmail.users.messages.get({
      userId: "me",

      id: cleanMessageId,

      format,
    });

    return response.data;
  } catch (error) {
    handleGmailError(error);
  }
};

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  getOAuthClient,

  getGmailClient,

  formatEmail,

  formatFullEmail,

  listEmails,

  getEmailById,

  getEmailThread,

  markEmailAsRead,

  markEmailAsUnread,

  starEmail,

  unstarEmail,

  archiveEmail,

  moveToInbox,

  trashEmail,

  permanentlyDeleteEmail,

  sendNewEmail,

  replyEmail,

  getAttachment,

  getGmailMessage,

  startGmailWatch,
};
