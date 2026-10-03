import { useState } from "react";

import { useEmails } from "../../context/EmailContext";

import AttachmentPicker from "./Attachmentpicker";
import AiWriter from "./Aiwriter";

import "./ComposeModal.css";

/**
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 */
function ComposeModal({ isOpen, onClose }) {
  /*
    Success / error toast EmailContext ka sendEmail khud dikhata hai,
    isliye yahan alag se toast nahi dikhana (warna double toast aayega).
  */
  const { sendEmail } = useEmails();

  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) {
    return null;
  }

  function resetForm() {
    setTo("");
    setSubject("");
    setBody("");
    setAttachments([]);
    setError("");
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

    if (!body.trim() && attachments.length === 0) {
      setError("Email message is required");
      return;
    }

    try {
      setIsSending(true);

      await sendEmail({
        to: to.trim(),
        subject: subject.trim(),
        text: body.trim(),
        attachments,
      });

      resetForm();
      onClose();
    } catch (sendError) {
      console.error("Send email error:", sendError);

      setError(sendError.message || "Failed to send email");
    } finally {
      setIsSending(false);
    }
  }

  function handleClose() {
    if (isSending) return;

    onClose();
  }

  return (
    <div className="clb-compose-backdrop" onClick={handleClose}>
      <div
        className="clb-compose-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="clb-compose-modal__header">
          <h2>New message</h2>

          <button
            type="button"
            className="clb-compose-modal__close"
            onClick={handleClose}
            aria-label="Close"
            disabled={isSending}
          >
            ✕
          </button>
        </header>

        <form className="clb-compose-modal__form" onSubmit={handleSend}>
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

          <div className="clb-ai-editor">
            <textarea
              placeholder="Write your message…"
              rows={12}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              disabled={isSending}
              required={attachments.length === 0}
            />

            <AiWriter
              mode="compose"
              getContext={() => ({
                to: to.trim(),
                subject: subject.trim(),
              })}
              currentText={body}
              onApply={setBody}
              disabled={isSending}
            />
          </div>

          <AttachmentPicker
            files={attachments}
            onChange={setAttachments}
            onError={setError}
            disabled={isSending}
          />

          {error && <p className="clb-compose-modal__error">{error}</p>}

          <div className="clb-compose-modal__actions">
            <button
              type="submit"
              className="clb-btn clb-btn--primary"
              disabled={isSending}
            >
              {isSending ? "Sending..." : "Send"}
            </button>

            <button
              type="button"
              className="clb-btn clb-btn--ghost"
              onClick={handleClose}
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