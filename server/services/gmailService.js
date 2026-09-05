const { google } = require("googleapis");
const mongoose = require("mongoose");

const User = require("../models/User");
const ApiError = require("../utils/apiError");

/* =========================================================
   CONSTANTS
========================================================= */

const DEFAULT_MAX_RESULTS = 100;
const MAX_RESULTS_LIMIT = 500;
const REQUEST_CONCURRENCY = 10;

/* =========================================================
   HELPERS
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

  const angleMatch = trimmedValue.match(
    /^(.*?)<([^<>\s]+@[^<>\s]+)>$/,
  );

  if (angleMatch) {
    return {
      name: angleMatch[1]
        .trim()
        .replace(/^["']|["']$/g, ""),

      email: angleMatch[2]
        .trim()
        .toLowerCase(),
    };
  }

  const emailMatch = trimmedValue.match(
    /^[^<>\s]+@[^<>\s]+$/,
  );

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

    if (
      char === ">" &&
      !inQuotes &&
      angleDepth > 0
    ) {
      angleDepth -= 1;
    }

    if (
      char === "," &&
      !inQuotes &&
      angleDepth === 0
    ) {
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

    return cleaned.length > 0
      ? cleaned
      : undefined;
  }

  if (typeof labelIds === "string") {
    const cleaned = labelIds
      .split(",")
      .map((label) => label.trim())
      .filter(Boolean);

    return cleaned.length > 0
      ? cleaned
      : undefined;
  }

  return undefined;
};

/* =========================================================
   BASE64 HELPERS
========================================================= */

const decodeBase64Url = (data = "") => {
  if (!data || typeof data !== "string") {
    return "";
  }

  try {
    const base64 = data
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    return Buffer.from(
      base64,
      "base64",
    ).toString("utf-8");
  } catch (error) {
    return "";
  }
};

const encodeBase64Url = (value = "") => {
  return Buffer.from(
    value,
    "utf-8",
  )
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

/* =========================================================
   DATE HELPERS
========================================================= */

const formatEmailDate = (
  dateValue,
  internalDate,
) => {
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

  if (Number.isNaN(timestamp)) {
    return null;
  }

  return timestamp;
};

const formatDisplayTime = (
  dateValue,
  internalDate,
) => {
  const date = formatEmailDate(
    dateValue,
    internalDate,
  );

  if (!date) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      },
    ).format(new Date(date));
  } catch (error) {
    return date;
  }
};

/* =========================================================
   EXTRACT EMAIL BODY
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

  if (
    mimeType === "text/plain" &&
    payload.body?.data
  ) {
    const decoded = decodeBase64Url(
      payload.body.data,
    );

    if (decoded && !result.text) {
      result.text = decoded;
    }
  }

  if (
    mimeType === "text/html" &&
    payload.body?.data
  ) {
    const decoded = decodeBase64Url(
      payload.body.data,
    );

    if (decoded && !result.html) {
      result.html = decoded;
    }
  }

  if (Array.isArray(payload.parts)) {
    payload.parts.forEach((part) => {
      extractEmailBody(
        part,
        result,
      );
    });
  }

  return result;
};

/* =========================================================
   EXTRACT ATTACHMENTS
========================================================= */

const extractAttachments = (
  payload,
  attachments = [],
) => {
  if (!payload) {
    return attachments;
  }

  if (
    payload.filename &&
    payload.body?.attachmentId
  ) {
    attachments.push({
      filename: payload.filename,

      mimeType:
        payload.mimeType ||
        "application/octet-stream",

      size:
        Number(payload.body.size) || 0,

      attachmentId:
        payload.body.attachmentId,
    });
  }

  if (Array.isArray(payload.parts)) {
    payload.parts.forEach((part) => {
      extractAttachments(
        part,
        attachments,
      );
    });
  }

  return attachments;
};

const hasAttachments = (payload) => {
  if (!payload) {
    return false;
  }

  if (
    payload.filename &&
    (
      payload.body?.attachmentId ||
      payload.body?.size > 0
    )
  ) {
    return true;
  }

  if (Array.isArray(payload.parts)) {
    return payload.parts.some(
      hasAttachments,
    );
  }

  return false;
};

/* =========================================================
   GMAIL ERROR HANDLER
========================================================= */

