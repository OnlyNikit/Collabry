import './statsCard.css';

/**
 * Reusable overview metric card — used 4x on the Dashboard
 * (Unread Emails, Pending Replies, Active Collaborations, Upcoming Deadlines)
 * but generic enough to reuse anywhere a single number + label is needed.
 *
 * Props:
 *  - icon: emoji or short symbol shown above the value
 *  - value: the headline number (string or number)
 *  - title: label under the value
 *  - accent: optional 'pink' | 'gold' to tint the icon badge (defaults to pink)
 */
function StatCard({ icon, value, title, accent = 'pink' }) {
  return (
    <div className="clb-stat-card">
      <span className={`clb-stat-card__icon clb-stat-card__icon--${accent}`}>
        {icon}
      </span>
      <strong className="clb-stat-card__value">{value}</strong>
      <span className="clb-stat-card__title">{title}</span>
    </div>
  );
}

export default StatCard;