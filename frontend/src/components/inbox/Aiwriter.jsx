import { useEffect, useId, useRef, useState } from "react";

import {
  generateComposeDraft,
  generateReplyDraft,
} from "../../services/aiApi";

import "./Aiwriter.css";

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "formal", label: "Formal" },
  { value: "concise", label: "Short" },
];

/* ========================================
   ICONS (inline SVG, no extra dependency)
======================================== */

function SparkleIcon() {
  return (
    <svg
      className="clb-ai-writer__icon"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2l1.9 5.6a3 3 0 0 0 1.9 1.9L21.4 11.4a.7.7 0 0 1 0 1.3l-5.6 1.9a3 3 0 0 0-1.9 1.9L12 22l-1.9-5.5a3 3 0 0 0-1.9-1.9L2.6 12.7a.7.7 0 0 1 0-1.3l5.6-1.9a3 3 0 0 0 1.9-1.9L12 2z" />
      <path d="M19 2l.6 1.7a1 1 0 0 0 .7.7L22 5l-1.7.6a1 1 0 0 0-.7.7L19 8l-.6-1.7a1 1 0 0 0-.7-.7L16 5l1.7-.6a1 1 0 0 0 .7-.7L19 2z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
    </svg>
  );
}

/**
 * Textarea ke top-right corner mein AI button + popover.
 *
 * Isse `.clb-ai-editor` wrapper ke andar, textarea ke saath rakhna hai
 * (ReplyBox / ComposeModal mein pehle se aisa hi hai, wahan koi change nahi chahiye).
 *
 * Generate dabate hi popover band ho jata hai, aur jab tak draft ban raha hai
 * `.clb-ai-editor` par "clb-ai-editor--loading" class lagti hai
 * (CSS us class se textarea ke border par rotating animation chalata hai).
 *
 * Props:
 * - mode: "compose" | "reply"
 * - emailId: reply mode mein jis mail ka reply ho raha hai
 * - getContext: () => ({ to, subject })   (compose mode)
 * - currentText: textarea ka abhi ka text (Undo ke liye)
 * - onApply: (text) => void               (generated draft textarea mein bhar do)
 * - disabled: boolean
 */