const handleGmailError = (error) => {
  if (error instanceof ApiError) {
    throw error;
  }

  const status =
    error?.code ||
    error?.response?.status ||
    error?.status;

  const message =
    error?.response?.data?.error?.message ||
    error?.message ||
    "Gmail request failed";

  if (status === 400) {
    throw new ApiError(
      400,
      message,
    );
  }

  if (status === 401) {
    throw new ApiError(
      401,
      "Gmail authentication expired. Please reconnect your Google account.",
    );
  }

  if (status === 403) {
    throw new ApiError(
      403,
      `Gmail permission denied: ${message}`,
    );
  }

  if (status === 404) {
    throw new ApiError(
      404,
      "Email not found",
    );
  }

  if (status === 429) {
    throw new ApiError(
      429,
      "Too many Gmail requests. Please try again shortly.",
    );
  }

  throw new ApiError(
    status || 500,
    message,
  );
};

/* =========================================================
   GOOGLE OAUTH
========================================================= */

const getOAuthClient = async (
  userId,
) => {
  validateUserId(userId);

  const user = await User.findById(
    userId,
  ).select(
    "+googleAccessToken " +
      "+googleRefreshToken " +
      "+googleTokenExpiry",
  );

  if (!user) {
    throw new ApiError(
      404,
      "User not found",
    );
  }

  if (!user.googleRefreshToken) {
    throw new ApiError(
      401,
      "Gmail is not connected. Please reconnect your Google account.",
    );
  }

  if (
    !process.env.GOOGLE_CLIENT_ID ||
    !process.env.GOOGLE_CLIENT_SECRET ||
    !process.env.GOOGLE_CALLBACK_URL
  ) {
    throw new ApiError(
      500,
      "Google OAuth configuration is incomplete",
    );
  }

  const oauth2Client =
    new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL,
    );

  oauth2Client.setCredentials({
    access_token:
      user.googleAccessToken ||
      undefined,

    refresh_token:
      user.googleRefreshToken,

    expiry_date:
      user.googleTokenExpiry
        ? new Date(
            user.googleTokenExpiry,
          ).getTime()
        : undefined,
  });

  oauth2Client.on(
    "tokens",
    async (tokens) => {
      try {
        const updates = {};

        if (tokens.access_token) {
          updates.googleAccessToken =
            tokens.access_token;
        }

        if (tokens.refresh_token) {
          updates.googleRefreshToken =
            tokens.refresh_token;
        }

        if (tokens.expiry_date) {
          updates.googleTokenExpiry =
            new Date(
              tokens.expiry_date,
            );
        }

        if (
          Object.keys(updates).length > 0
        ) {
          await User.findByIdAndUpdate(
            userId,
            {
              $set: updates,
            },
          );
        }
      } catch (error) {
        console.error(
          "Failed to save refreshed Google token:",
          error.message,
        );
      }
    },
  );

  return oauth2Client;
};

const getGmailClient = async (
  userId,
) => {
  try {
    const auth =
      await getOAuthClient(userId);

    return google.gmail({
      version: "v1",
      auth,
    });
  } catch (error) {
    handleGmailError(error);
  }
};

/* =========================================================
   FORMAT EMAIL FOR LIST
========================================================= */

const formatEmail = (message) => {
  const headers =
    message.payload?.headers || [];

  const fromValue =
    getHeader(headers, "From");

  const toValue =
    getHeader(headers, "To");

  const ccValue =
    getHeader(headers, "Cc");

  const bccValue =
    getHeader(headers, "Bcc");

  const subject =
    getHeader(headers, "Subject") ||
    "(No Subject)";

  const dateValue =
    getHeader(headers, "Date");

  const from =
    parseEmailAddress(fromValue);

  const labelIds =
    message.labelIds || [];

  const date =
    formatEmailDate(
      dateValue,
      message.internalDate,
    );

  return {
    id: message.id,

    threadId: message.threadId,

    from,

    sender:
      from.name ||
      from.email ||
      "Unknown Sender",

    senderEmail:
      from.email || "",

    to:
      parseEmailAddresses(toValue),

    cc:
      parseEmailAddresses(ccValue),

    bcc:
      parseEmailAddresses(bccValue),

    subject,

    snippet:
      message.snippet || "",

    date,

    time:
      formatDisplayTime(
        dateValue,
        message.internalDate,
      ),

    timestamp:
      getTimestamp(
        message.internalDate,
      ),

    internalDate:
      message.internalDate || null,

    labels: labelIds,

    isRead:
      !labelIds.includes("UNREAD"),

    isStarred:
      labelIds.includes("STARRED"),

    isImportant:
      labelIds.includes("IMPORTANT"),

    hasAttachments:
      hasAttachments(
        message.payload,
      ),
  };
};

