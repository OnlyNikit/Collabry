import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import StatCard from "../../components/common/StatsCard";
import CollaborationCard from "../../components/collaborations/CollaborationCard";
import DeadlineList from "../../components/collaborations/DeadlineList";
import CollaborationForm from "../../components/collaborations/CollaborationForm";
import ComposeModal from "../../components/inbox/ComposeModal";

import { useCollaboration } from "../../context/CollaborationsContext";

import "./dashboard.css";

const currentUser = {
  name: "Nikit",
};

const stats = [
  {
    icon: "📧",
    value: 12,
    title: "Unread Emails",
    accent: "pink",
  },
  {
    icon: "⏳",
    value: 5,
    title: "Pending Replies",
    accent: "gold",
  },
  {
    icon: "🤝",
    value: 3,
    title: "Active Collaborations",
    accent: "pink",
  },
  {
    icon: "📅",
    value: 2,
    title: "Upcoming Deadlines",
    accent: "gold",
  },
];

const recentEmails = [
  {
    id: 1,
    brand: "Brand A",
    subject: "Campaign Collaboration",
    time: "2 hours ago",
  },
  {
    id: 2,
    brand: "Brand B",
    subject: "Paid Partnership Opportunity",
    time: "5 hours ago",
  },
  {
    id: 3,
    brand: "Brand C",
    subject: "Following up on our proposal",
    time: "Yesterday",
  },
];

const upcomingDeadlines = [
  {
    id: 1,
    date: "Tomorrow",
    task: "Submit Instagram Reel",
    collaboration: "Nike Campaign",
  },
  {
    id: 2,
    date: "Aug 30",
    task: "Send Draft",
    collaboration: "Boat Collaboration",
  },
];

function Dashboard() {
  const navigate = useNavigate();

  const {
    collaborations,
    createCollaboration,
    updateCollaboration,
    deleteCollaboration,
  } = useCollaboration();

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

  function handleSave(data) {
    createCollaboration(data);

    setIsFormOpen(false);

    navigate("/collaborations");
  }

  function handleStatusChange(id, status) {
    updateCollaboration(id, {
      status,
    });
  }

  function handleEdit(collaboration) {
    navigate("/collaborations");
  }

  function handleDelete(id) {
    const shouldDelete = window.confirm(
      "Are you sure you want to delete this collaboration?",
    );

    if (!shouldDelete) {
      return;
    }

    deleteCollaboration(id);
  }

  /* ========================================
     ACTIVE COLLABORATIONS
  ======================================== */

  const activeCollaborations = collaborations
    .filter(
      (collaboration) =>
        !["completed", "declined"].includes(collaboration.status),
    )
    .slice(0, 3);

  return (
    <div className="clb-dashboard">
      {/* Welcome */}

      <section className="clb-dashboard__welcome">
        <h1>Good morning, {currentUser.name} 👋</h1>

        <p>Here&rsquo;s what&rsquo;s happening with your collaborations.</p>
      </section>

      {/* Stats */}

      <section className="clb-dashboard__stats">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </section>

      {/* Top Grid */}

      <div className="clb-dashboard__grid">
        {/* Recent Emails */}

        <section className="clb-dashboard__card">
          <div className="clb-dashboard__card-header">
            <h2>Recent Emails</h2>

            <Link to="/inbox" className="clb-dashboard__link">
              View all
            </Link>
          </div>

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
        </section>

        {/* Quick Actions */}

        <section className="clb-dashboard__card">
          <h2>Quick Actions</h2>

          <div className="clb-quick-actions">
            {/* COMPOSE EMAIL */}

            <button
              type="button"
              className="clb-btn clb-btn--primary"
              onClick={openCompose}
            >
              + Compose Email
            </button>

            {/* CREATE COLLABORATION */}

            <button
              type="button"
              className="clb-btn clb-btn--ghost"
              onClick={openCreateForm}
            >
              + Create Collaboration
            </button>

            {/* VIEW INBOX */}

            <Link to="/inbox" className="clb-btn clb-btn--text">
              View Inbox
              <span>&rarr;</span>
            </Link>
          </div>
        </section>
      </div>

      {/* Active Collaborations */}

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
                key={collaboration.id}
                collaboration={collaboration}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
              />
            ))
          )}
        </div>
      </section>

      {/* Upcoming Deadlines */}

      <section className="clb-dashboard__card">
        <h2>Upcoming Deadlines</h2>

        <DeadlineList deadlines={upcomingDeadlines} />
      </section>

      {/* Create Collaboration Form */}

      <CollaborationForm
        isOpen={isFormOpen}
        onClose={closeForm}
        onSave={handleSave}
        initialValues={{}}
        isEditMode={false}
      />

      {/* Compose Email Modal */}

      <ComposeModal isOpen={isComposeOpen} onClose={closeCompose} />
    </div>
  );
}

export default Dashboard;
