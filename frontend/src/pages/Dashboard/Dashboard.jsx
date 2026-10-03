import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

import StatCard from "../../components/common/StatsCard";
import CollaborationCard from "../../components/collaborations/CollaborationCard";
import DeadlineList from "../../components/collaborations/DeadlineList";
import CollaborationForm from "../../components/collaborations/CollaborationForm";
import ComposeModal from "../../components/inbox/ComposeModal";

import { useCollaboration } from "../../context/CollaborationsContext";
import { useEmails } from "../../context/EmailContext";
import { useAuth } from "../../context/AuthContext"; // path/hook apne project ke hisaab se badlo

import "./dashboard.css";

/* =========================================================
   HELPERS
========================================================= */

const getCollaborationId = (collaboration) =>
  collaboration?._id || collaboration?.id || "";

const getEmailId = (email) => email?.id || email?.messageId || "";

const getEmailTimestamp = (email) => {
  if (email?.timestamp) {
    const timestamp = Number(email.timestamp);

    if (Number.isFinite(timestamp) && timestamp > 0) {
      return timestamp;
    }
  }

  if (email?.internalDate) {
    const internalDate = Number(email.internalDate);

    if (Number.isFinite(internalDate) && internalDate > 0) {
      return internalDate;
    }
  }

  if (email?.date) {
    const date = new Date(email.date).getTime();

    if (!Number.isNaN(date)) {
      return date;
    }
  }

  return 0;
};

const getEmailSenderName = (email) => {
  if (email?.from && typeof email.from === "object") {
    return email.from.name || email.from.email || "Unknown Sender";
  }

  return email?.sender || email?.senderName || email?.from || "Unknown Sender";
};

const getEmailSenderEmail = (email) => {
  if (email?.from && typeof email.from === "object") {
    return email.from.email || "";
  }

  return email?.senderEmail || "";
};

const formatRelativeTime = (timestamp) => {
  if (!timestamp) {
    return "";
  }

  const now = Date.now();
  const difference = now - timestamp;

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (difference < minute) {
    return "Just now";
  }

  if (difference < hour) {
    const minutes = Math.floor(difference / minute);
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  }

  if (difference < day) {
    const hours = Math.floor(difference / hour);
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }

  if (difference < 7 * day) {
    const days = Math.floor(difference / day);
    return `${days} ${days === 1 ? "day" : "days"} ago`;
  }

  return new Date(timestamp).toLocaleDateString();
};

