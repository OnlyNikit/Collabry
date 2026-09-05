import './EmailToolbar.css';

/**
 * Props:
 *  - onCompose: () => void — opens ComposeModal
 *  - searchValue / onSearchChange: controlled search input (optional)
 */
function EmailToolbar({ onCompose, searchValue = '', onSearchChange }) {
  return (
    <div className="clb-email-toolbar">
      <button type="button" className="clb-btn clb-btn--primary" onClick={onCompose}>
        + Compose
      </button>
      <div className="clb-email-toolbar__search">
        <span aria-hidden="true">🔍</span>
        <input
          type="search"
          placeholder="Search mail"
          value={searchValue}
          // TODO(api): filter against real Gmail data once wired up;
          // for now this can stay uncontrolled if onSearchChange isn't passed.
          onChange={(event) => onSearchChange?.(event.target.value)}
        />
      </div>
    </div>
  );
}

export default EmailToolbar;