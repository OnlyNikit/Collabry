import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { io } from "socket.io-client";

import { useToast } from "./ToastContext";

const NotificationContext = createContext(null);

/* =========================================================
   API + SOCKET URLS

   Production me API calls relative jaati hain (Vercel rewrite => Render),
   isse cookie first-party rehti hai. Socket seedha Render se judta hai
   (Vercel websocket proxy nahi karta), isliye VITE_SOCKET_URL chahiye.
========================================================= */

const API_URL = import.meta.env.PROD
  ? ""
  : import.meta.env.VITE_API_URL || "http://localhost:8080";

const SOCKET_URL = import.meta.env.PROD
  ? import.meta.env.VITE_SOCKET_URL
  : import.meta.env.VITE_API_URL || "http://localhost:8080";

const SOCKET_TOKEN_URL = import.meta.env.PROD
  ? "/api/auth/socket-token"
  : `${SOCKET_URL}/api/auth/socket-token`;

async function fetchSocketToken() {
  try {
    const response = await fetch(SOCKET_TOKEN_URL, {
      credentials: "include",
    });

    if (!response.ok) return null;

    const json = await response.json();

    return json?.data?.token || null;
  } catch {
    return null;
  }
}

/*
  auth function har connect / reconnect par chalta hai,
  isliye expire hua token apne aap naya ho jata hai.
*/
function createAuthedSocket() {
  const socket = io(SOCKET_URL, {
    withCredentials: true,
    transports: ["websocket", "polling"],
    autoConnect: false,
    auth: (callback) => {
      fetchSocketToken().then((token) => callback({ token }));
    },
  });

  socket.connect();

  return socket;
}

