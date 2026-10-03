import { useMemo, useState } from "react";

import {
  Bell,
  CheckCheck,
  Mail,
  CalendarClock,
  Video,
  Wallet,
  MessageSquare,
  Filter,
  Trash2,
} from "lucide-react";

import {
  useNotifications,
} from "../../context/NotificationContext";

import DeleteModal from "../../components/common/DeleteModal";

import "./Notification.css";


const FILTER_OPTIONS = [
  {
    value: "all",
    label: "All",
  },
  {
    value: "unread",
    label: "Unread",
  },
  {
    value: "collaboration",
    label: "Collaboration",
  },
  {
    value: "follow_up",
    label: "Follow-up",
  },
  {
    value: "production",
    label: "Production",
  },
  {
    value: "deadline",
    label: "Deadline",
  },
  {
    value: "payment",
    label: "Payment",
  },
  {
    value: "new_email",
    label: "Email",
  },
  {
    value: "email_reply",
    label: "Message",
  },
];


const TYPE_META = {
  collaboration: {
    label: "Collaboration",
    icon: Mail,
  },

  follow_up: {
    label: "Follow-up",
    icon: CalendarClock,
  },

  production: {
    label: "Production",
    icon: Video,
  },

  deadline: {
    label: "Deadline",
    icon: Bell,
  },

  payment: {
    label: "Payment",
    icon: Wallet,
  },

  message: {
    label: "Message",
    icon: MessageSquare,
  },

  new_email: {
    label: "New Email",
    icon: Mail,
  },

  email_reply: {
    label: "Email Reply",
    icon: MessageSquare,
  },
};


