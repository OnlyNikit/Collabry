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

import "./Notification.css";

const INITIAL_NOTIFICATIONS = [
  {
    id: 1,
    type: "collaboration",
    title: "New collaboration inquiry",
    message:
      "Nova AI sent a new collaboration request for an upcoming campaign.",
    time: "10 minutes ago",
    unread: true,
  },
  {
    id: 2,
    type: "follow_up",
    title: "Follow-up is due today",
    message:
      "You need to follow up with PixelForge regarding the proposal.",
    time: "1 hour ago",
    unread: true,
  },
  {
    id: 3,
    type: "production",
    title: "Video is ready for review",
    message:
      "The editor has marked the collaboration video as ready for review.",
    time: "3 hours ago",
    unread: true,
  },
  {
    id: 4,
    type: "deadline",
    title: "Campaign deadline approaching",
    message:
      "The deadline for AI Creator Campaign is tomorrow.",
    time: "Yesterday",
    unread: false,
  },
  {
    id: 5,
    type: "payment",
    title: "Payment status updated",
    message:
      "Payment for TechVision collaboration has been marked as paid.",
    time: "Yesterday",
    unread: false,
  },
  {
    id: 6,
    type: "message",
    title: "Client sent a reply",
    message:
      "A client has replied to your latest collaboration email.",
    time: "2 days ago",
    unread: false,
  },
];

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "collaboration", label: "Collaboration" },
  { value: "follow_up", label: "Follow-up" },
  { value: "production", label: "Production" },
  { value: "deadline", label: "Deadline" },
  { value: "payment", label: "Payment" },
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
};

function Notifications() {
  const [notifications, setNotifications] = useState(
    INITIAL_NOTIFICATIONS
  );

  const [filter, setFilter] = useState("all");

  const unreadCount = notifications.filter(
    (notification) => notification.unread
  ).length;

  const filteredNotifications = useMemo(() => {
    if (filter === "all") {
      return notifications;
    }

    if (filter === "unread") {
      return notifications.filter(
        (notification) => notification.unread
      );
    }

    return notifications.filter(
      (notification) =>
        notification.type === filter
    );
  }, [filter, notifications]);

  /*
  |--------------------------------------------------------------------------
  | MARK AS READ
  |--------------------------------------------------------------------------
  */

  function markAsRead(id) {
    setNotifications((previousNotifications) =>
      previousNotifications.map((notification) =>
        notification.id === id
          ? {
              ...notification,
              unread: false,
            }
          : notification
      )
    );
  }

  /*
  |--------------------------------------------------------------------------
  | MARK ALL AS READ
  |--------------------------------------------------------------------------
  */

  function markAllAsRead() {
    setNotifications((previousNotifications) =>
      previousNotifications.map((notification) => ({
        ...notification,
        unread: false,
      }))
    );
  }

  /*
  |--------------------------------------------------------------------------
  | DELETE NOTIFICATION
  |--------------------------------------------------------------------------
  */

  function deleteNotification(event, id) {
    event.stopPropagation();

    const shouldDelete = window.confirm(
      "Delete this notification?"
    );

    if (!shouldDelete) {
      return;
    }

    setNotifications((previousNotifications) =>
      previousNotifications.filter(
        (notification) =>
          notification.id !== id
      )
    );
  }

  return (
    <div className="clb-notifications-page">

      {/* Header */}

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
                deadlines, production, and payments.
              </p>
            </div>

          </div>
        </div>

        <button
          type="button"
          className="clb-btn clb-btn--ghost"
          onClick={markAllAsRead}
          disabled={!unreadCount}
        >
          <CheckCheck size={18} />

          Mark all as read
        </button>
      </header>


      {/* Summary */}

      <section className="clb-notifications-summary">

        <div className="clb-notifications-summary__card">
          <div>
            <span>
              Total Notifications
            </span>

            <strong>
              {notifications.length}
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


      {/* Filters */}

      <section className="clb-notifications-toolbar">

        <div className="clb-notifications-filter-label">
          <Filter size={17} />

          <span>
            Filter
          </span>
        </div>


        <div className="clb-notifications-filters">

          {FILTER_OPTIONS.map((option) => (

            <button
              key={option.value}
              type="button"
              className={`clb-notifications-filter ${
                filter === option.value
                  ? "clb-notifications-filter--active"
                  : ""
              }`}
              onClick={() =>
                setFilter(option.value)
              }
            >
              {option.label}
            </button>

          ))}

        </div>

      </section>


      {/* Notification List */}

      <section className="clb-notifications-list">

        {filteredNotifications.length === 0 ? (

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
                TYPE_META[notification.type];

              const Icon =
                meta?.icon || Bell;

              return (

                <article
                  key={notification.id}
                  className={`clb-notification-card ${
                    notification.unread
                      ? "clb-notification-card--unread"
                      : ""
                  }`}
                  onClick={() =>
                    markAsRead(
                      notification.id
                    )
                  }
                >

                  {/* Icon */}

                  <div
                    className={`clb-notification-card__icon clb-notification-card__icon--${notification.type}`}
                  >
                    <Icon size={20} />
                  </div>


                  {/* Content */}

                  <div className="clb-notification-card__content">

                    <div className="clb-notification-card__top">

                      <h3>
                        {notification.title}
                      </h3>

                      <span>
                        {notification.time}
                      </span>

                    </div>


                    <p>
                      {notification.message}
                    </p>


                    <span className="clb-notification-card__type">
                      {meta?.label ||
                        "Notification"}
                    </span>

                  </div>


                  {/* Delete Button */}

                  <div className="clb-notification-card__actions">

                    <button
                      type="button"
                      className="clb-notification-card__delete"
                      onClick={(event) =>
                        deleteNotification(
                          event,
                          notification.id
                        )
                      }
                      aria-label="Delete notification"
                      title="Delete notification"
                    >
                      <Trash2 size={17} />
                    </button>

                  </div>


                  {/* Unread Dot */}

                  {notification.unread && (

                    <span
                      className="clb-notification-card__unread"
                      aria-label="Unread"
                    />

                  )}

                </article>

              );
            }
          )

        )}

      </section>

    </div>
  );
}

export default Notifications;