/* =========================================================
   NOTIFICATION PROVIDER
========================================================= */

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { showToast } = useToast();

  /* =======================================================
     API REQUEST
  ======================================================= */

  const apiRequest = useCallback(async (endpoint, options = {}) => {
    const headers = {
      ...options.headers,
    };

    if (options.body) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      credentials: "include",
      headers,
    });

    let data = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      throw new Error(data?.message || "Request failed");
    }

    return data;
  }, []);

  /* =======================================================
     LOAD NOTIFICATIONS
  ======================================================= */

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiRequest("/api/notifications?limit=50");

      const list =
        response?.data?.notifications || response?.notifications;

      const safeList = Array.isArray(list) ? list : [];

      setNotifications(safeList);

      const calculatedUnread = safeList.reduce(
        (count, notification) => (notification?.read ? count : count + 1),
        0,
      );

      setUnreadCount(calculatedUnread);

      return safeList;
    } catch (loadError) {
      console.error("[NOTIFICATIONS] Failed to load:", loadError);

      setError(loadError.message);

      return [];
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  /* =======================================================
     LOAD UNREAD COUNT
  ======================================================= */

  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await apiRequest("/api/notifications/unread-count");

      const count =
        Number(
          response?.data?.count ??
            response?.data?.unreadCount ??
            response?.count ??
            response?.unreadCount,
        ) || 0;

      setUnreadCount(count);

      return count;
    } catch (countError) {
      console.error(
        "[NOTIFICATIONS] Failed to load unread count:",
        countError,
      );

      return 0;
    }
  }, [apiRequest]);

  /* =======================================================
     MARK ONE NOTIFICATION AS READ
  ======================================================= */

  const markAsRead = useCallback(
    async (notificationId) => {
      if (!notificationId) {
        return;
      }

      const currentNotification = notifications.find(
        (notification) =>
          String(notification?._id || notification?.id) ===
          String(notificationId),
      );

      const wasUnread = currentNotification && !currentNotification.read;

      try {
        const response = await apiRequest(
          `/api/notifications/${encodeURIComponent(notificationId)}/read`,
          {
            method: "PATCH",
          },
        );

        const updated =
          response?.data?.notification || response?.notification;

        setNotifications((previous) =>
          previous.map((notification) =>
            String(notification?._id || notification?.id) ===
            String(notificationId)
              ? {
                  ...notification,
                  ...(updated || {}),
                  read: true,
                }
              : notification,
          ),
        );

        if (wasUnread) {
          setUnreadCount((previous) => Math.max(0, previous - 1));
        }

        return updated;
      } catch (readError) {
        console.error("[NOTIFICATIONS] Failed to mark as read:", readError);

        throw readError;
      }
    },
    [apiRequest, notifications],
  );

  /* =======================================================
     MARK ALL AS READ
  ======================================================= */

  const markAllAsRead = useCallback(async () => {
    try {
      await apiRequest("/api/notifications/read-all", {
        method: "PATCH",
      });

      setNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          read: true,
        })),
      );

      setUnreadCount(0);

      showToast("All notifications marked as read", "success", 3000);
    } catch (readAllError) {
      console.error(
        "[NOTIFICATIONS] Failed to mark all as read:",
        readAllError,
      );

      showToast(
        readAllError.message || "Failed to mark all notifications as read",
        "error",
        4000,
      );

      throw readAllError;
    }
  }, [apiRequest, showToast]);

  /* =======================================================
     DELETE ONE NOTIFICATION
  ======================================================= */

  const deleteNotification = useCallback(
    async (notificationId) => {
      if (!notificationId) {
        throw new Error("Notification ID is missing");
      }

      const notification = notifications.find(
        (item) =>
          String(item?._id || item?.id) === String(notificationId),
      );

      const wasUnread = notification && !notification.read;

      try {
        await apiRequest(
          `/api/notifications/${encodeURIComponent(notificationId)}`,
          {
            method: "DELETE",
          },
        );

        setNotifications((previous) =>
          previous.filter(
            (item) =>
              String(item?._id || item?.id) !== String(notificationId),
          ),
        );

        if (wasUnread) {
          setUnreadCount((previous) => Math.max(0, previous - 1));
        }

        showToast("Notification deleted", "success", 3000);
      } catch (deleteError) {
        console.error(
          "[NOTIFICATIONS] Failed to delete notification:",
          deleteError,
        );

        showToast(
          deleteError.message || "Failed to delete notification",
          "error",
          4000,
        );

        throw deleteError;
      }
    },
    [apiRequest, notifications, showToast],
  );

  /* =======================================================
     DELETE ALL NOTIFICATIONS
  ======================================================= */

  const deleteAllNotifications = useCallback(async () => {
    try {
      await apiRequest("/api/notifications", {
        method: "DELETE",
      });

      setNotifications([]);

      setUnreadCount(0);

      showToast("All notifications deleted", "success", 3000);
    } catch (deleteAllError) {
      console.error(
        "[NOTIFICATIONS] Failed to delete all notifications:",
        deleteAllError,
      );

      showToast(
        deleteAllError.message || "Failed to delete all notifications",
        "error",
        4000,
      );

      throw deleteAllError;
    }
  }, [apiRequest, showToast]);

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  /* =======================================================
     SOCKET.IO REALTIME
  ======================================================= */

  useEffect(() => {
    const socket = createAuthedSocket();

    const handleNewNotification = (notification) => {
      if (!notification) {
        return;
      }

      console.log("[SOCKET] New notification:", notification);

      const notificationId = notification._id || notification.id;

      let isDuplicate = false;

      setNotifications((previous) => {
        if (!notificationId) {
          return [notification, ...previous];
        }

        const alreadyExists = previous.some(
          (existing) =>
            String(existing?._id || existing?.id) === String(notificationId),
        );

        if (alreadyExists) {
          isDuplicate = true;
          return previous;
        }

        return [notification, ...previous];
      });

      if (isDuplicate) {
        return;
      }

      if (!notification.read) {
        setUnreadCount((previous) => previous + 1);
      }

      const senderName = notification?.message || "You have a new notification";

      showToast(`🔔 ${senderName}`, "info", 5000);
    };

    /* =====================================================
       SOCKET DELETE ONE
    ===================================================== */

    const handleDeletedNotification = (payload) => {
      const deletedId = payload?.id || payload?._id;

      if (!deletedId) {
        return;
      }

      setNotifications((previous) => {
        const deleted = previous.find(
          (notification) =>
            String(notification?._id || notification?.id) ===
            String(deletedId),
        );

        if (deleted && !deleted.read) {
          setUnreadCount((count) => Math.max(0, count - 1));
        }

        return previous.filter(
          (notification) =>
            String(notification?._id || notification?.id) !==
            String(deletedId),
        );
      });
    };

    /* =====================================================
       SOCKET DELETE ALL
    ===================================================== */

    const handleAllDeleted = () => {
      setNotifications([]);

      setUnreadCount(0);
    };

    socket.on("connect", () => {
      console.log("[NOTIFICATION SOCKET] Connected:", socket.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("[NOTIFICATION SOCKET] Disconnected:", reason);
    });

    socket.on("connect_error", (socketError) => {
      console.error(
        "[NOTIFICATION SOCKET] Connection error:",
        socketError?.message || socketError,
      );
    });

    socket.on("notification:new", handleNewNotification);

    socket.on("notification:deleted", handleDeletedNotification);

    socket.on("notification:all-deleted", handleAllDeleted);

    return () => {
      socket.off("notification:new", handleNewNotification);

      socket.off("notification:deleted", handleDeletedNotification);

      socket.off("notification:all-deleted", handleAllDeleted);

      socket.disconnect();
    };
  }, [showToast]);

  /* =======================================================
     CONTEXT VALUE
  ======================================================= */

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      error,

      loadNotifications,
      loadUnreadCount,

      markAsRead,
      markAllAsRead,

      deleteNotification,
      deleteAllNotifications,
    }),
    [
      notifications,
      unreadCount,
      loading,
      error,

      loadNotifications,
      loadUnreadCount,

      markAsRead,
      markAllAsRead,

      deleteNotification,
      deleteAllNotifications,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

/* =========================================================
   CUSTOM HOOK
========================================================= */

export function useNotifications() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error(
      "useNotifications must be used inside NotificationProvider",
    );
  }

  return context;
}