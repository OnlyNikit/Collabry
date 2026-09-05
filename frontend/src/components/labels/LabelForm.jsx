import { useEffect, useState } from "react";
import { X } from "lucide-react";

import "./LabelForm.css";

const COLOR_OPTIONS = [
{
value: "pink",
label: "Pink",
},
{
value: "gold",
label: "Gold",
},
{
value: "purple",
label: "Purple",
},
{
value: "blue",
label: "Blue",
},
{
value: "green",
label: "Green",
},
];

const ICON_OPTIONS = [
"🏷️",
"⭐",
"🔥",
"💼",
"🤝",
"📩",
"🎬",
"💰",
"🚀",
"📌",
];

function LabelForm({
isOpen,
onClose,
onSave,
initialValues = {},
isEditMode = false,
}) {
const [name, setName] = useState("");
const [description, setDescription] =
useState("");

const [color, setColor] =
useState("pink");

const [icon, setIcon] =
useState("🏷️");

const [error, setError] =
useState("");

useEffect(() => {
if (!isOpen) return;


setName(
  initialValues.name || ""
);

setDescription(
  initialValues.description || ""
);

setColor(
  initialValues.color || "pink"
);

setIcon(
  initialValues.icon || "🏷️"
);

setError("");


}, [
isOpen,
initialValues,
]);

if (!isOpen) {
return null;
}

function handleSubmit(event) {
event.preventDefault();


const trimmedName =
  name.trim();

if (!trimmedName) {
  setError(
    "Label name is required."
  );

  return;
}

try {
  onSave({
    name: trimmedName,
    description:
      description.trim(),
    color,
    icon,
  });

  onClose();
} catch (error) {
  setError(
    error.message ||
      "Something went wrong."
  );
}


}

return ( <div
   className="clb-label-form-backdrop"
   onClick={onClose}
 >
<div
className="clb-label-form-modal"
onClick={(event) =>
event.stopPropagation()
}
>
{/* Header */}


    <header className="clb-label-form-modal__header">
      <div>
        <p>
          Email Organization
        </p>

        <h2>
          {isEditMode
            ? "Edit Label"
            : "Create Label"}
        </h2>
      </div>

      <button
        type="button"
        className="clb-label-form-modal__close"
        onClick={onClose}
        aria-label="Close form"
      >
        <X size={20} />
      </button>
    </header>


    {/* Form */}

    <form
      className="clb-label-form"
      onSubmit={handleSubmit}
    >
      {/* Label Name */}

      <label>
        Label Name

        <input
          type="text"
          value={name}
          onChange={(event) => {
            setName(
              event.target.value
            );

            setError("");
          }}
          placeholder="e.g. Brand Deals"
          autoFocus
          required
        />
      </label>


      {/* Description */}

      <label>
        Description
        <span>
          Optional
        </span>

        <textarea
          rows="3"
          value={description}
          onChange={(event) =>
            setDescription(
              event.target.value
            )
          }
          placeholder="What emails belong in this label?"
        />
      </label>


      {/* Color */}

      <div className="clb-label-form__section">
        <h3>
          Label Color
        </h3>

        <div className="clb-label-form__colors">
          {COLOR_OPTIONS.map(
            (option) => (
              <button
                key={option.value}
                type="button"
                className={`clb-label-color clb-label-color--${option.value}${
                  color === option.value
                    ? " clb-label-color--active"
                    : ""
                }`}
                onClick={() =>
                  setColor(
                    option.value
                  )
                }
                aria-label={
                  option.label
                }
              >
                {color ===
                  option.value && "✓"}
              </button>
            )
          )}
        </div>
      </div>


      {/* Icon */}

      <div className="clb-label-form__section">
        <h3>
          Choose Icon
        </h3>

        <div className="clb-label-form__icons">
          {ICON_OPTIONS.map(
            (option) => (
              <button
                key={option}
                type="button"
                className={`clb-label-icon-option${
                  icon === option
                    ? " clb-label-icon-option--active"
                    : ""
                }`}
                onClick={() =>
                  setIcon(option)
                }
              >
                {option}
              </button>
            )
          )}
        </div>
      </div>


      {/* Error */}

      {error && (
        <p className="clb-label-form__error">
          {error}
        </p>
      )}


      {/* Actions */}

      <div className="clb-label-form__actions">
        <button
          type="button"
          className="clb-btn clb-btn--ghost"
          onClick={onClose}
        >
          Cancel
        </button>

        <button
          type="submit"
          className="clb-btn clb-btn--primary"
        >
          {isEditMode
            ? "Save Changes"
            : "Create Label"}
        </button>
      </div>
    </form>
  </div>
</div>


);
}

export default LabelForm;
