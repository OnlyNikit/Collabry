const express = require("express");

const {
  listNotifications,
  unreadCount,
  readNotification,
  readAllNotifications,
  removeNotification,
  removeAllNotifications,
} = require(
  "../controllers/notificationController",
);

const {
  protect,
} = require(
  "../middleware/authMiddleware",
);

const router =
  express.Router();


/* =========================================================
   GET ALL
========================================================= */

router.get(
  "/",
  protect,
  listNotifications,
);


/* =========================================================
   UNREAD COUNT
========================================================= */

router.get(
  "/unread-count",
  protect,
  unreadCount,
);


/* =========================================================
   MARK ALL READ
========================================================= */

router.patch(
  "/read-all",
  protect,
  readAllNotifications,
);


/* =========================================================
   DELETE ALL
========================================================= */

router.delete(
  "/",
  protect,
  removeAllNotifications,
);


/* =========================================================
   SINGLE NOTIFICATION
========================================================= */

router.patch(
  "/:id/read",
  protect,
  readNotification,
);

router.delete(
  "/:id",
  protect,
  removeNotification,
);


module.exports = router;