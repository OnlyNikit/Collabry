import { Search } from "lucide-react";

import "./CollaborationFilters.css";
const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  {
    value: "script_pending",
    label: "Script Pending",
  },
  {
    value: "script_ready",
    label: "Script Ready",
  },
  {
    value: "editing",
    label: "Editing",
  },
  {
    value: "review",
    label: "Internal Review",
  },
  {
    value: "revision",
    label: "Revision Required",
  },
  {
    value: "awaiting_approval",
    label: "Awaiting Approval",
  },
  {
    value: "approved",
    label: "Approved",
  },
  {
    value: "live",
    label: "Live",
  },
  {
    value: "completed",
    label: "Completed",
  },
];

function CollaborationFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
}) {
  return (
    <section className="clb-collab-filters">
      <div className="clb-collab-search">
        <Search size={18} />

        <input
          type="search"
          value={search}
          onChange={(event) =>
            onSearchChange(event.target.value)
          }
          placeholder="Search brand, title, editor..."
        />
      </div>

      <select
        value={status}
        onChange={(event) =>
          onStatusChange(event.target.value)
        }
      >
        {STATUS_OPTIONS.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </section>
  );
}

export default CollaborationFilters;