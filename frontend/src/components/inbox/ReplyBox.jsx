import { useState } from "react";
import "./ReplyBox.css";

/**
 * Props:
 * - mode: "reply" | "forward"
 * - recipient: reply recipient
 * - onSend: async ({ to, body }) => void
 * - onCancel: () => void
 * - isLoading: boolean
 */
function ReplyBox({
  mode = "reply",
  recipient,
  onSend,
  onCancel,
  isLoading = false,
}) {
  const [to, setTo] = useState("");
  const [body, setBody] = useState("");
  const [validationError, setValidationError] =
    useState(null);

  async function handleSend(event) {
    event.preventDefault();

    setValidationError(null);

    const trimmedBody = body.trim();
    const trimmedTo = to.trim();

    /* ================================
       VALIDATION
    ================================= */

    if (!trimmedBody) {
      setValidationError(
        mode === "forward"
          ? "Please add a message before forwarding."
          : "Please write a reply before sending."
      );

      return;
    }

    if (
      mode === "forward" &&
      !trimmedTo
    ) {
      setValidationError(
        "Please enter an email address."
      );

      return;
    }

    try {
      await onSend?.({
        to: trimmedTo,
        body: trimmedBody,
      });

      /*
        Clear fields only after
        successful send.
      */

      setBody("");
      setTo("");

    } catch (error) {
      console.error(
        "ReplyBox send failed:",
        error
      );
    }
  }

  function handleCancel() {
    if (isLoading) return;

    setValidationError(null);
    setBody("");
    setTo("");

    onCancel?.();
  }

  return (
    <form
      className="clb-reply-box"
      onSubmit={handleSend}
    >
      {/* ================================
          RECIPIENT
      ================================= */}

      {mode === "forward" ? (
        <div className="clb-reply-box__field">
          <label
            htmlFor="forward-to"
            className="clb-reply-box__label"
          >
            Forward to
          </label>

          <input
            id="forward-to"
            type="email"
            className="clb-reply-box__to-input"
            placeholder="name@example.com"
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
              setValidationError(null);
            }}
            disabled={isLoading}
            required
            autoFocus
          />
        </div>
      ) : (
        <div className="clb-reply-box__recipient">
          <span>
            Replying to
          </span>

          <strong>
            {recipient || "Unknown recipient"}
          </strong>
        </div>
      )}

      {/* ================================
          MESSAGE
      ================================= */}

      <div className="clb-reply-box__field">
        <label
          htmlFor="reply-body"
          className="clb-reply-box__label"
        >
          {mode === "forward"
            ? "Message"
            : "Your reply"}
        </label>

        <textarea
          id="reply-body"
          className="clb-reply-box__textarea"
          placeholder={
            mode === "forward"
              ? "Add a note..."
              : "Write your reply..."
          }
          rows={5}
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
            setValidationError(null);
          }}
          disabled={isLoading}
          autoFocus={mode === "reply"}
        />
      </div>

      {/* ================================
          ERROR
      ================================= */}

      {validationError && (
        <div
          className="clb-reply-box__error"
          role="alert"
        >
          {validationError}
        </div>
      )}

      {/* ================================
          ACTIONS
      ================================= */}

      <div className="clb-reply-box__actions">
        <button
          type="submit"
          className="clb-btn clb-btn--primary"
          disabled={isLoading}
        >
          {isLoading
            ? mode === "forward"
              ? "Forwarding..."
              : "Sending..."
            : mode === "forward"
            ? "Forward"
            : "Send Reply"}
        </button>

        <button
          type="button"
          className="clb-btn clb-btn--ghost"
          onClick={handleCancel}
          disabled={isLoading}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default ReplyBox;