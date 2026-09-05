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
} = require("../controllers/emailController");

const {
  protect,
} = require("../middleware/authMiddleware");

const router = express.Router();

/* =========================================================
   ALL EMAIL ROUTES REQUIRE LOGIN
========================================================= */

router.use(protect);

/* =========================================================
   GET EMAIL LIST
   GET /api/emails
========================================================= */

router.get("/", getEmails);

/* =========================================================
   SEND NEW EMAIL
   POST /api/emails
========================================================= */

router.post("/", sendNewEmail);

/* =========================================================
   EMAIL ACTION ROUTES
========================================================= */

/* GET EMAIL THREAD */
router.get("/:id/thread", getThread);

/* MARK AS READ */
router.patch("/:id/read", markAsRead);

/* MARK AS UNREAD */
router.patch("/:id/unread", markAsUnread);

/* STAR EMAIL */
router.patch("/:id/star", starEmailController);

/* UNSTAR EMAIL */
router.patch("/:id/unstar", unstarEmailController);

/* ARCHIVE EMAIL */
router.patch("/:id/archive", archiveEmailController);

/* MOVE TO INBOX */
router.patch("/:id/inbox", moveToInbox);

/* MOVE TO TRASH */
router.patch("/:id/trash", trashEmailController);

/* PERMANENTLY DELETE */
router.delete("/:id", permanentlyDeleteEmailController);

/* REPLY TO EMAIL */
router.post("/:id/reply", replyEmail);

/* =========================================================
   GET SINGLE EMAIL
   IMPORTANT: KEEP THIS LAST
========================================================= */

router.get("/:id", getEmail);

module.exports = router;