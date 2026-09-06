const mongoose = require("mongoose");
const GmailEmail = require("../models/GmailEmail");
const GmailSyncState = require("../models/GmailSyncState");
const {
  getGmailClient,
  formatEmail,
} = require("./gmailService");
const {
  createNotification,
} = require("./notificationService");
const ApiError = require("../utils/apiError");

/* =========================================================
   SOCKET BROADCAST
========================================================= */

const broadcastToUser = (
  userId,
  event,
  payload,
) => {
  try {
    const io = global.io;

    if (!io) {
      return;
    }

    io.to(`user:${userId}`).emit(
      event,
      payload,
    );
  } catch (error) {
    console.error(
      "WebSocket broadcast error:",
      error.message,
    );
  }
};

/* =========================================================
   VALIDATE USER ID
========================================================= */

const validateUserId = (userId) => {
  if (
    !userId ||
    !mongoose.Types.ObjectId.isValid(userId)
  ) {
    throw new ApiError(
      400,
      "Invalid user ID",
    );
  }

  return userId.toString();
};

/* =========================================================
   UPSERT EMAIL
========================================================= */

const upsertEmail = async (
  userId,
  message,
) => {
  const formatted = formatEmail(message);

  const existingEmail =
    await GmailEmail.findOne({
      user: userId,
      gmailMessageId: formatted.id,
    }).lean();

  await GmailEmail.findOneAndUpdate(
    {
      user: userId,
      gmailMessageId: formatted.id,
    },
    {
      $set: {
        user: userId,
        gmailMessageId: formatted.id,
        threadId: formatted.threadId,
        from: formatted.from,
        sender: formatted.sender,
        senderEmail: formatted.senderEmail,
        to: formatted.to,
        cc: formatted.cc,
        bcc: formatted.bcc,
        subject: formatted.subject,
        snippet: formatted.snippet,
        date: formatted.date,
        timestamp: formatted.timestamp,
        internalDate: formatted.internalDate,
        labels: formatted.labels,
        isRead: formatted.isRead,
        isStarred: formatted.isStarred,
        isImportant: formatted.isImportant,
        isSent: formatted.isSent,
        hasAttachments: formatted.hasAttachments,
        historyId: message.historyId || null,
      },
    },
    {
      upsert: true,
      new: true,
    },
  );

  return {
    email: formatted,
    isNew: !existingEmail,
  };
};

/* =========================================================
   CREATE NEW EMAIL NOTIFICATION
========================================================= */

const createNewEmailNotification = async (
  userId,
  email,
  isNew,
) => {
  try {
    if (!isNew) {
      return;
    }

    /* Sent emails ko notification nahi deni. */
    if (email.isSent) {
      return;
    }

    const senderName =
      email.sender ||
      email.senderEmail ||
      email.from ||
      "Someone";

    const subject =
      email.subject || "(No Subject)";

    await createNotification({
      userId,
      type: "new_email",
      title: "New email received",
      message: `${senderName} sent you an email: ${subject}`,
      emailId: email.id || null,
    });

    console.log(
      `[NOTIFICATION] New email notification created | user=${userId} | email=${email.id}`,
    );
  } catch (error) {
    /* Notification failure should NOT break Gmail synchronization. */
    console.error(
      `[NOTIFICATION] Failed to create new email notification | user=${userId}:`,
      error.message,
    );
  }
};

/* =========================================================
   DELETE EMAIL FROM CACHE
========================================================= */

const deleteEmailFromCache = async (
  userId,
  messageId,
) => {
  await GmailEmail.deleteOne({
    user: userId,
    gmailMessageId: messageId,
  });
};

/* =========================================================
   FETCH MESSAGE METADATA
========================================================= */

