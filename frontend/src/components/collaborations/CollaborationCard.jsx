import { CalendarDays, Pencil, Trash2, UserRound, Wallet } from "lucide-react";

import "./collaborationcard.css";

const STATUS_OPTIONS = [
  {
    value: "script_pending",
    label: "📝 Script Pending",
  },

  {
    value: "script_ready",
    label: "✍️ Script Ready",
  },

  {
    value: "editing",
    label: "🎬 Editing",
  },

  {
    value: "review",
    label: "👀 Internal Review",
  },

  {
    value: "revision",
    label: "🔄 Revision Required",
  },

  {
    value: "awaiting_approval",
    label: "⏳ Awaiting Approval",
  },

  {
    value: "approved",
    label: "✅ Approved",
  },

  {
    value: "live",
    label: "🚀 Live",
  },

  {
    value: "completed",
    label: "🏁 Completed",
  },
];

function formatDate(date) {
  if (!date) {
    return "Not set";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Not set";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getCurrencySymbol(currency) {
  const symbols = {
    INR: "₹",

    USD: "$",

    EUR: "€",
  };

  return symbols[currency] || "₹";
}

function CollaborationCard({
  collaboration,

  onEdit,

  onDelete,

  onStatusChange,
}) {
  if (!collaboration) {
    return null;
  }

  const collaborationId = collaboration.id || collaboration._id;

  return (
    <article className="clb-collaboration-card">
      {/* HEADER */}

      <div className="clb-collaboration-card__header">
        <div>
          <span className="clb-collaboration-card__brand">
            {collaboration.brandName || "Unknown Brand"}
          </span>

          <h2>{collaboration.title || "Untitled Collaboration"}</h2>
        </div>

        <select
          className="clb-collaboration-card__status"
          value={collaboration.status || "script_pending"}
          onChange={(event) =>
            onStatusChange(collaborationId, event.target.value)
          }
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* DETAILS */}

      <div className="clb-collaboration-card__details">
        <div>
          <UserRound size={16} />

          <span>Editor: {collaboration.editor || "Not assigned"}</span>
        </div>

        <div>
          <CalendarDays size={16} />

          <span>Deadline: {formatDate(collaboration.deadline)}</span>
        </div>

        <div>
          <Wallet size={16} />

          <span>
            {getCurrencySymbol(collaboration.currency)}

            {Number(collaboration.amount || 0).toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      {/* FOOTER */}

      <div className="clb-collaboration-card__footer">
        <div className="clb-collaboration-card__tags">
          <span className="clb-collab-tag">
            {collaboration.platform || "Not set"}
          </span>
          <span
            className={`clb-collab-priority clb-collab-priority--${
              collaboration.priority || "medium"
            }`}
          >
            <span className="clb-collab-priority__dot" />

            {`${(collaboration.priority || "medium").charAt(0).toUpperCase()}${(
              collaboration.priority || "medium"
            ).slice(1)} Priority`}
          </span>

          <span
            className={`clb-collab-payment clb-collab-payment--${
              collaboration.paymentStatus || "not_discussed"
            }`}
          >
            {(collaboration.paymentStatus || "not_discussed").replaceAll(
              "_",
              " ",
            )}
          </span>
        </div>

        <div className="clb-collaboration-card__actions">
          <button type="button" onClick={() => onEdit(collaboration)}>
            <Pencil size={17} />
            Edit
          </button>

          <button
            type="button"
            className="clb-collaboration-card__delete"
            onClick={() => onDelete(collaborationId)}
            aria-label="Delete collaboration"
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>
    </article>
  );
}

export default CollaborationCard;
