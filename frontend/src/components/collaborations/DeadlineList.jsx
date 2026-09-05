import './deadlinelist.css';

/**
 * Props:
 *  - deadlines: array of { id, date, task, collaboration }
 *    e.g. { id: 1, date: 'Tomorrow', task: 'Submit Instagram Reel', collaboration: 'Nike Campaign' }
 */
function DeadlineList({ deadlines }) {
  if (!deadlines.length) {
    return <p className="clb-deadline-list__empty">No upcoming deadlines.</p>;
  }

  return (
    <ul className="clb-deadline-list">
      {deadlines.map((deadline) => (
        <li className="clb-deadline-item" key={deadline.id}>
          <span className="clb-deadline-item__date">{deadline.date}</span>
          <div className="clb-deadline-item__body">
            <strong>{deadline.task}</strong>
            <span>{deadline.collaboration}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default DeadlineList;