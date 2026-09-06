const Notification = require("../models/Notification");

/* =========================================================
   CREATE NOTIFICATION
========================================================= */

const createNotification = async ({
  userId,
  type,
  title,
  message,
  emailId = null,
  collaborationId = null,
}) => {
  const notification = await Notification.create({
    user: userId,
    type,
    title,
    message,
    emailId,
    collaborationId,
    read: false,
  });

  /* =======================================================
     REALTIME NOTIFICATION
  ======================================================= */

  try {
    const io = global.io;

    if (io) {
      io.to(`user:${userId}`).emit(
        "notification:new",
        notification,
      );
    }
  } catch (error) {
    console.error(
      "Notification socket broadcast failed:",
      error.message,
    );
  }

  return notification;
};


/* =========================================================
   GET NOTIFICATIONS
========================================================= */

const getNotifications = async (
  userId,
  options = {},
) => {
  const limit = Math.min(
    Number(options.limit) || 50,
    100,
  );

  return Notification.find({
    user: userId,
  })
    .sort({
      createdAt: -1,
    })
    .limit(limit)
    .lean();
};


/* =========================================================
   GET UNREAD COUNT
========================================================= */

const getUnreadCount = async (
  userId,
) => {
  return Notification.countDocuments({
    user: userId,
    read: false,
  });
};


/* =========================================================
   MARK ONE AS READ
========================================================= */

const markNotificationRead = async (
  userId,
  notificationId,
) => {
  const notification =
    await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        user: userId,
      },
      {
        $set: {
          read: true,
        },
      },
      {
        new: true,
      },
    ).lean();

  if (!notification) {
    const error = new Error(
      "Notification not found",
    );

    error.statusCode = 404;

    throw error;
  }

  return notification;
};


/* =========================================================
   MARK ALL AS READ
========================================================= */

const markAllNotificationsRead = async (
  userId,
) => {
  const result =
    await Notification.updateMany(
      {
        user: userId,
        read: false,
      },
      {
        $set: {
          read: true,
        },
      },
    );

  return {
    modifiedCount:
      result.modifiedCount || 0,
  };
};


/* =========================================================
   DELETE ONE NOTIFICATION
========================================================= */

const deleteNotification = async (
  userId,
  notificationId,
) => {
  const notification =
    await Notification.findOneAndDelete({
      _id: notificationId,
      user: userId,
    }).lean();

  if (!notification) {
    const error = new Error(
      "Notification not found",
    );

    error.statusCode = 404;

    throw error;
  }

  /*
   * Tell other open tabs/windows to remove
   * the same notification immediately.
   */
  try {
    const io = global.io;

    if (io) {
      io.to(`user:${userId}`).emit(
        "notification:deleted",
        {
          id: notification._id.toString(),
        },
      );
    }
  } catch (error) {
    console.error(
      "Notification delete socket broadcast failed:",
      error.message,
    );
  }

  return notification;
};


/* =========================================================
   DELETE ALL NOTIFICATIONS
========================================================= */

const deleteAllNotifications = async (
  userId,
) => {
  const result =
    await Notification.deleteMany({
      user: userId,
    });

  try {
    const io = global.io;

    if (io) {
      io.to(`user:${userId}`).emit(
        "notification:all-deleted",
      );
    }
  } catch (error) {
    console.error(
      "Notification delete-all socket broadcast failed:",
      error.message,
    );
  }

  return {
    deletedCount:
      result.deletedCount || 0,
  };
};


/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  createNotification,
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  deleteAllNotifications,
};