const getDeadlineTimestamp = (collaboration) => {
  if (!collaboration?.deadline) {
    return 0;
  }

  const timestamp = new Date(collaboration.deadline).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const formatDeadlineDate = (deadline) => {
  if (!deadline) {
    return "";
  }

  const timestamp = new Date(deadline).getTime();

  if (Number.isNaN(timestamp)) {
    return String(deadline);
  }

  const now = new Date();
  const deadlineDate = new Date(timestamp);

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const tomorrowStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );

  const deadlineDayStart = new Date(
    deadlineDate.getFullYear(),
    deadlineDate.getMonth(),
    deadlineDate.getDate(),
  );

  if (deadlineDayStart.getTime() === todayStart.getTime()) {
    return "Today";
  }

  if (deadlineDayStart.getTime() === tomorrowStart.getTime()) {
    return "Tomorrow";
  }

  return deadlineDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

/* ---------- Greeting helpers ---------- */

const getFullName = (user) => {
  const name =
    user?.name ||
    user?.displayName ||
    user?.fullName ||
    (user?.email ? user.email.split("@")[0] : "");

  return String(name).trim() || "there";
};

const getGreeting = (hour) => {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Good night";
};

/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard() {
  const navigate = useNavigate();

  /* ========================================
     DYNAMIC GREETING (time + user name)
  ======================================== */

  const { user } = useAuth();

  const [currentHour, setCurrentHour] = useState(new Date().getHours());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const fullName = getFullName(user);
  const greeting = getGreeting(currentHour);

  const {
    collaborations = [],
    createCollaboration,
    updateCollaboration,
    deleteCollaboration,
  } = useCollaboration();

  const { emails = [], unreadCount = 0, loading: emailsLoading } = useEmails();

  /* ========================================
     COLLABORATION FORM
  ======================================== */

  const [isFormOpen, setIsFormOpen] = useState(false);

  /* ========================================
     COMPOSE EMAIL MODAL
  ======================================== */

  const [isComposeOpen, setIsComposeOpen] = useState(false);

  function openCompose() {
    setIsComposeOpen(true);
  }

  function closeCompose() {
    setIsComposeOpen(false);
  }

  /* ========================================
     COLLABORATION FUNCTIONS
  ======================================== */

  function openCreateForm() {
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
  }

  async function handleSave(data) {
    try {
      await createCollaboration(data);

      setIsFormOpen(false);

      navigate("/collaborations");
    } catch (error) {
      console.error("Failed to create collaboration:", error);
    }
  }

  async function handleStatusChange(id, status) {
    try {
      await updateCollaboration(id, {
        status,
      });
    } catch (error) {
      console.error("Failed to update collaboration status:", error);
    }
  }

  function handleEdit() {
    navigate("/collaborations");
  }

  async function handleDelete(id) {
    const shouldDelete = window.confirm(
      "Are you sure you want to delete this collaboration?",
    );

    if (!shouldDelete) {
      return;
    }

    try {
      await deleteCollaboration(id);
    } catch (error) {
      console.error("Failed to delete collaboration:", error);
    }
  }

  /* ========================================
     ACTIVE COLLABORATIONS
  ======================================== */

  const activeCollaborations = useMemo(
    () =>
      collaborations
        .filter(
          (collaboration) =>
            !["completed", "declined", "cancelled", "canceled"].includes(
              String(collaboration?.status || "").toLowerCase(),
            ),
        )
        .slice(0, 3),
    [collaborations],
  );

  /* ========================================
     RECENT EMAILS
  ======================================== */

  const recentEmails = useMemo(() => {
    return [...emails]
      .filter((email) => Boolean(getEmailId(email)))
      .sort((a, b) => getEmailTimestamp(b) - getEmailTimestamp(a))
      .slice(0, 3)
      .map((email) => ({
        id: getEmailId(email),
        brand: getEmailSenderName(email),
        senderEmail: getEmailSenderEmail(email),
        subject: email?.subject || "(No subject)",
        time: formatRelativeTime(getEmailTimestamp(email)),
      }));
  }, [emails]);

  /* ========================================
     PENDING REPLIES

     Received unread inbox emails are treated
     as pending replies.
  ======================================== */

  const pendingReplies = useMemo(
    () =>
      emails.filter((email) => {
        const labels = Array.isArray(email?.labels) ? email.labels : [];

        const isInbox = labels.includes("INBOX");
        const isUnread = email?.unread === true || email?.isRead === false;
        const isSent = labels.includes("SENT");
        const isTrash = labels.includes("TRASH");

        return isInbox && isUnread && !isSent && !isTrash;
      }).length,
    [emails],
  );

  /* ========================================
     UPCOMING DEADLINES
  ======================================== */

  const upcomingDeadlines = useMemo(() => {
    const now = Date.now();

    return collaborations
      .filter((collaboration) => {
        const status = String(collaboration?.status || "").toLowerCase();
        const deadline = getDeadlineTimestamp(collaboration);

        if (!deadline || deadline < now) {
          return false;
        }

        return !["completed", "declined", "cancelled", "canceled"].includes(
          status,
        );
      })
      .sort((a, b) => getDeadlineTimestamp(a) - getDeadlineTimestamp(b))
      .slice(0, 3)
      .map((collaboration) => ({
        id: getCollaborationId(collaboration),

        date: formatDeadlineDate(collaboration.deadline),

        task:
          collaboration?.task ||
          collaboration?.deliverable ||
          collaboration?.title ||
          "Collaboration deadline",

        collaboration:
          collaboration?.name ||
          collaboration?.brand ||
          collaboration?.company ||
          collaboration?.title ||
          "Collaboration",
      }));
  }, [collaborations]);

  /* ========================================
     DASHBOARD STATS
  ======================================== */

  const stats = useMemo(
    () => [
      {
        icon: "📧",
        value: unreadCount,
        title: "Unread Emails",
        accent: "pink",
      },
      {
        icon: "⏳",
        value: pendingReplies,
        title: "Pending Replies",
        accent: "gold",
      },
      {
        icon: "🤝",
        value: activeCollaborations.length,
        title: "Active Collaborations",
        accent: "pink",
      },
      {
        icon: "📅",
        value: upcomingDeadlines.length,
        title: "Upcoming Deadlines",
        accent: "gold",
      },
    ],
    [
      unreadCount,
      pendingReplies,
      activeCollaborations.length,
      upcomingDeadlines.length,
    ],
  );

  return (
    <div className="clb-dashboard">
      {/* ========================================
          WELCOME
      ======================================== */}

      <section className="clb-dashboard__welcome">
        <h1>
          {greeting}, {fullName} 👋
        </h1>

        <p>Here&rsquo;s what&rsquo;s happening with your collaborations.</p>
      </section>

      {/* ========================================
          STATS
      ======================================== */}

      <section className="clb-dashboard__stats">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </section>

      {/* ========================================
          TOP GRID
      ======================================== */}

      <div className="clb-dashboard__grid">
        {/* RECENT EMAILS */}

        <section className="clb-dashboard__card">
          <div className="clb-dashboard__card-header">
            <h2>Recent Emails</h2>

            <Link to="/inbox" className="clb-dashboard__link">
              View all
            </Link>
          </div>

          {emailsLoading && recentEmails.length === 0 ? (
            <p className="clb-dashboard__empty">Loading emails...</p>
          ) : recentEmails.length === 0 ? (
            <p className="clb-dashboard__empty">No recent emails.</p>
          ) : (
            <ul className="clb-recent-emails">
              {recentEmails.map((email) => (
                <li className="clb-recent-emails__item" key={email.id}>
                  <div>
                    <strong>{email.brand}</strong>

                    <span>{email.subject}</span>
                  </div>

                  <span className="clb-recent-emails__time">{email.time}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* QUICK ACTIONS */}

        <section className="clb-dashboard__card">
          <h2>Quick Actions</h2>

          <div className="clb-quick-actions">
            <button
              type="button"
              className="clb-btn clb-btn--primary"
              onClick={openCompose}
            >
              + Compose Email
            </button>

            <button
              type="button"
              className="clb-btn clb-btn--ghost"
              onClick={openCreateForm}
            >
              + Create Collaboration
            </button>

            <Link to="/inbox" className="clb-btn clb-btn--text">
              View Inbox
              <span>&rarr;</span>
            </Link>
          </div>
        </section>
      </div>

      {/* ========================================
          ACTIVE COLLABORATIONS
      ======================================== */}

      <section className="clb-dashboard__card">
        <div className="clb-dashboard__card-header">
          <h2>Active Collaborations</h2>

          <Link to="/collaborations" className="clb-dashboard__link">
            View all
          </Link>
        </div>

        <div className="clb-dashboard__collab-list">
          {activeCollaborations.length === 0 ? (
            <p className="clb-dashboard__empty">No active collaborations.</p>
          ) : (
            activeCollaborations.map((collaboration) => (
              <CollaborationCard
                key={getCollaborationId(collaboration)}
                collaboration={collaboration}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
              />
            ))
          )}
        </div>
      </section>

      {/* ========================================
          UPCOMING DEADLINES
      ======================================== */}

      <section className="clb-dashboard__card">
        <h2>Upcoming Deadlines</h2>

        {upcomingDeadlines.length === 0 ? (
          <p className="clb-dashboard__empty">No upcoming deadlines.</p>
        ) : (
          <DeadlineList deadlines={upcomingDeadlines} />
        )}
      </section>

      {/* ========================================
          CREATE COLLABORATION FORM
      ======================================== */}

      <CollaborationForm
        isOpen={isFormOpen}
        onClose={closeForm}
        onSave={handleSave}
        initialValues={{}}
        isEditMode={false}
      />

      {/* ========================================
          COMPOSE EMAIL MODAL
      ======================================== */}

      <ComposeModal isOpen={isComposeOpen} onClose={closeCompose} />
    </div>
  );
}

export default Dashboard;