function AiWriter({
  mode = "compose",
  emailId,
  getContext,
  currentText = "",
  onApply,
  disabled = false,
}) {
  const isReply = mode === "reply";

  const inputId = useId();

  const [isOpen, setIsOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [tone, setTone] = useState("professional");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [previousText, setPreviousText] = useState(null);

  const rootRef = useRef(null);

  /* Bahar click ya Escape par popover band */
  useEffect(() => {
    if (!isOpen) return undefined;

    function handlePointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKey(event) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  /* Generating ke waqt textarea ke wrapper par loader class lagao */
  useEffect(() => {
    const editor = rootRef.current?.closest(".clb-ai-editor");

    if (!editor) return undefined;

    editor.classList.toggle("clb-ai-editor--loading", isGenerating);
    editor.setAttribute("aria-busy", String(isGenerating));

    return () => {
      editor.classList.remove("clb-ai-editor--loading");
      editor.removeAttribute("aria-busy");
    };
  }, [isGenerating]);

  async function handleGenerate() {
    if (isGenerating) return;

    const cleanInstruction = instruction.trim();

    // Naye mail mein instruction zaroori hai, reply mein optional
    if (!isReply && !cleanInstruction) {
      setError("Describe what the email should say.");
      return;
    }

    if (isReply && !emailId) {
      setError("Email ID is missing.");
      return;
    }

    setError("");
    setIsGenerating(true);

    // Popover turant band, loader textarea ke border par chalega
    setIsOpen(false);

    try {
      const draft = isReply
        ? await generateReplyDraft(emailId, {
            instruction: cleanInstruction,
            tone,
          })
        : await generateComposeDraft({
            ...(getContext?.() || {}),
            instruction: cleanInstruction,
            tone,
          });

      // Undo ke liye pehle ka text yaad rakho
      setPreviousText(currentText);

      onApply?.(draft);
    } catch (generateError) {
      console.error("AI draft failed:", generateError);

      setError(generateError.message || "Could not generate a draft.");

      // Fail hua to popover wapas kholo taaki error dikhe aur retry ho sake
      setIsOpen(true);
    } finally {
      setIsGenerating(false);
    }
  }

  function handleUndo() {
    if (previousText === null) return;

    onApply?.(previousText);

    setPreviousText(null);
  }

  function handleInputKeyDown(event) {
    // Ctrl/Cmd + Enter se generate
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleGenerate();
    }
  }

  const buttonLabel = isReply ? "Generate reply" : "Generate mail";

  return (
    <div className="clb-ai-writer" ref={rootRef}>
      <div className="clb-ai-writer__bar">
        {previousText !== null && !isGenerating && (
          <button
            type="button"
            className="clb-ai-writer__undo"
            onClick={handleUndo}
            disabled={disabled}
          >
            <UndoIcon />
            <span>Undo</span>
          </button>
        )}

        <button
          type="button"
          className={
            isGenerating
              ? "clb-ai-writer__trigger clb-ai-writer__trigger--busy"
              : "clb-ai-writer__trigger"
          }
          onClick={() => setIsOpen((open) => !open)}
          disabled={disabled || isGenerating}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-label={isGenerating ? "Writing draft" : buttonLabel}
        >
          <SparkleIcon />

          <span className="clb-ai-writer__trigger-label">
            {isGenerating ? "Writing…" : buttonLabel}
          </span>
        </button>
      </div>

      {isOpen && (
        <div
          className="clb-ai-writer__popover"
          role="dialog"
          aria-label="AI writer"
        >
          <div className="clb-ai-writer__header">
            <span className="clb-ai-writer__title">
              <SparkleIcon />
              {isReply ? "Write a reply" : "Write an email"}
            </span>

            <button
              type="button"
              className="clb-ai-writer__close"
              onClick={() => setIsOpen(false)}
              aria-label="Close"
            >
              <CloseIcon />
            </button>
          </div>

          <label className="clb-ai-writer__label" htmlFor={inputId}>
            {isReply
              ? "What should the reply say? (optional)"
              : "What should the email say?"}
          </label>

          <textarea
            id={inputId}
            className="clb-ai-writer__input"
            rows={3}
            maxLength={1000}
            placeholder={
              isReply
                ? "Leave empty and AI will read the whole thread. Or write: “Confirm the meeting on Friday”"
                : "e.g. “Ask to move tomorrow’s meeting to 4 PM, politely”"
            }
            value={instruction}
            onChange={(event) => {
              setInstruction(event.target.value);
              setError("");
            }}
            onKeyDown={handleInputKeyDown}
            autoFocus
          />

          <div className="clb-ai-writer__tones" role="group" aria-label="Tone">
            {TONES.map((item) => (
              <button
                key={item.value}
                type="button"
                className={
                  tone === item.value
                    ? "clb-ai-writer__tone clb-ai-writer__tone--active"
                    : "clb-ai-writer__tone"
                }
                onClick={() => setTone(item.value)}
                aria-pressed={tone === item.value}
              >
                {item.label}
              </button>
            ))}
          </div>

          {error && (
            <p className="clb-ai-writer__error" role="alert">
              {error}
            </p>
          )}

          <div className="clb-ai-writer__actions">
            <button
              type="button"
              className="clb-ai-writer__generate"
              onClick={handleGenerate}
            >
              <SparkleIcon />
              Generate
            </button>

            <button
              type="button"
              className="clb-ai-writer__cancel"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </button>
          </div>

          {currentText.trim() && (
            <p className="clb-ai-writer__hint">
              This replaces your current text. Undo brings it back.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default AiWriter;