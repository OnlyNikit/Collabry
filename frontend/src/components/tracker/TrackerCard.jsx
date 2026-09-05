import "./TrackerCard.css";

const STATUS_META = {
new_inquiry: {
emoji: "📩",
label: "New Inquiry",
},
interested: {
emoji: "👋",
label: "Interested",
},
negotiation: {
emoji: "💬",
label: "Negotiation",
},
proposal_sent: {
emoji: "📤",
label: "Proposal Sent",
},
awaiting_reply: {
emoji: "⏳",
label: "Awaiting Reply",
},

follow_up_due: {
emoji: "🔴",
label: "Follow-up Due",
},
deal_confirmed: {
emoji: "🤝",
label: "Deal Confirmed",
},
content_in_progress: {
emoji: "🎬",
label: "Content In Progress",
},
content_submitted: {
emoji: "📨",
label: "Content Submitted",
},
revision_required: {
emoji: "🔄",
label: "Revision Required",
},
awaiting_approval: {
emoji: "👀",
label: "Awaiting Approval",
},
campaign_live: {
emoji: "🚀",
label: "Campaign Live",
},
completed: {
emoji: "✅",
label: "Completed",
},
declined: {
emoji: "❌",
label: "Declined",
},
};

const PRIORITY_META = {
high: {
label: "High Priority",
tone: "high",
},
medium: {
label: "Medium Priority",
tone: "medium",
},
low: {
label: "Low Priority",
tone: "low",
},
};

function formatDate(date) {
if (!date || date === "Not set") {
return "Not set";
}

const formattedDate = new Date(date);

if (Number.isNaN(formattedDate.getTime())) {
return "Not set";
}

return formattedDate.toLocaleDateString("en-IN", {
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
GBP: "£",
};

return symbols[currency] || "₹";
}

function TrackerCard({
tracker,
onEdit,
onDelete,
onStatusChange,
}) {
const priorityMeta =
PRIORITY_META[tracker.priority] ||
PRIORITY_META.medium;

const brandName =
tracker.brandName || "Unknown Brand";

const title =
tracker.collaborationTitle ||
"Untitled Collaboration";

return ( <article className="clb-tracker-card"> <div className="clb-tracker-card__header"> <div className="clb-tracker-card__title"> <span className="clb-tracker-card__brand">
{brandName} </span>


      <h3>{title}</h3>
    </div>

    <div className="clb-tracker-card__status-control">
      <select
        value={tracker.status || "new_inquiry"}
        onChange={(event) =>
          onStatusChange(
            tracker.id,
            event.target.value
          )
        }
        aria-label="Change tracker status"
      >
        {Object.entries(STATUS_META).map(
          ([value, meta]) => (
            <option key={value} value={value}>
              {meta.emoji} {meta.label}
            </option>
          ),
        )}
      </select>
    </div>
  </div>

  <div className="clb-tracker-card__contact">
    {tracker.contactName && (
      <span>
        👤 {tracker.contactName}
      </span>
    )}

    {tracker.email && (
      <span>
        ✉️ {tracker.email}
      </span>
    )}
  </div>

  <div className="clb-tracker-card__meta">
    <span
      className={`clb-tracker-card__priority clb-tracker-card__priority--${priorityMeta.tone}`}
    >
      <span className="clb-tracker-card__priority-dot" />
      {priorityMeta.label}
    </span>

    <span className="clb-tracker-card__date">
      📅 Follow-up:{" "}
      {formatDate(tracker.followUpDate)}
    </span>

    {tracker.deadline && (
      <span className="clb-tracker-card__date">
        ⏰ Deadline:{" "}
        {formatDate(tracker.deadline)}
      </span>
    )}
  </div>

  <div className="clb-tracker-card__payment">
    <div>
      <span className="clb-tracker-card__payment-label">
        Proposed Amount
      </span>

      <strong>
        {getCurrencySymbol(tracker.currency)}
        {Number(
          tracker.proposedAmount || 0,
        ).toLocaleString("en-IN")}
      </strong>
    </div>

    <span
      className={`clb-tracker-card__payment-status clb-tracker-card__payment-status--${
        tracker.paymentStatus || "not_discussed"
      }`}
    >
      {(tracker.paymentStatus || "not_discussed")
        .replaceAll("_", " ")}
    </span>
  </div>

  {tracker.notes && (
    <p className="clb-tracker-card__notes">
      {tracker.notes}
    </p>
  )}

  <div className="clb-tracker-card__actions">
    <button
      type="button"
      className="clb-btn clb-btn--ghost"
      onClick={() => onEdit(tracker)}
    >
      ✏ Edit
    </button>

    <button
      type="button"
      className="clb-tracker-card__delete"
      onClick={() => onDelete(tracker)}
      aria-label={`Delete ${brandName}`}
    >
      🗑
    </button>
  </div>
</article>


);
}

export default TrackerCard;
