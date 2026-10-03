import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";
import "./DeleteModal.css";

function DeleteModal({
  isOpen,
  title = "Delete this item?",
  description = "This action cannot be undone.",
  confirmText = "Delete",
  loadingText = "Deleting...",
  isDeleting = false,
  error = null,
  onClose,
  onConfirm,
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isDeleting) {
        onClose?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (event) => {
    if (
      event.target === event.currentTarget &&
      !isDeleting
    ) {
      onClose?.();
    }
  };

  const modal = (
    <div
      className="clb-delete-modal-backdrop"
      onMouseDown={handleBackdropClick}
      role="presentation"
    >
      <div
        className="clb-delete-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="clb-delete-modal-title"
        aria-describedby="clb-delete-modal-description"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="clb-delete-modal__close"
          onClick={onClose}
          disabled={isDeleting}
          aria-label="Close"
        >
          <X size={18} strokeWidth={2} />
        </button>

        <div className="clb-delete-modal__icon">
          <AlertTriangle
            size={27}
            strokeWidth={2.2}
          />
        </div>

        <div className="clb-delete-modal__body">
          <h2
            id="clb-delete-modal-title"
            className="clb-delete-modal__title"
          >
            {title}
          </h2>

          <p
            id="clb-delete-modal-description"
            className="clb-delete-modal__text"
          >
            {description}
          </p>

          {error && (
            <div className="clb-delete-modal__error">
              <AlertTriangle size={16} />

              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="clb-delete-modal__actions">
          <button
            type="button"
            className="clb-delete-modal__cancel"
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
            {isDeleting ? (
              <>
                <span className="clb-delete-modal__spinner" />
                <span>{loadingText}</span>
              </>
            ) : (
              <>
                <span>{confirmText}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

export default DeleteModal;