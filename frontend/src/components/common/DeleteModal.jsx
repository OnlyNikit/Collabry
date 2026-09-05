
import "./DeleteModal.css";

function DeleteTrackerModal({
  isOpen,
  tracker,
  onClose,
  onConfirm,
  isDeleting = false,
}) {
  if (!isOpen || !tracker) {
    return null;
  }

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget && !isDeleting) {
      onClose();
    }
  }

  return (
    <div
      className="clb-delete-modal-backdrop"
      onClick={handleBackdropClick}
    >
      <div
        className="clb-delete-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        aria-describedby="delete-modal-description"
      >
        <button
          type="button"
          className="clb-delete-modal__close"
          onClick={onClose}
          disabled={isDeleting}
          aria-label="Close delete dialog"
        >
          ✕
        </button>

        <div className="clb-delete-modal__content">
          <div className="clb-delete-modal__icon">
            🗑
          </div>

          <h2 id="delete-modal-title">
            Delete Tracker?
          </h2>

          <p id="delete-modal-description">
            Are you sure you want to delete{" "}
            <strong>{tracker.brandName || "this tracker"}</strong>?
          </p>

          <span className="clb-delete-modal__warning">
            This action cannot be undone.
          </span>
        </div>

        <div className="clb-delete-modal__actions">
          <button
            type="button"
            className="clb-btn clb-btn--ghost"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>

          <button
            type="button"
            className="clb-delete-modal__confirm"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "🗑 Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteTrackerModal;

