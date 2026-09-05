import "./TrackerFilter.css";

const STATUS_OPTIONS = [
  {
    value: "all",
    label: "All Statuses",
  },

  {
    value: "new_inquiry",
    label: "📩 New Inquiry",
  },

  {
    value: "interested",
    label: "👋 Interested",
  },

  {
    value: "negotiation",
    label: "💬 Negotiation",
  },

  {
    value: "proposal_sent",
    label: "📤 Proposal Sent",
  },

  {
    value: "awaiting_reply",
    label: "⏳ Awaiting Reply",
  },

  {
    value: "deal_confirmed",
    label: "🤝 Deal Confirmed",
  },

  {
    value: "content_in_progress",
    label: "🎬 Content In Progress",
  },

  {
    value: "content_submitted",
    label: "📨 Content Submitted",
  },

  {
    value: "revision_required",
    label: "🔄 Revision Required",
  },

  {
    value: "awaiting_approval",
    label: "👀 Awaiting Approval",
  },
  { value: "follow_up_due", label: "Follow-up Due" },

  {
    value: "campaign_live",
    label: "🚀 Campaign Live",
  },

  {
    value: "completed",
    label: "✅ Completed",
  },

  {
    value: "declined",
    label: "❌ Declined",
  },
  
];

const PRIORITY_OPTIONS = [
  {
    value: "all",
    label: "All Priorities",
  },

  {
    value: "high",
    label: "🔴 High Priority",
  },

  {
    value: "medium",
    label: "🟡 Medium Priority",
  },

  {
    value: "low",
    label: "⚪ Low Priority",
  },
];

function TrackerFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
}) {
  return (
    <section className="clb-tracker-filters">
      <div className="clb-tracker-filters__search">
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search brand, contact or collaboration..."
          aria-label="Search trackers"
        />
      </div>

      <div className="clb-tracker-filters__selects">
        <select
          value={status}
          onChange={(event) => onStatusChange(event.target.value)}
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={priority}
          onChange={(event) => onPriorityChange(event.target.value)}
          aria-label="Filter by priority"
        >
          {PRIORITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}

export default TrackerFilters;