/* =========================================================
   FORMAT FULL EMAIL
========================================================= */

const formatFullEmail = (message) => {
  const headers =
    message.payload?.headers || [];

  const fromValue =
    getHeader(headers, "From");

  const toValue =
    getHeader(headers, "To");

  const ccValue =
    getHeader(headers, "Cc");

  const bccValue =
    getHeader(headers, "Bcc");

  const subject =
    getHeader(headers, "Subject") ||
    "(No Subject)";

  const dateValue =
    getHeader(headers, "Date");

  const from =
    parseEmailAddress(fromValue);

  const body =
    extractEmailBody(
      message.payload,
    );

  const attachments =
    extractAttachments(
      message.payload,
    );

  const labelIds =
    message.labelIds || [];

  const date =
    formatEmailDate(
      dateValue,
      message.internalDate,
    );

  return {
    id: message.id,

    threadId: message.threadId,

    from,

    /* Frontend compatibility */

    sender:
      from.name ||
      from.email ||
      "Unknown Sender",

    senderEmail:
      from.email || "",

    to:
      parseEmailAddresses(toValue),

    cc:
      parseEmailAddresses(ccValue),

    bcc:
      parseEmailAddresses(bccValue),

    subject,

    snippet:
      message.snippet || "",

    body: {
      text:
        body.text || "",

      html:
        body.html || "",
    },

    date,

    time:
      formatDisplayTime(
        dateValue,
        message.internalDate,
      ),

    timestamp:
      getTimestamp(
        message.internalDate,
      ),

    internalDate:
      message.internalDate || null,

    labels: labelIds,

    isRead:
      !labelIds.includes("UNREAD"),

    isStarred:
      labelIds.includes("STARRED"),

    isImportant:
      labelIds.includes("IMPORTANT"),

    isSent:
      labelIds.includes("SENT"),

    attachments,

    hasAttachments:
      attachments.length > 0,
  };
};

/* =========================================================
   FETCH MESSAGE METADATA
========================================================= */

const getMessageMetadata = async (
  gmail,
  messageId,
) => {
  const cleanMessageId =
    validateMessageId(messageId);

  const response =
    await gmail.users.messages.get({
      userId: "me",

      id: cleanMessageId,

      format: "metadata",

      metadataHeaders: [
        "From",
        "To",
        "Cc",
        "Bcc",
        "Subject",
        "Date",
      ],
    });

  return response.data;
};

/* =========================================================
   PROCESS WITH CONCURRENCY LIMIT
========================================================= */

const processInBatches = async (
  items = [],
  limit = REQUEST_CONCURRENCY,
  processor,
) => {
  const results = [];

  for (
    let index = 0;
    index < items.length;
    index += limit
  ) {
    const batch =
      items.slice(
        index,
        index + limit,
      );

    const batchResults =
      await Promise.all(
        batch.map(processor),
      );

    results.push(
      ...batchResults,
    );
  }

  return results;
};

/* =========================================================
   LIST EMAILS
========================================================= */

const listEmails = async (
  userId,
  options = {},
) => {
  try {
    validateUserId(userId);

    const gmail =
      await getGmailClient(userId);

    const {
      maxResults =
        DEFAULT_MAX_RESULTS,
      pageToken,
      labelIds,
      query,
    } = options;

    const parsedMaxResults =
      Number(maxResults);

    const safeMaxResults =
      Math.min(
        Math.max(
          Number.isFinite(
            parsedMaxResults,
          )
            ? Math.floor(
                parsedMaxResults,
              )
            : DEFAULT_MAX_RESULTS,
          1,
        ),
        MAX_RESULTS_LIMIT,
      );

    const normalizedLabelIds =
      normalizeLabelIds(labelIds);

    const listResponse =
      await gmail.users.messages.list({
        userId: "me",

        maxResults:
          safeMaxResults,

        pageToken:
          pageToken || undefined,

        labelIds:
          normalizedLabelIds,

        q:
          typeof query ===
          "string"
            ? query.trim() ||
              undefined
            : undefined,
      });

    const messageRefs =
      listResponse.data.messages ||
      [];

    if (
      messageRefs.length === 0
    ) {
      return {
        emails: [],

        nextPageToken:
          null,

        resultSizeEstimate:
          listResponse.data
            .resultSizeEstimate || 0,
      };
    }

    const messages =
      await processInBatches(
        messageRefs,
        REQUEST_CONCURRENCY,
        async (message) =>
          getMessageMetadata(
            gmail,
            message.id,
          ),
      );

    const emails =
      messages
        .map(formatEmail)
        .sort(
          (a, b) =>
            (b.timestamp || 0) -
            (a.timestamp || 0),
        );

    return {
      emails,

      nextPageToken:
        listResponse.data
          .nextPageToken || null,

      resultSizeEstimate:
        listResponse.data
          .resultSizeEstimate || 0,
    };
  } catch (error) {
    handleGmailError(error);
  }
};

