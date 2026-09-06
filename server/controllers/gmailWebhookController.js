const GmailSyncState = require("../models/GmailSyncState");
const { syncFromHistory } = require("../services/gmailSyncService");

/*
 * Keep one sync promise per user.
 *
 * Pub/Sub notifications can arrive while a previous history sync
 * is still running. We must NOT silently drop the newer notification.
 */
const activeSyncs = new Map();
const queuedHistoryIds = new Map();

const runQueuedSync = async (userId) => {
  if (activeSyncs.has(userId)) {
    return activeSyncs.get(userId);
  }

  const syncPromise = (async () => {
    try {
      while (queuedHistoryIds.has(userId)) {
        const historyId = queuedHistoryIds.get(userId);
        queuedHistoryIds.delete(userId);

        console.log(
          `[GMAIL WEBHOOK] Starting history sync for user ${userId} from historyId ${historyId}`,
        );

        await syncFromHistory(userId, historyId);
      }
    } finally {
      activeSyncs.delete(userId);

      /*
       * A notification can arrive in the tiny gap between the final
       * queue check and activeSyncs.delete(). Start another run if that
       * happened.
       */
      if (queuedHistoryIds.has(userId)) {
        runQueuedSync(userId).catch((error) => {
          console.error(
            `[GMAIL WEBHOOK] Queued sync failed for ${userId}:`,
            error,
          );
        });
      }
    }
  })();

  activeSyncs.set(userId, syncPromise);
  return syncPromise;
};

const gmailPubSubWebhook = async (req, res) => {
  /*
   * Pub/Sub push expects a successful HTTP response.
   * We acknowledge immediately and keep processing asynchronously.
   */
  res.status(200).send("OK");

  try {
    const message = req.body?.message;

    if (!message) {
      console.warn("[GMAIL WEBHOOK] Missing Pub/Sub message");
      return;
    }

    const encodedData = message.data;

    if (!encodedData) {
      console.warn("[GMAIL WEBHOOK] Missing Pub/Sub message data");
      return;
    }

    const decoded = Buffer.from(
      encodedData,
      "base64",
    ).toString("utf8");

    const notification = JSON.parse(decoded);
    const { emailAddress, historyId } = notification;

    if (!emailAddress || !historyId) {
      console.warn(
        "[GMAIL WEBHOOK] Invalid Gmail notification:",
        notification,
      );
      return;
    }

    const state = await GmailSyncState.findOne({
      emailAddress: emailAddress.toLowerCase(),
    });

    if (!state) {
      console.warn(
        "[GMAIL WEBHOOK] No Gmail sync state for:",
        emailAddress,
      );
      return;
    }

    const userId = state.user.toString();

    /*
     * Keep the newest notification while a sync is running.
     * The history API will reconcile all changes between the stored
     * checkpoint and the newest history ID.
     */
    queuedHistoryIds.set(userId, String(historyId));

    console.log(
      `[GMAIL WEBHOOK] Notification received | ${emailAddress} | historyId=${historyId}`,
    );

    await runQueuedSync(userId);
  } catch (error) {
    console.error(
      "Gmail Pub/Sub processing error:",
      error,
    );
  }
};

module.exports = {
  gmailPubSubWebhook,
};