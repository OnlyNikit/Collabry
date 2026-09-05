import { useState } from 'react';
import './TrackEmailModal.css';

const STATUS_OPTIONS = [
  'New',
  'Negotiating',
  'Active',
  'Content In Progress',
  'Awaiting Approval',
  'Completed',
  'Cancelled',
];

/**
 * Props:
 *  - isOpen: boolean
 *  - email: the email being tracked (used to prefill brand/campaign)
 *  - onClose: () => void
 *  - onSave: (collaborationDraft) => void
 */
function TrackEmailModal({ isOpen, email, onClose, onSave }) {
  const [brand, setBrand] = useState(email?.sender || '');
  const [campaign, setCampaign] = useState(email?.subject || '');
  const [status, setStatus] = useState('New');
  const [deadline, setDeadline] = useState('');

  if (!isOpen) return null;

  // TODO(api): replace with a real create call once Collaborations exist:
  //   POST /api/collaborations  { brand, campaign, status, deadline, sourceEmailId }
  function handleSave(event) {
    event.preventDefault();
    const draft = { brand, campaign, status, deadline, sourceEmailId: email?.id };
    console.log('TODO(api): create collaboration from email', draft);
    onSave?.(draft);
    onClose();
  }

  return (
    <div className="clb-track-backdrop" onClick={onClose}>
      <div className="clb-track-modal" onClick={(event) => event.stopPropagation()}>
        <header className="clb-track-modal__header">
          <h2>Track as collaboration</h2>
          <button
            type="button"
            className="clb-track-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <form className="clb-track-modal__form" onSubmit={handleSave}>
          <label>
            Brand
            <input
              type="text"
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              required
            />
          </label>

          <label>
            Campaign
            <input
              type="text"
              value={campaign}
              onChange={(event) => setCampaign(event.target.value)}
            />
          </label>

          <label>
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label>
            Deadline
            <input
              type="date"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
            />
          </label>

          <div className="clb-track-modal__actions">
            <button type="submit" className="clb-btn clb-btn--primary">
              Save collaboration
            </button>
            <button type="button" className="clb-btn clb-btn--ghost" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TrackEmailModal;