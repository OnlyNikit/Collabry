import "./Loader..css";

/**
 * Global loader — full-viewport or inline overlay spinner, theme-matched.
 *
 * Usage (full-screen, e.g. app boot / route change):
 *   <GlobalLoader text="Loading your inbox..." />
 *
 * Usage (inline, e.g. inside a card/modal instead of full screen):
 *   <GlobalLoader inline text="Sending..." />
 *
 * Usage (no text, spinner only):
 *   <GlobalLoader />
 */
function Loader({ text = "", inline = false }) {
  return (
    <div
      className={`clb-global-loader${inline ? " clb-global-loader--inline" : ""}`}
      role="status"
      aria-live="polite"
    >
      <span className="clb-global-loader__spinner" aria-hidden="true" />

      {text ? (
        <span className="clb-global-loader__text">{text}</span>
      ) : (
        <span className="clb-sr-only">Loading</span>
      )}
    </div>
  );
}

export default Loader;