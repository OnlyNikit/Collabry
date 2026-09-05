import { useState } from "react";

import { useEmails } from "../../context/EmailContext";

import "./ComposeModal.css";
import { useToast } from "../../context/ToastContext";

/**

* Props:
* * isOpen: boolean
* * onClose: () => void
    */
function ComposeModal({ isOpen, onClose }) {
  const { showToast } = useToast();
  const { sendEmail } = useEmails();

  const [to, setTo] = useState("");

  const [subject, setSubject] = useState("");

  const [body, setBody] = useState("");

  const [isSending, setIsSending] = useState(false);

  const [error, setError] = useState("");

  if (!isOpen) {
    return null;
  }

  async function handleSend(event) {
    event.preventDefault();

    if (isSending) {
      return;
    }

    setError("");

    if (!to.trim()) {
      setError("Recipient email is required");

      return;
    }

    if (!subject.trim()) {
      setError("Subject is required");

      return;
    }

    if (!body.trim()) {
      setError("Email message is required");

      return;
    }

    try {
      setIsSending(true);

      /*
    EmailContext ka existing
    API function use ho raha hai.
  */
      const response = await sendEmail({
        to: to.trim(),

        subject: subject.trim(),

        text: body.trim(),
      });

      console.log("Email sent:", response);

      /*
    Fields clear
  */
      setTo("");
      setSubject("");
      setBody("");

      /*
    Modal close
    
  */
      showToast("Email sent successfully!", "success");
      onClose();

      /*
    Global success event.
    Tumhara ToastProvider isko
    listen kar sakta hai.
  */
      window.dispatchEvent(
        new CustomEvent("clb-toast", {
          detail: {
            type: "success",
            message: "Email sent successfully!",
          },
        }),
      );
    } catch (sendError) {
      console.error("Send email error:", sendError);

      setError(sendError.message || "Failed to send email");

      /*
    Global error toast
  */
      window.dispatchEvent(
        new CustomEvent("clb-toast", {
          detail: {
            type: "error",
            message: sendError.message || "Failed to send email",
          },
        }),
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="clb-compose-backdrop" onClick={onClose}>
      <div
        className="clb-compose-modal"
        onClick={(event) => event.stopPropagation()}
      >
        {" "}
        <header
          className="
         clb-compose-modal__header
       "
        >
          {" "}
          <h2>New message </h2>
          <button
            type="button"
            className="
          clb-compose-modal__close
        "
            onClick={onClose}
            aria-label="Close"
            disabled={isSending}
          >
            ✕
          </button>
        </header>
        <form
          className="
        clb-compose-modal__form
      "
          onSubmit={handleSend}
        >
          <input
            type="email"
            placeholder="To"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            disabled={isSending}
            required
          />

          <input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            disabled={isSending}
            required
          />

          <textarea
            placeholder="
          Write your message…
        "
            rows={12}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            disabled={isSending}
            required
          />

          {error && (
            <p
              className="
            clb-compose-modal__error
          "
            >
              {error}
            </p>
          )}

          <div
            className="
          clb-compose-modal__actions
        "
          >
            <button
              type="submit"
              className="
            clb-btn
            clb-btn--primary
          "
              disabled={isSending}
            >
              {isSending ? "Sending..." : "Send"}
            </button>

            <button
              type="button"
              className="
            clb-btn
            clb-btn--ghost
          "
              onClick={onClose}
              disabled={isSending}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ComposeModal;