/* =========================================================
   GET EMAIL THREAD
========================================================= */

const getEmailThread = async (
  userId,
  messageId,
) => {
  try {
    validateUserId(userId);

    const cleanMessageId =
      validateMessageId(messageId);

    const gmail =
      await getGmailClient(userId);

    const messageResponse =
      await gmail.users.messages.get({
        userId: "me",

        id: cleanMessageId,

        format: "metadata",
      });

    const threadId =
      messageResponse.data.threadId;

    if (!threadId) {
      throw new ApiError(
        404,
        "Email thread not found",
      );
    }

    const threadResponse =
      await gmail.users.threads.get({
        userId: "me",

        id: threadId,

        format: "full",
      });

    const thread =
      threadResponse.data;

    const messages =
      (thread.messages || [])
        .map(formatFullEmail)
        .sort(
          (a, b) =>
            (a.timestamp || 0) -
            (b.timestamp || 0),
        );

    return {
      id: thread.id,

      threadId: thread.id,

      messages,
    };
  } catch (error) {
    handleGmailError(error);
  }
};

/* =========================================================
   GET SINGLE EMAIL
========================================================= */

const getEmailById = async (
  userId,
  messageId,
) => {
  try {
    validateUserId(userId);

    const cleanMessageId =
      validateMessageId(messageId);

    const gmail =
      await getGmailClient(userId);

    const response =
      await gmail.users.messages.get({
        userId: "me",

        id: cleanMessageId,

        format: "full",
      });

    return formatFullEmail(
      response.data,
    );
  } catch (error) {
    handleGmailError(error);
  }
};

/* =========================================================
   MODIFY EMAIL LABELS
========================================================= */

const modifyEmailLabels = async (
  userId,
  messageId,
  {
    addLabelIds = [],
    removeLabelIds = [],
  } = {},
) => {
  try {
    validateUserId(userId);

    const cleanMessageId =
      validateMessageId(messageId);

    const gmail =
      await getGmailClient(userId);

    const response =
      await gmail.users.messages.modify({
        userId: "me",

        id: cleanMessageId,

        requestBody: {
          addLabelIds,

          removeLabelIds,
        },
      });

    return {
      id:
        response.data.id,

      threadId:
        response.data.threadId,

      labels:
        response.data.labelIds ||
        [],
    };
  } catch (error) {
    handleGmailError(error);
  }
};

/* =========================================================
   EMAIL ACTIONS
========================================================= */

const markEmailAsRead = (
  userId,
  messageId,
) => {
  return modifyEmailLabels(
    userId,
    messageId,
    {
      removeLabelIds: [
        "UNREAD",
      ],
    },
  );
};

const markEmailAsUnread = (
  userId,
  messageId,
) => {
  return modifyEmailLabels(
    userId,
    messageId,
    {
      addLabelIds: [
        "UNREAD",
      ],
    },
  );
};

const starEmail = (
  userId,
  messageId,
) => {
  return modifyEmailLabels(
    userId,
    messageId,
    {
      addLabelIds: [
        "STARRED",
      ],
    },
  );
};

const unstarEmail = (
  userId,
  messageId,
) => {
  return modifyEmailLabels(
    userId,
    messageId,
    {
      removeLabelIds: [
        "STARRED",
      ],
    },
  );
};

const archiveEmail = (
  userId,
  messageId,
) => {
  return modifyEmailLabels(
    userId,
    messageId,
    {
      removeLabelIds: [
        "INBOX",
      ],
    },
  );
};

const moveEmailToInbox = (
  userId,
  messageId,
) => {
  return modifyEmailLabels(
    userId,
    messageId,
    {
      addLabelIds: [
        "INBOX",
      ],

      removeLabelIds: [
        "TRASH",
      ],
    },
  );
};

/* =========================================================
   TRASH EMAIL
========================================================= */