const fetchMessageMetadata = async (
  gmail,
  messageId,
) => {
  const response =
    await gmail.users.messages.get({
      userId: "me",
      id: messageId,
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
   PROCESS CHANGED MESSAGE
========================================================= */

const processChangedMessage = async (
  userId,
  gmail,
  messageId,
) => {
  try {
    const message =
      await fetchMessageMetadata(
        gmail,
        messageId,
      );

    const result =
      await upsertEmail(
        userId,
        message,
      );

    const email = result.email;

    /* Gmail realtime update */
    broadcastToUser(
      userId,
      "gmail:email-updated",
      email,
    );

    /* Notification only when this message is genuinely new. */
    await createNewEmailNotification(
      userId,
      email,
      result.isNew,
    );

    return {
      type: "updated",
      email,
      isNew: result.isNew,
    };
  } catch (error) {
    const status =
      error?.code ||
      error?.response?.status;

    /* Message may have been deleted before we fetched it. */
    if (status === 404) {
      await deleteEmailFromCache(
        userId,
        messageId,
      );

      broadcastToUser(
        userId,
        "gmail:email-deleted",
        {
          id: messageId,
        },
      );

      return {
        type: "deleted",
        id: messageId,
      };
    }

    throw error;
  }
};

/* =========================================================
   GET HISTORY CHANGES
========================================================= */

const getHistoryChanges = async (
  userId,
  startHistoryId,
) => {
  const gmail =
    await getGmailClient(userId);

  let pageToken;
  let latestHistoryId =
    startHistoryId;

  const changedMessageIds =
    new Set();

  const deletedMessageIds =
    new Set();

  do {
    const response =
      await gmail.users.history.list({
        userId: "me",
        startHistoryId,
        pageToken,
        maxResults: 100,
        historyTypes: [
          "messageAdded",
          "messageDeleted",
          "labelAdded",
          "labelRemoved",
        ],
      });

    const histories =
      response.data.history || [];

    if (response.data.historyId) {
      latestHistoryId =
        response.data.historyId;
    }

    for (const history of histories) {
      /* New messages */
      for (
        const item of
        history.messagesAdded || []
      ) {
        const id =
          item.message?.id;

        if (id) {
          changedMessageIds.add(id);
        }
      }

      /* Label added */
      for (
        const item of
        history.labelsAdded || []
      ) {
        const id =
          item.message?.id;

        if (id) {
          changedMessageIds.add(id);
        }
      }

      /* Label removed */
      for (
        const item of
        history.labelsRemoved || []
      ) {
        const id =
          item.message?.id;

        if (id) {
          changedMessageIds.add(id);
        }
      }

      /* Deleted messages */
      for (
        const item of
        history.messagesDeleted || []
      ) {
        const id =
          item.message?.id;

        if (id) {
          deletedMessageIds.add(id);
        }
      }
    }

    pageToken =
      response.data.nextPageToken ||
      undefined;
  } while (pageToken);

  return {
    latestHistoryId,
    changedMessageIds: [
      ...changedMessageIds,
    ],
    deletedMessageIds: [
      ...deletedMessageIds,
    ],
  };
};

/* =========================================================
   INCREMENTAL SYNC
========================================================= */

const syncFromHistory = async (
  userId,
  notificationHistoryId = null,
) => {
  validateUserId(userId);

  const state =
    await GmailSyncState.findOne({
      user: userId,
    });

  if (!state) {
    throw new ApiError(
      404,
      "Gmail sync state not found",
    );
  }

  /*
    historyId = actual incremental sync checkpoint
    watchHistoryId = history ID returned when Gmail
    watch was created/renewed.
  */

  const startHistoryId =
    state.historyId ||
    state.watchHistoryId;

  /* No history ID means full sync. */
  if (!startHistoryId) {
    console.log(
      `[GMAIL SYNC] No historyId for user ${userId}. Starting full sync.`,
    );

    return fullSync(userId);
  }

  console.log(
    `[GMAIL SYNC] Starting incremental sync`,
    {
      userId,
      startHistoryId,
      notificationHistoryId,
    },
  );

  await GmailSyncState.findOneAndUpdate(
    {
      user: userId,
    },
    {
      $set: {
        syncStatus: "syncing",
      },
    },
  );

  try {
    const {
      latestHistoryId,
      changedMessageIds,
      deletedMessageIds,
    } =
      await getHistoryChanges(
        userId,
        startHistoryId,
      );

    console.log(
      `[GMAIL SYNC] History changes`,
      {
        userId,
        startHistoryId,
        latestHistoryId,
        changed:
          changedMessageIds.length,
        deleted:
          deletedMessageIds.length,
      },
    );

    /* DELETE MESSAGES FIRST */

    if (deletedMessageIds.length) {
      await GmailEmail.deleteMany({
        user: userId,
        gmailMessageId: {
          $in: deletedMessageIds,
        },
      });

      for (
        const id of deletedMessageIds
      ) {
        broadcastToUser(
          userId,
          "gmail:email-deleted",
          {
            id,
          },
        );
      }
    }

    /* REMOVE DELETED IDS FROM FETCH LIST */

    const deletedSet =
      new Set(deletedMessageIds);

    const idsToFetch =
      changedMessageIds.filter(
        (id) => !deletedSet.has(id),
      );

    /* FETCH CHANGED MESSAGES */

    if (idsToFetch.length) {
      const gmail =
        await getGmailClient(userId);

      /* Batch size = 5 */
      for (
        let index = 0;
        index < idsToFetch.length;
        index += 5
      ) {
        const batch =
          idsToFetch.slice(
            index,
            index + 5,
          );

        await Promise.all(
          batch.map((id) =>
            processChangedMessage(
              userId,
              gmail,
              id,
            ),
          ),
        );
      }
    }

    /* UPDATE SYNC CHECKPOINT */

    const finalHistoryId =
      latestHistoryId ||
      notificationHistoryId ||
      startHistoryId;

    await GmailSyncState.findOneAndUpdate(
      {
        user: userId,
      },
      {
        $set: {
          historyId: finalHistoryId,
          syncStatus: "idle",
          lastSyncAt: new Date(),
          lastError: "",
        },
      },
    );

    console.log(
      `[GMAIL SYNC] Completed`,
      {
        userId,
        historyId: finalHistoryId,
        changed:
          idsToFetch.length,
        deleted:
          deletedMessageIds.length,
      },
    );

    broadcastToUser(
      userId,
      "gmail:sync-complete",
      {
        historyId: finalHistoryId,
        changed:
          idsToFetch.length,
        deleted:
          deletedMessageIds.length,
      },
    );

    return {
      historyId: finalHistoryId,
      changed: idsToFetch.length,
      deleted:
        deletedMessageIds.length,
    };
  } catch (error) {
    await GmailSyncState.findOneAndUpdate(
      {
        user: userId,
      },
      {
        $set: {
          syncStatus: "error",
          lastError: error.message,
        },
      },
    );

    const status =
      error?.code ||
      error?.response?.status;

    /* Gmail history IDs can expire. */

    if (status === 404) {
      console.warn(
        `[GMAIL SYNC] History expired for user ${userId}. Starting full sync.`,
      );

      return fullSync(userId);
    }

    console.error(
      `[GMAIL SYNC] Incremental sync failed for user ${userId}:`,
      error,
    );

    throw error;
  }
};

/* =========================================================
   FULL SYNC
========================================================= */

const fullSync = async (userId) => {
  validateUserId(userId);

  const gmail =
    await getGmailClient(userId);

  await GmailSyncState.findOneAndUpdate(
    {
      user: userId,
    },
    {
      $set: {
        syncStatus: "syncing",
      },
    },
  );

  try {
    /*
      Capture current history BEFORE fetching emails.
    */

    const profileBefore =
      await gmail.users.getProfile({
        userId: "me",
      });

    const syncStartHistoryId =
      profileBefore.data.historyId;

    console.log(
      `[GMAIL FULL SYNC] Starting`,
      {
        userId,
        historyId: syncStartHistoryId,
      },
    );

    /* Initial inbox */

    const response =
      await gmail.users.messages.list({
        userId: "me",
        maxResults: 50,
        labelIds: [
          "INBOX",
        ],
      });

    const refs =
      response.data.messages || [];

    const emails = [];

    /* Fetch metadata in batches of 5. */

    for (
      let index = 0;
      index < refs.length;
      index += 5
    ) {
      const batch =
        refs.slice(
          index,
          index + 5,
        );

      const messages =
        await Promise.all(
          batch.map(
            async (ref) => {
              const response =
                await gmail.users.messages.get(
                  {
                    userId: "me",
                    id: ref.id,
                    format: "metadata",
                    metadataHeaders: [
                      "From",
                      "To",
                      "Cc",
                      "Bcc",
                      "Subject",
                      "Date",
                    ],
                  },
                );

              return response.data;
            },
          ),
        );

      emails.push(
        ...messages,
      );
    }

    /* SAVE EMAILS TO MONGODB */

    if (emails.length) {
      await GmailEmail.bulkWrite(
        emails.map((message) => {
          const email =
            formatEmail(message);

          return {
            updateOne: {
              filter: {
                user: userId,
                gmailMessageId:
                  email.id,
              },
              update: {
                $set: {
                  user: userId,
                  gmailMessageId:
                    email.id,
                  threadId:
                    email.threadId,
                  from: email.from,
                  sender:
                    email.sender,
                  senderEmail:
                    email.senderEmail,
                  to: email.to,
                  cc: email.cc,
                  bcc: email.bcc,
                  subject:
                    email.subject,
                  snippet:
                    email.snippet,
                  date: email.date,
                  timestamp:
                    email.timestamp,
                  internalDate:
                    email.internalDate,
                  labels:
                    email.labels,
                  isRead:
                    email.isRead,
                  isStarred:
                    email.isStarred,
                  isImportant:
                    email.isImportant,
                  isSent:
                    email.isSent,
                  hasAttachments:
                    email.hasAttachments,
                  historyId:
                    message.historyId ||
                    null,
                },
              },
              upsert: true,
            },
          };
        }),
      );
    }

    /* SAVE HISTORY CHECKPOINT */

    if (syncStartHistoryId) {
      await GmailSyncState.findOneAndUpdate(
        {
          user: userId,
        },
        {
          $set: {
            historyId:
              syncStartHistoryId,
          },
        },
      );

      /*
        Reconcile anything that changed during
        full sync.
      */

      await syncFromHistory(
        userId,
      );
    }

    /* MARK FULL SYNC COMPLETE */

    await GmailSyncState.findOneAndUpdate(
      {
        user: userId,
      },
      {
        $set: {
          syncStatus: "idle",
          lastSyncAt: new Date(),
          lastError: "",
        },
      },
    );

    console.log(
      `[GMAIL FULL SYNC] Completed`,
      {
        userId,
        count: emails.length,
      },
    );

    broadcastToUser(
      userId,
      "gmail:full-sync-complete",
      {
        count: emails.length,
      },
    );

    return {
      success: true,
      count: emails.length,
    };
  } catch (error) {
    await GmailSyncState.findOneAndUpdate(
      {
        user: userId,
      },
      {
        $set: {
          syncStatus: "error",
          lastError: error.message,
        },
      },
    );

    console.error(
      `[GMAIL FULL SYNC] Failed for user ${userId}:`,
      error,
    );

    throw error;
  }
};

/* =========================================================
   INITIALIZE GMAIL SYNC + WATCH
========================================================= */

const initializeGmailSync = async (
  userId,
) => {
  validateUserId(userId);

  const topicName =
    process.env.GMAIL_PUBSUB_TOPIC;

  if (!topicName) {
    throw new ApiError(
      500,
      "GMAIL_PUBSUB_TOPIC is not configured",
    );
  }

  console.log(
    `[GMAIL WATCH] Starting initialization for user ${userId}`,
  );

  console.log(
    `[GMAIL WATCH] Topic: ${topicName}`,
  );

  const gmail =
    await getGmailClient(userId);

  /* Existing sync state */

  const existingState =
    await GmailSyncState.findOne({
      user: userId,
    }).lean();

  const existingHistoryId =
    existingState?.historyId ||
    null;

  /* START GMAIL WATCH */

  let watchResponse;

  try {
    watchResponse =
      await gmail.users.watch({
        userId: "me",
        requestBody: {
          topicName,
        },
      });
  } catch (error) {
    console.error(
      `[GMAIL WATCH] Failed for user ${userId}`,
    );

    console.error(
      "Gmail watch error:",
      error?.response?.data ||
        error.message,
    );

    throw error;
  }

  console.log(
    `[GMAIL WATCH] Response:`,
    watchResponse.data,
  );

  const {
    historyId: watchHistoryId,
    expiration,
  } = watchResponse.data;

  if (!watchHistoryId) {
    throw new ApiError(
      500,
      "Gmail watch did not return a historyId",
    );
  }

  /* GET GMAIL PROFILE */

  const profile =
    await gmail.users.getProfile({
      userId: "me",
    });

  const emailAddress =
    profile.data.emailAddress ||
    existingState?.emailAddress ||
    "";

  if (!emailAddress) {
    throw new ApiError(
      500,
      "Unable to determine Gmail account email address",
    );
  }

  console.log(
    `[GMAIL WATCH] Gmail account: ${emailAddress}`,
  );

  console.log(
    `[GMAIL WATCH] New watch historyId: ${watchHistoryId}`,
  );

  console.log(
    `[GMAIL WATCH] expiration: ${
      expiration
        ? new Date(
            Number(expiration),
          ).toISOString()
        : "none"
    }`,
  );

  /*
    IMPORTANT CHECKPOINT LOGIC

    Existing historyId ko preserve karna hai.
    First setup mein watch historyId use hoga.
  */

  const syncHistoryId =
    existingHistoryId ||
    watchHistoryId;

  /* SAVE SYNC STATE */

  await GmailSyncState.findOneAndUpdate(
    {
      user: userId,
    },
    {
      $set: {
        emailAddress:
          emailAddress.toLowerCase(),
        historyId:
          syncHistoryId,
        watchHistoryId:
          watchHistoryId,
        watchExpiration:
          expiration
            ? new Date(
                Number(expiration),
              )
            : null,
        syncStatus: "syncing",
        lastError: "",
      },
    },
    {
      upsert: true,
      new: true,
    },
  );

  console.log(
    `[GMAIL WATCH] Sync state saved`,
    {
      userId,
      emailAddress,
      historyId:
        syncHistoryId,
      watchHistoryId:
        watchHistoryId,
    },
  );

  /* INITIAL FULL SYNC */

  await fullSync(userId);

  console.log(
    `[GMAIL WATCH] Initialization completed for ${emailAddress}`,
  );

  return {
    historyId:
      syncHistoryId,
    watchHistoryId,
    expiration:
      expiration
        ? new Date(
            Number(expiration),
          )
        : null,
    emailAddress,
  };
};

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  initializeGmailSync,
  syncFromHistory,
  fullSync,
};