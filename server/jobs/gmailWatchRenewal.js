const GmailSyncState = require("../models/GmailSyncState");
const { startGmailWatch } = require("../services/gmailService");

/*
|--------------------------------------------------------------------------
| WATCH RENEWAL CONFIGURATION
|--------------------------------------------------------------------------
|
| Gmail Watch ko expire hone se pehle renew karna hai.
|
| Agar watch next 24 hours ke andar expire hone wala hai,
| to usko renew kar diya jayega.
|
*/

const RENEWAL_WINDOW = 24 * 60 * 60 * 1000;

/*
|--------------------------------------------------------------------------
| RENEWAL INTERVAL
|--------------------------------------------------------------------------
|
| Har 6 hours mein expiring watches check honge.
|
*/

const RENEWAL_INTERVAL = 6 * 60 * 60 * 1000;

/*
|--------------------------------------------------------------------------
| RENEW EXPIRING WATCHES
|--------------------------------------------------------------------------
*/

const renewExpiringWatches = async () => {
  try {
    const now = Date.now();

    const threshold = new Date(
      now + RENEWAL_WINDOW
    );

    console.log(
      "[GMAIL WATCH RENEWAL] Checking expiring watches..."
    );

    /*
    |--------------------------------------------------------------------------
    | Find watches which are:
    |
    | 1. Already expired
    | OR
    | 2. Expiring within next 24 hours
    |
    |--------------------------------------------------------------------------
    */

    const states = await GmailSyncState.find({
      watchExpiration: {
        $ne: null,
        $lte: threshold,
      },
    }).select(
      "_id user emailAddress historyId watchHistoryId watchExpiration syncStatus"
    );

    /*
    |--------------------------------------------------------------------------
    | Nothing to renew
    |--------------------------------------------------------------------------
    */

    if (!states.length) {
      console.log(
        "[GMAIL WATCH RENEWAL] No expiring watches found"
      );

      return {
        success: true,
        renewed: 0,
        failed: 0,
      };
    }

    console.log(
      `[GMAIL WATCH RENEWAL] Found ${states.length} watch(es) to renew`
    );

    let renewedCount = 0;
    let failedCount = 0;

    /*
    |--------------------------------------------------------------------------
    | Renew each user's watch
    |--------------------------------------------------------------------------
    */

    for (const state of states) {
      const userId = state.user?.toString();

      /*
      |--------------------------------------------------------------------------
      | Safety check
      |--------------------------------------------------------------------------
      */

      if (!userId) {
        failedCount += 1;

        console.warn(
          "[GMAIL WATCH RENEWAL] Invalid user reference:",
          state._id
        );

        continue;
      }

      try {
        console.log(
          `[GMAIL WATCH RENEWAL] Renewing watch for ${state.emailAddress} (${userId})`
        );

        /*
        |--------------------------------------------------------------------------
        | IMPORTANT
        |--------------------------------------------------------------------------
        |
        | startGmailWatch() Gmail mein new watch create karega.
        |
        | Updated gmailService.js mein:
        |
        |     historyId
        |
        | existing sync checkpoint ko preserve karta hai.
        |
        | Aur:
        |
        |     watchHistoryId
        |
        | new watch ka history ID store karta hai.
        |
        |--------------------------------------------------------------------------
        */

        const result =
          await startGmailWatch(userId);

        /*
        |--------------------------------------------------------------------------
        | Success
        |--------------------------------------------------------------------------
        */

        renewedCount += 1;

        console.log(
          `[GMAIL WATCH RENEWAL] Successfully renewed for ${state.emailAddress}`
        );

        console.log(
          `[GMAIL WATCH RENEWAL] Sync historyId preserved: ${state.historyId}`
        );

        console.log(
          `[GMAIL WATCH RENEWAL] New watch historyId: ${result.historyId}`
        );

        console.log(
          `[GMAIL WATCH RENEWAL] New expiration: ${
            result.expiration
              ? result.expiration.toISOString()
              : "none"
          }`
        );

        /*
        |--------------------------------------------------------------------------
        | NOTE
        |--------------------------------------------------------------------------
        |
        | Yahan manually historyId update/restore
        | karne ki zarurat nahi hai.
        |
        | startGmailWatch() already handles it.
        |
        */
      } catch (error) {
        failedCount += 1;

        console.error(
          `[GMAIL WATCH RENEWAL] Failed for ${state.emailAddress}:`,
          error
        );

        /*
        |--------------------------------------------------------------------------
        | Save error
        |--------------------------------------------------------------------------
        |
        | Existing historyId ko touch nahi karna.
        |
        | Sirf error status save karo.
        |
        |--------------------------------------------------------------------------
        */

        try {
          await GmailSyncState.updateOne(
            {
              _id: state._id,
            },
            {
              $set: {
                syncStatus: "error",

                lastError:
                  error?.message ||
                  "Failed to renew Gmail watch",
              },
            }
          );
        } catch (dbError) {
          console.error(
            `[GMAIL WATCH RENEWAL] Failed to save error state for ${state.emailAddress}:`,
            dbError
          );
        }
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Renewal Summary
    |--------------------------------------------------------------------------
    */

    console.log(
      "[GMAIL WATCH RENEWAL] Renewal cycle completed:",
      {
        total: states.length,
        renewed: renewedCount,
        failed: failedCount,
      }
    );

    return {
      success: failedCount === 0,
      renewed: renewedCount,
      failed: failedCount,
    };
  } catch (error) {
    console.error(
      "[GMAIL WATCH RENEWAL] Job failed:",
      error
    );

    return {
      success: false,
      renewed: 0,
      failed: 1,
    };
  }
};

/*
|--------------------------------------------------------------------------
| START WATCH RENEWAL JOB
|--------------------------------------------------------------------------
|
| Server start hone ke immediately baad:
|
|     1. Ek baar renewal check
|
| Uske baad:
|
|     2. Har 6 hours mein check
|
|--------------------------------------------------------------------------
*/

const startGmailWatchRenewalJob = () => {
  console.log(
    "[GMAIL WATCH RENEWAL] Renewal job started"
  );

  console.log(
    `[GMAIL WATCH RENEWAL] Check interval: ${
      RENEWAL_INTERVAL / (60 * 60 * 1000)
    } hours`
  );

  console.log(
    `[GMAIL WATCH RENEWAL] Renewal window: ${
      RENEWAL_WINDOW / (60 * 60 * 1000)
    } hours`
  );

  /*
  |--------------------------------------------------------------------------
  | Immediate check
  |--------------------------------------------------------------------------
  */

  renewExpiringWatches().catch((error) => {
    console.error(
      "[GMAIL WATCH RENEWAL] Initial check failed:",
      error
    );
  });

  /*
  |--------------------------------------------------------------------------
  | Periodic check
  |--------------------------------------------------------------------------
  */

  const intervalId = setInterval(() => {
    renewExpiringWatches().catch((error) => {
      console.error(
        "[GMAIL WATCH RENEWAL] Scheduled check failed:",
        error
      );
    });
  }, RENEWAL_INTERVAL);

  /*
  |--------------------------------------------------------------------------
  | Return interval ID
  |--------------------------------------------------------------------------
  |
  | Useful if later you want to stop the job gracefully.
  |
  |--------------------------------------------------------------------------
  */

  return intervalId;
};

/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  startGmailWatchRenewalJob,
  renewExpiringWatches,
};