const trashEmail = async (
  userId,
  messageId,
) => {
  try {
    validateUserId(userId);

    const cleanMessageId =
      validateMessageId(messageId);

    const gmail =
      await getGmailClient(userId);

    const response =
      await gmail.users.messages.trash({
        userId: "me",

        id: cleanMessageId,
      });

    return {
      success: true,

      id:
        response.data?.id ||
        cleanMessageId,

      threadId:
        response.data?.threadId ||
        null,

      labels:
        response.data?.labelIds ||
        [],

      message:
        "Email moved to trash",
    };
  } catch (error) {
    handleGmailError(error);
  }
};

/* =========================================================
   PERMANENT DELETE
========================================================= */

const permanentlyDeleteEmail =
  async (
    userId,
    messageId,
  ) => {
    try {
      validateUserId(userId);

      const cleanMessageId =
        validateMessageId(
          messageId,
        );

      const gmail =
        await getGmailClient(
          userId,
        );

      const messageResponse =
        await gmail.users.messages.get({
          userId: "me",

          id: cleanMessageId,

          format: "metadata",
        });

      const labels =
        messageResponse.data
          .labelIds || [];

      if (
        !labels.includes(
          "TRASH",
        )
      ) {
        throw new ApiError(
          400,
          "Email must be in trash before permanent deletion",
        );
      }

      await gmail.users.messages.delete({
        userId: "me",

        id: cleanMessageId,
      });

      return {
        success: true,

        id: cleanMessageId,

        message:
          "Email permanently deleted",
      };
    } catch (error) {
      handleGmailError(error);
    }
  };

/* =========================================================
   BUILD MIME BODY
========================================================= */