function Notifications() {
  const {
    notifications,
    unreadCount,
    loading,
    error,

    markAsRead,
    markAllAsRead,

    deleteNotification,
    deleteAllNotifications,
  } = useNotifications();


  const [
    filter,
    setFilter,
  ] = useState("all");


  const [
    deletingId,
    setDeletingId,
  ] = useState(null);


  const [
    isDeleteModalOpen,
    setIsDeleteModalOpen,
  ] = useState(false);


  const [
    notificationToDelete,
    setNotificationToDelete,
  ] = useState(null);


  const [
    isDeleteAllModalOpen,
    setIsDeleteAllModalOpen,
  ] = useState(false);


  const [
    isDeleting,
    setIsDeleting,
  ] = useState(false);


  const totalNotifications =
    notifications.length;


  /* =========================================================
     FILTERED NOTIFICATIONS
  ========================================================= */

  const filteredNotifications =
    useMemo(() => {
      if (filter === "all") {
        return notifications;
      }

      if (filter === "unread") {
        return notifications.filter(
          (notification) =>
            !notification.read,
        );
      }

      return notifications.filter(
        (notification) =>
          notification.type ===
          filter,
      );
    }, [
      filter,
      notifications,
    ]);


  /* =========================================================
     MARK AS READ
  ========================================================= */

  async function handleMarkAsRead(
    notification,
  ) {
    if (!notification) {
      return;
    }

    if (notification.read) {
      return;
    }

    const notificationId =
      notification._id ||
      notification.id;

    if (!notificationId) {
      return;
    }

    try {
      await markAsRead(
        notificationId,
      );
    } catch (error) {
      console.error(
        "[NOTIFICATIONS] Failed to mark notification as read:",
        error,
      );
    }
  }


  /* =========================================================
     MARK ALL AS READ
  ========================================================= */

  async function handleMarkAllAsRead() {
    if (!unreadCount) {
      return;
    }

    try {
      await markAllAsRead();
    } catch (error) {
      console.error(
        "[NOTIFICATIONS] Failed to mark all notifications as read:",
        error,
      );
    }
  }


  /* =========================================================
     OPEN DELETE MODAL
  ========================================================= */

  function handleDeleteNotification(
    event,
    notification,
  ) {
    event.stopPropagation();

    const notificationId =
      notification?._id ||
      notification?.id;

    if (!notificationId) {
      return;
    }

    setNotificationToDelete(
      notification,
    );

    setDeletingId(
      notificationId,
    );

    setIsDeleteModalOpen(
      true,
    );
  }


  /* =========================================================
     CLOSE DELETE MODAL
  ========================================================= */

  function handleCloseDeleteModal() {
    if (isDeleting) {
      return;
    }

    setIsDeleteModalOpen(
      false,
    );

    setNotificationToDelete(
      null,
    );

    setDeletingId(null);
  }


  /* =========================================================
     CONFIRM SINGLE DELETE
  ========================================================= */

  async function handleConfirmDelete() {
    if (!notificationToDelete) {
      return;
    }

    const notificationId =
      notificationToDelete._id ||
      notificationToDelete.id;

    if (!notificationId) {
      return;
    }

    try {
      setIsDeleting(true);

      await deleteNotification(
        notificationId,
      );

      setIsDeleteModalOpen(
        false,
      );

      setNotificationToDelete(
        null,
      );

      setDeletingId(null);
    } catch (error) {
      console.error(
        "[NOTIFICATIONS] Delete failed:",
        error,
      );
    } finally {
      setIsDeleting(false);
    }
  }


  /* =========================================================
     OPEN DELETE ALL MODAL
  ========================================================= */

  function handleDeleteAll() {
    if (!totalNotifications) {
      return;
    }

    setIsDeleteAllModalOpen(
      true,
    );
  }


  /* =========================================================
     CLOSE DELETE ALL MODAL
  ========================================================= */

  function handleCloseDeleteAllModal() {
    if (isDeleting) {
      return;
    }

    setIsDeleteAllModalOpen(
      false,
    );
  }


  /* =========================================================
     CONFIRM DELETE ALL
  ========================================================= */

  async function handleConfirmDeleteAll() {
    if (!totalNotifications) {
      return;
    }

    try {
      setIsDeleting(true);

      await deleteAllNotifications();

      setIsDeleteAllModalOpen(
        false,
      );
    } catch (error) {
      console.error(
        "[NOTIFICATIONS] Delete all failed:",
        error,
      );
    } finally {
      setIsDeleting(false);
    }
  }


  /* =========================================================
     FORMAT TIME
  ========================================================= */

  function formatNotificationTime(
    notification,
  ) {
    if (!notification) {
      return "";
    }

    if (notification.time) {
      return notification.time;
    }

    if (notification.createdAt) {
      const createdAt =
        new Date(
          notification.createdAt,
        );

      if (
        !Number.isNaN(
          createdAt.getTime(),
        )
      ) {
        return createdAt.toLocaleString(
          undefined,
          {
            dateStyle: "medium",
            timeStyle: "short",
          },
        );
      }
    }

    return "";
  }


  return (
    <div className="clb-notifications-page">

      {/* =========================================================
          HEADER
      ========================================================= */}

      <header className="clb-notifications-page__header">

        <div>
          <div className="clb-notifications-page__title-row">

            <div className="clb-notifications-page__title-icon">
              <Bell size={22} />
            </div>

            <div>
              <h1>
                Notifications
              </h1>

              <p>
                Stay updated on collaborations,
                deadlines, production, and emails.
              </p>
            </div>

          </div>
        </div>


        <div className="clb-notifications-page__header-actions">

          <button
            type="button"
            className="clb-btn clb-btn--ghost"
            onClick={
              handleMarkAllAsRead
            }
            disabled={
              !unreadCount ||
              loading
            }
          >
            <CheckCheck size={18} />

            Mark all as read
          </button>


          <button
            type="button"
            className="clb-btn clb-btn--ghost"
            onClick={
              handleDeleteAll
            }
            disabled={
              !totalNotifications ||
              loading ||
              isDeleting
            }
          >
            <Trash2 size={18} />

            Delete all
          </button>

        </div>

      </header>


      {/* =========================================================
          SUMMARY
      ========================================================= */}

      <section className="clb-notifications-summary">

        <div className="clb-notifications-summary__card">

          <div>
            <span>
              Total Notifications
            </span>

            <strong>
              {totalNotifications}
            </strong>
          </div>

          <Bell size={22} />

        </div>


        <div className="clb-notifications-summary__card clb-notifications-summary__card--unread">

          <div>
            <span>
              Unread
            </span>

            <strong>
              {unreadCount}
            </strong>
          </div>

          <span className="clb-notifications-summary__pulse" />

        </div>

      </section>


      {/* =========================================================
          ERROR
      ========================================================= */}

      {error && (
        <div
          className="clb-notifications-empty"
          style={{
            marginBottom: "16px",
          }}
        >
          <Bell size={30} />

          <h2>
            Unable to load notifications
          </h2>

          <p>
            {error}
          </p>
        </div>
      )}


      {/* =========================================================
          FILTERS
      ========================================================= */}

      <section className="clb-notifications-toolbar">

        <div className="clb-notifications-filter-label">

          <Filter size={17} />

          <span>
            Filter
          </span>

        </div>


        <div className="clb-notifications-filters">

          {FILTER_OPTIONS.map(
            (option) => (

              <button
                key={option.value}
                type="button"
                className={`clb-notifications-filter ${
                  filter ===
                  option.value
                    ? "clb-notifications-filter--active"
                    : ""
                }`}
                onClick={() =>
                  setFilter(
                    option.value,
                  )
                }
              >
                {option.label}
              </button>

            ),
          )}

        </div>

      </section>


      {/* =========================================================
          NOTIFICATION LIST
      ========================================================= */}

      <section className="clb-notifications-list">

        {loading &&
        notifications.length === 0 ? (

          <div className="clb-notifications-empty">

            <Bell size={36} />

            <h2>
              Loading notifications...
            </h2>

            <p>
              Please wait while we load your
              latest notifications.
            </p>

          </div>

        ) : filteredNotifications.length ===
          0 ? (

          <div className="clb-notifications-empty">

            <Bell size={36} />

            <h2>
              No notifications found
            </h2>

            <p>
              There are no notifications
              matching this filter.
            </p>

          </div>

        ) : (

          filteredNotifications.map(
            (notification) => {

              const meta =
                TYPE_META[
                  notification.type
                ];

              const Icon =
                meta?.icon ||
                Bell;

              const notificationId =
                notification._id ||
                notification.id;

              const isUnread =
                !notification.read;

              return (
                <article
                  key={
                    notificationId
                  }
                  className={`clb-notification-card ${
                    isUnread
                      ? "clb-notification-card--unread"
                      : ""
                  }`}
                  onClick={() =>
                    handleMarkAsRead(
                      notification,
                    )
                  }
                >

                  {/* =================================================
                      ICON
                  ================================================= */}

                  <div
                    className={`clb-notification-card__icon clb-notification-card__icon--${notification.type}`}
                  >
                    <Icon size={20} />
                  </div>


                  {/* =================================================
                      CONTENT
                  ================================================= */}

                  <div className="clb-notification-card__content">

                    <div className="clb-notification-card__top">

                      <h3>
                        {
                          notification.title ||
                          "Notification"
                        }
                      </h3>

                      <span>
                        {
                          formatNotificationTime(
                            notification,
                          )
                        }
                      </span>

                    </div>


                    <p>
                      {
                        notification.message ||
                        ""
                      }
                    </p>


                    <span className="clb-notification-card__type">
                      {
                        meta?.label ||
                        "Notification"
                      }
                    </span>

                  </div>


                  {/* =================================================
                      DELETE BUTTON
                  ================================================= */}

                  <div className="clb-notification-card__actions">

                    <button
                      type="button"
                      className="clb-notification-card__delete"
                      onClick={(
                        event,
                      ) =>
                        handleDeleteNotification(
                          event,
                          notification,
                        )
                      }
                      aria-label="Delete notification"
                      title="Delete notification"
                      disabled={
                        deletingId ===
                        notificationId
                      }
                    >
                      <Trash2 size={17} />
                    </button>

                  </div>


                  {/* =================================================
                      UNREAD DOT
                  ================================================= */}

                  {isUnread && (
                    <span
                      className="clb-notification-card__unread"
                      aria-label="Unread"
                    />
                  )}

                </article>
              );
            },
          )

        )}

      </section>


      {/* =========================================================
          SINGLE DELETE MODAL
      ========================================================= */}

      <DeleteModal
        isOpen={
          isDeleteModalOpen
        }
        title="Delete notification?"
        description={
          notificationToDelete?.message ||
          "This notification will be permanently deleted."
        }
        confirmText="Delete"
        loadingText="Deleting..."
        isDeleting={
          isDeleting
        }
        onClose={
          handleCloseDeleteModal
        }
        onConfirm={
          handleConfirmDelete
        }
      />


      {/* =========================================================
          DELETE ALL MODAL
      ========================================================= */}

      <DeleteModal
        isOpen={
          isDeleteAllModalOpen
        }
        title="Delete all notifications?"
        description="All of your notifications will be permanently deleted. This action cannot be undone."
        confirmText="Delete All"
        loadingText="Deleting..."
        isDeleting={
          isDeleting
        }
        onClose={
          handleCloseDeleteAllModal
        }
        onConfirm={
          handleConfirmDeleteAll
        }
      />

    </div>
  );
}


export default Notifications;