import { useEffect, useRef } from "react";
import { Check, X } from "lucide-react";

import { labels } from "../../data/Labels";

import "./LabelPicker.css";

function LabelPicker({
  selectedIds = [],
  onToggle,
  onClose,
}) {
  const pickerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target)
      ) {
        onClose();
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, [onClose]);

  return (
    <div
      className="clb-label-picker"
      ref={pickerRef}
    >
      <div className="clb-label-picker__header">
        <h3>Add Labels</h3>

        <button
          type="button"
          className="clb-label-picker__close"
          onClick={onClose}
          aria-label="Close label picker"
        >
          <X size={16} />
        </button>
      </div>

      <div className="clb-label-picker__list">
        {labels.length === 0 ? (
          <p className="clb-label-picker__empty">
            No labels available.
          </p>
        ) : (
          labels.map((label) => {
            const isSelected =
              selectedIds.includes(label.id);

            return (
              <button
                type="button"
                key={label.id}
                className={`clb-label-picker__item${
                  isSelected
                    ? " clb-label-picker__item--selected"
                    : ""
                }`}
                onClick={() =>
                  onToggle(label.id)
                }
              >
                <span className="clb-label-picker__label">
                  <span
                    className="clb-label-picker__dot"
                  />

                  {label.name}
                </span>

                {isSelected && (
                  <Check size={16} />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export default LabelPicker;