const express = require("express");

const {
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

  downloadAttachment,

  generateComposeDraft,
  generateReplyDraft,
  generateThreadSummaryController,
  generateMessageSummaryController,
} = require("../controllers/emailController");

const { protect } = require("../middleware/authMiddleware");
const { uploadAttachments } = require("../middleware/uploadMiddleware");
const { aiRateLimit } = require("../middleware/aiRateLimit");

const router = express.Router();

/* =========================================================
   ALL EMAIL ROUTES REQUIRE LOGIN
========================================================= */

router.use(protect);

/* =========================================================
   EMAIL LIST
========================================================= */

/* GET /api/emails */
router.get("/", getEmails);

/* =========================================================
   SEND EMAIL
========================================================= */

/* POST /api/emails/send (JSON ya multipart/form-data) */
router.post("/send", uploadAttachments, sendNewEmail);

/* =========================================================
   EMAIL ACTION ROUTES
========================================================= */

/* GET /api/emails/:id/thread */
router.get("/:id/thread", getThread);

/* Mark as read */
router.patch("/:id/read", markAsRead);

/* Mark as unread */
router.patch("/:id/unread", markAsUnread);

/* Star */
router.patch("/:id/star", starEmailController);

/* Unstar */
router.patch("/:id/unstar", unstarEmailController);

/* Archive */
router.patch("/:id/archive", archiveEmailController);

/* Move to inbox */
router.patch("/:id/inbox", moveToInbox);

/* Move to trash */
router.patch("/:id/trash", trashEmailController);

/* Permanently delete */
router.delete("/:id", permanentlyDeleteEmailController);

/* =========================================================
   REPLY
========================================================= */

/* POST /api/emails/:id/reply
   JSON ya multipart/form-data
*/
router.post("/:id/reply", uploadAttachments, replyEmail);

/* =========================================================
   AI FEATURES
========================================================= */

/* AI compose draft */
router.post(
  "/ai/compose",
  aiRateLimit,
  generateComposeDraft,
);

/* AI reply draft */
router.post(
  "/:id/ai-reply",
  aiRateLimit,
  generateReplyDraft,
);

/* AI summary of THIS PARTICULAR THREAD */
router.post(
  "/:id/ai-summary",
  aiRateLimit,
  generateThreadSummaryController,
);

/* AI summary of ONE PARTICULAR MESSAGE only */
router.post(
  "/:id/ai-message-summary",
  aiRateLimit,
  generateMessageSummaryController,
);

/* =========================================================
   ATTACHMENTS
========================================================= */

/* Download / preview attachment */
router.get(
  "/:id/attachments/:attachmentId",
  downloadAttachment,
);

/* =========================================================
   GET SINGLE EMAIL
   IMPORTANT: KEEP THIS LAST
========================================================= */

router.get("/:id", getEmail);

module.exports = router;