const buildMimeBody = ({
  text,
  html,
}) => {
  const boundary =
    `boundary_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;

  let content = "";

  if (text && html) {
    content +=
      `Content-Type: multipart/alternative; ` +
      `boundary="${boundary}"\r\n\r\n`;

    content +=
      `--${boundary}\r\n`;

    content +=
      "Content-Type: text/plain; charset=UTF-8\r\n";

    content +=
      "Content-Transfer-Encoding: 8bit\r\n\r\n";

    content +=
      `${text}\r\n\r\n`;

    content +=
      `--${boundary}\r\n`;

    content +=
      "Content-Type: text/html; charset=UTF-8\r\n";

    content +=
      "Content-Transfer-Encoding: 8bit\r\n\r\n";

    content +=
      `${html}\r\n\r\n`;

    content +=
      `--${boundary}--`;

    return content;
  }

  if (html) {
    content +=
      "Content-Type: text/html; charset=UTF-8\r\n";

    content +=
      "Content-Transfer-Encoding: 8bit\r\n\r\n";

    content += html;

    return content;
  }

  content +=
    "Content-Type: text/plain; charset=UTF-8\r\n";

  content +=
    "Content-Transfer-Encoding: 8bit\r\n\r\n";

  content += text || "";

  return content;
};

/* =========================================================
   SEND EMAIL
========================================================= */

const sendEmail = async (
  userId,
  {
    to,
    cc = [],
    bcc = [],
    subject,
    text,
    html,
  } = {},
) => {
  try {
    validateUserId(userId);

    const normalizeRecipients =
      (value) => {
        if (!value) {
          return [];
        }

        const values =
          Array.isArray(value)
            ? value
            : [value];

        return values
          .flatMap((item) =>
            typeof item === "string"
              ? splitEmailAddresses(
                  item,
                )
              : [],
          )
          .map((item) =>
            item.trim(),
          )
          .filter(Boolean);
      };

    const toRecipients =
      normalizeRecipients(to);

    const ccRecipients =
      normalizeRecipients(cc);

    const bccRecipients =
      normalizeRecipients(bcc);

    if (
      toRecipients.length === 0
    ) {
      throw new ApiError(
        400,
        "At least one recipient is required",
      );
    }

    if (
      !subject ||
      typeof subject !== "string" ||
      !subject.trim()
    ) {
      throw new ApiError(
        400,
        "Email subject is required",
      );
    }

    if (!text && !html) {
      throw new ApiError(
        400,
        "Email content is required",
      );
    }

    const gmail =
      await getGmailClient(userId);

    let email = "";

    email +=
      `To: ${toRecipients.join(
        ", ",
      )}\r\n`;

    if (
      ccRecipients.length > 0
    ) {
      email +=
        `Cc: ${ccRecipients.join(
          ", ",
        )}\r\n`;
    }

    if (
      bccRecipients.length > 0
    ) {
      email +=
        `Bcc: ${bccRecipients.join(
          ", ",
        )}\r\n`;
    }

    email +=
      `Subject: ${subject.trim()}\r\n`;

    email +=
      "MIME-Version: 1.0\r\n";

    email += buildMimeBody({
      text,
      html,
    });

    const raw =
      encodeBase64Url(email);

    const response =
      await gmail.users.messages.send({
        userId: "me",

        requestBody: {
          raw,
        },
      });

    return {
      id:
        response.data.id,

      threadId:
        response.data.threadId,

      labelIds:
        response.data.labelIds ||
        [],
    };
  } catch (error) {
    handleGmailError(error);
  }
};

/* =========================================================
   REPLY TO EMAIL
========================================================= */

const replyToEmail = async (
  userId,
  messageId,
  {
    text,
    html,
    replyAll = false,
  } = {},
) => {
  try {
    validateUserId(userId);

    const cleanMessageId =
      validateMessageId(messageId);

    if (!text && !html) {
      throw new ApiError(
        400,
        "Reply content is required",
      );
    }

    const gmail =
      await getGmailClient(userId);

    const originalResponse =
      await gmail.users.messages.get({
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

    const original =
      originalResponse.data;

    const headers =
      original.payload?.headers ||
      [];

    const from =
      getHeader(
        headers,
        "From",
      );

    const to =
      getHeader(
        headers,
        "To",
      );

    const cc =
      getHeader(
        headers,
        "Cc",
      );

    const subject =
      getHeader(
        headers,
        "Subject",
      );

    const messageIdHeader =
      getHeader(
        headers,
        "Message-ID",
      );

    const references =
      getHeader(
        headers,
        "References",
      );

    const replyRecipients =
      parseEmailAddresses(
        from,
      ).map(
        (item) =>
          item.email,
      );

    if (
      replyRecipients.length === 0
    ) {
      throw new ApiError(
        400,
        "Could not determine reply recipient",
      );
    }

    let ccRecipients = [];

    if (replyAll) {
      const toRecipients =
        parseEmailAddresses(
          to,
        ).map(
          (item) =>
            item.email,
        );

      const originalCcRecipients =
        parseEmailAddresses(
          cc,
        ).map(
          (item) =>
            item.email,
        );

      const user =
        await User.findById(
          userId,
        ).select(
          "email",
        );

      const ownEmail =
        user?.email?.toLowerCase();

      const replyRecipientSet =
        new Set(
          replyRecipients.map(
            (email) =>
              email.toLowerCase(),
          ),
        );

      ccRecipients = [
        ...toRecipients,
        ...originalCcRecipients,
      ]
        .filter(Boolean)
        .filter(
          (email) =>
            email.toLowerCase() !==
            ownEmail,
        )
        .filter(
          (
            email,
            index,
            array,
          ) =>
            array.findIndex(
              (item) =>
                item.toLowerCase() ===
                email.toLowerCase(),
            ) === index,
        )
        .filter(
          (email) =>
            !replyRecipientSet.has(
              email.toLowerCase(),
            ),
        );
    }

    const cleanSubject =
      subject?.trim() ||
      "";

    const replySubject =
      cleanSubject
        .toLowerCase()
        .startsWith("re:")
        ? cleanSubject
        : `Re: ${cleanSubject}`;

    let email = "";

    email +=
      `To: ${replyRecipients.join(
        ", ",
      )}\r\n`;

    if (
      ccRecipients.length > 0
    ) {
      email +=
        `Cc: ${ccRecipients.join(
          ", ",
        )}\r\n`;
    }

    email +=
      `Subject: ${replySubject}\r\n`;

    if (messageIdHeader) {
      email +=
        `In-Reply-To: ${messageIdHeader}\r\n`;
    }

    const referenceValue = [
      references,
      messageIdHeader,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    if (referenceValue) {
      email +=
        `References: ${referenceValue}\r\n`;
    }

    email +=
      "MIME-Version: 1.0\r\n";

    email += buildMimeBody({
      text,
      html,
    });

    const raw =
      encodeBase64Url(email);

    const response =
      await gmail.users.messages.send({
        userId: "me",

        requestBody: {
          raw,

          threadId:
            original.threadId,
        },
      });

    return {
      id:
        response.data.id,

      threadId:
        response.data.threadId,

      labelIds:
        response.data.labelIds ||
        [],
    };
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

  listEmails,
  getEmailById,
  getEmailThread,

  modifyEmailLabels,

  markEmailAsRead,
  markEmailAsUnread,

  starEmail,
  unstarEmail,

  archiveEmail,
  moveEmailToInbox,

  trashEmail,
  permanentlyDeleteEmail,

  sendEmail,
  replyToEmail,
};