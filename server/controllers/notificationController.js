const asyncHandler =
  require("../utils/asyncHandler");

const {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  deleteAllNotifications,
} = require(
  "../services/notificationService",
);


/* =========================================================
   GET NOTIFICATIONS
========================================================= */

const listNotifications =
  asyncHandler(
    async (req, res) => {
      const {
        limit,
      } = req.query;

      const notifications =
        await getNotifications(
          req.user._id,
          {
            limit,
          },
        );

      return res.status(200).json({
        success: true,
        notifications,
      });
    },
  );


/* =========================================================
   GET UNREAD COUNT
========================================================= */

const unreadCount =
  asyncHandler(
    async (req, res) => {
      const count =
        await getUnreadCount(
          req.user._id,
        );

      return res.status(200).json({
        success: true,
        unreadCount: count,
      });
    },
  );


/* =========================================================
   MARK ONE AS READ
========================================================= */

const readNotification =
  asyncHandler(
    async (req, res) => {
      const notification =
        await markNotificationRead(
          req.user._id,
          req.params.id,
        );

      return res.status(200).json({
        success: true,
        notification,
      });
    },
  );


/* =========================================================
   MARK ALL AS READ
========================================================= */

const readAllNotifications =
  asyncHandler(
    async (req, res) => {
      const result =
        await markAllNotificationsRead(
          req.user._id,
        );

      return res.status(200).json({
        success: true,
        ...result,
      });
    },
  );


/* =========================================================
   DELETE ONE NOTIFICATION
========================================================= */

const removeNotification =
  asyncHandler(
    async (req, res) => {
      const notification =
        await deleteNotification(
          req.user._id,
          req.params.id,
        );

      return res.status(200).json({
        success: true,
        message: "Notification deleted successfully",
        notification,
      });
    },
  );


/* =========================================================
   DELETE ALL NOTIFICATIONS
========================================================= */

const removeAllNotifications =
  asyncHandler(
    async (req, res) => {
      const result =
        await deleteAllNotifications(
          req.user._id,
        );

      return res.status(200).json({
        success: true,
        message:
          "All notifications deleted successfully",
        ...result,
      });
    },
  );


module.exports = {
  listNotifications,
  unreadCount,
  readNotification,
  readAllNotifications,
  removeNotification,
  removeAllNotifications,
};