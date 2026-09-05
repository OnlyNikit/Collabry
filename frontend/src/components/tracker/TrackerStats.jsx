import "./TrackerStats.css";

function TrackerStats({ trackers }) {
const total = trackers.length;

const awaitingReply = trackers.filter((tracker) =>
[
"awaiting_reply",
"waiting_for_reply",
].includes(tracker.status),
).length;

const followUps = trackers.filter((tracker) => {
// Manually selected Follow-up Due status
if (tracker.status === "follow_up_due") {
return true;
}


if (
  !tracker.followUpDate ||
  tracker.followUpDate === "Not set"
) {
  return false;
}

const followUpDate = new Date(
  tracker.followUpDate,
);

const today = new Date();

if (Number.isNaN(followUpDate.getTime())) {
  return false;
}

followUpDate.setHours(0, 0, 0, 0);
today.setHours(0, 0, 0, 0);

return (
  followUpDate <= today &&
  !["completed", "declined"].includes(
    tracker.status,
  )
);


}).length;

const active = trackers.filter(
(tracker) =>
!["completed", "declined"].includes(
tracker.status,
),
).length;

const completed = trackers.filter(
(tracker) =>
tracker.status === "completed",
).length;

const stats = [
{
icon: "📋",
value: total,
label: "Total Trackers",
},
{
icon: "⏳",
value: awaitingReply,
label: "Awaiting Reply",
},
{
icon: "🔔",
value: followUps,
label: "Follow-ups Due",
},
{
icon: "🤝",
value: active,
label: "Active",
},
{
icon: "✅",
value: completed,
label: "Completed",
},
];

return ( <section className="clb-tracker-stats">
{stats.map((stat) => ( <article
       key={stat.label}
       className="clb-tracker-stats__card"
     > <span className="clb-tracker-stats__icon">
{stat.icon} </span>


      <div>
        <strong>{stat.value}</strong>
        <span>{stat.label}</span>
      </div>
    </article>
  ))}
</section>


);
}

export default TrackerStats;
