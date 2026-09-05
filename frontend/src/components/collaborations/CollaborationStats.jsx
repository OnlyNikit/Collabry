import {
  BriefcaseBusiness,
  Clapperboard,
  CircleCheck,
  Wallet,
} from "lucide-react";

import "./CollaborationStats.css";

function CollaborationStats({ collaborations }) {
  const active = collaborations.filter(
    (item) =>
      !["completed", "cancelled"].includes(
        item.status
      )
  ).length;

  const inProduction = collaborations.filter(
    (item) =>
      [
        "script_pending",
        "script_ready",
        "editing",
        "revision",
      ].includes(item.status)
  ).length;

  const completed = collaborations.filter(
    (item) => item.status === "completed"
  ).length;

  const totalValue = collaborations.reduce(
    (total, item) =>
      total + (Number(item.amount) || 0),
    0
  );

  return (
    <section className="clb-collab-stats">
      <article className="clb-collab-stat">
        <div>
          <span>Active</span>
          <strong>{active}</strong>
        </div>

        <BriefcaseBusiness size={22} />
      </article>

      <article className="clb-collab-stat">
        <div>
          <span>In Production</span>
          <strong>{inProduction}</strong>
        </div>

        <Clapperboard size={22} />
      </article>

      <article className="clb-collab-stat">
        <div>
          <span>Completed</span>
          <strong>{completed}</strong>
        </div>

        <CircleCheck size={22} />
      </article>

      <article className="clb-collab-stat">
        <div>
          <span>Total Value</span>
          <strong>
            ₹{totalValue.toLocaleString("en-IN")}
          </strong>
        </div>

        <Wallet size={22} />
      </article>
    </section>
  );
}

export default CollaborationStats;