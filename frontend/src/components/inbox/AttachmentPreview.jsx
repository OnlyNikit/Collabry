import './AttachmentPreview.css';

const ICONS = {
  pdf: '📄',
  image: '🖼️',
  doc: '📝',
  sheet: '📊',
  default: '📎',
};

/**
 * Props:
 *  - attachments: array of { id, name, size, type } — type is one of
 *    'pdf' | 'image' | 'doc' | 'sheet' (anything else falls back to a
 *    generic paperclip icon)
 */
function AttachmentPreview({ attachments }) {
  if (!attachments?.length) return null;

  return (
    <div className="clb-attachments">
      <p className="clb-attachments__label">
        {attachments.length} attachment{attachments.length > 1 ? 's' : ''}
      </p>
      <div className="clb-attachments__list">
        {attachments.map((file) => (
          <button
            type="button"
            className="clb-attachment-chip"
            key={file.id}
            // TODO(api): open/download the real file once attachments are
            // backed by Google Drive / Gmail attachment URLs.
            onClick={() => console.log('TODO(api): open attachment', file)}
          >
            <span className="clb-attachment-chip__icon" aria-hidden="true">
              {ICONS[file.type] || ICONS.default}
            </span>
            <span className="clb-attachment-chip__body">
              <span className="clb-attachment-chip__name">{file.name}</span>
              <span className="clb-attachment-chip__size">{file.size}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default AttachmentPreview;