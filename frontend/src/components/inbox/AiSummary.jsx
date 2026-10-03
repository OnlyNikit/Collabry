import { useEffect, useRef, useState } from "react";

import "./AiSummary.css";

/* ========================================
   HOOK

   fetcher:  () => Promise<{ summary }>
   resetKey: badalte hi summary reset ho jata hai
             (email / message change hone par)
======================================== */

export function useAiSummary(fetcher, resetKey) {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isVisible, setIsVisible] = useState(false);

  // Purani request ka result naye email par na lage
  const requestRef = useRef(0);

  useEffect(() => {
    requestRef.current += 1;

    setSummary(null);
    setError("");
    setIsLoading(false);
    setIsVisible(false);
  }, [resetKey]);

  async function toggleSummary() {
    if (isLoading) return;

    // Summary pehle se bana hua hai: bas show / hide
    if (summary) {
      setIsVisible((visible) => !visible);
      return;
    }

    const requestId = ++requestRef.current;

    setError("");
    setIsLoading(true);
    setIsVisible(true);

    try {
      const result = await fetcher();

      if (requestId !== requestRef.current) return;

      setSummary(result.summary);
    } catch (summaryError) {
      if (requestId !== requestRef.current) return;

      console.error("AI summary failed:", summaryError);

      setError(summaryError.message || "Could not generate summary.");
    } finally {
      if (requestId === requestRef.current) {
        setIsLoading(false);
      }
    }
  }

  function closeSummary() {
    setIsVisible(false);
    setError("");
  }

  return {
    summary,
    isLoading,
    error,
    isVisible,
    toggleSummary,
    closeSummary,
  };
}

/* ========================================
   BUTTON

   - Badi screen: icon + label
   - Chhoti screen (<= 640px): sirf icon (CSS se)
   - `hint` diya ho to chhoti screen par kuch der
     ke liye button ke neeche ek chhota pop-up aata hai
     (ek session mein sirf ek baar)
======================================== */

const HINT_MEDIA_QUERY = "(max-width: 640px)";
const HINT_STORAGE_PREFIX = "clb-summarize-hint-seen:";

const HINT_DELAY_MS = 800;
const HINT_VISIBLE_MS = 4500;

/*
  Hint ko `position: fixed` se dikhate hain taaki parent ke
  overflow / header ki wajah se kate nahi. Button ki jagah se
  top/right nikaal kar screen ke andar clamp karte hain.
*/
function getHintPosition(button) {
  if (!button || typeof window === "undefined") return null;

  const rect = button.getBoundingClientRect();

  const viewportWidth =
    document.documentElement.clientWidth || window.innerWidth;

  const margin = 8;

  const right = Math.max(margin, viewportWidth - rect.right);

  const buttonCenterFromRight = viewportWidth - rect.right + rect.width / 2;

  return {
    top: rect.bottom + 10,
    right,
    maxWidth: Math.min(220, viewportWidth - margin * 2),
    // Teer button ke theek neeche rahe
    arrow: Math.max(12, buttonCenterFromRight - right - 5),
  };
}

export function SummarizeButton({
  state,
  disabled = false,
  size = "md",
  title = "Summarize with AI",
  hint = "",
  hintKey = "default",
}) {
  const { summary, isLoading, isVisible, toggleSummary } = state;

  const [showHint, setShowHint] = useState(false);
  const [hintPos, setHintPos] = useState(null);

  const buttonRef = useRef(null);

  /*
    Hint har email ke liye PEHLI BAAR us email ke khulne par aata hai
    (hintKey = email id). Same email dobara kholo to dobara nahi aata.
    Thread load hone ke baad (button enabled hone par) hi dikhta hai.
  */
  useEffect(() => {
    setShowHint(false);

    if (!hint || disabled) return undefined;

    if (typeof window === "undefined" || !window.matchMedia) {
      return undefined;
    }

    // Hint sirf chhoti screen par (badi screen par label dikhta hai)
    if (!window.matchMedia(HINT_MEDIA_QUERY).matches) {
      return undefined;
    }

    const storageKey = `${HINT_STORAGE_PREFIX}${hintKey}`;

    // Is email ke liye pehle dikha chuke hain?
    try {
      if (sessionStorage.getItem(storageKey)) {
        return undefined;
      }
    } catch {
      /* storage available nahi, to bas dikha do */
    }

    const showTimer = setTimeout(() => {
      setHintPos(getHintPosition(buttonRef.current));
      setShowHint(true);

      try {
        sessionStorage.setItem(storageKey, "1");
      } catch {
        /* ignore */
      }
    }, HINT_DELAY_MS);

    const hideTimer = setTimeout(() => {
      setShowHint(false);
    }, HINT_DELAY_MS + HINT_VISIBLE_MS);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [hint, hintKey, disabled]);

  /* Hint dikhte waqt resize / scroll par button ke saath jagah update */
  useEffect(() => {
    if (!showHint) return undefined;

    function handleResize() {
      setHintPos(getHintPosition(buttonRef.current));
    }

    function handleScroll() {
      setHintPos(getHintPosition(buttonRef.current));
    }

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [showHint]);

  let label = "Summarize";

  if (isLoading) label = "Summarizing…";
  else if (summary && isVisible) label = "Hide summary";
  else if (summary) label = "Show summary";

  function handleClick() {
    setShowHint(false);
    toggleSummary();
  }

  return (
    <span className="clb-summarize-wrap">
      <button
        ref={buttonRef}
        type="button"
        className={[
          "clb-summarize-btn",
          size === "sm" ? "clb-summarize-btn--sm" : "",
          isLoading ? "clb-summarize-btn--busy" : "",
          showHint ? "clb-summarize-btn--hinted" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={handleClick}
        disabled={disabled || isLoading}
        title={title}
        aria-label={label}
        aria-busy={isLoading}
      >
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 2l1.9 5.6a3 3 0 0 0 1.9 1.9L21.4 11.4a.7.7 0 0 1 0 1.3l-5.6 1.9a3 3 0 0 0-1.9 1.9L12 22l-1.9-5.5a3 3 0 0 0-1.9-1.9L2.6 12.7a.7.7 0 0 1 0-1.3l5.6-1.9a3 3 0 0 0 1.9-1.9L12 2z" />
        </svg>

        <span className="clb-summarize-btn__label">{label}</span>
      </button>

      {showHint && hint && hintPos && (
        <span
          className="clb-summarize-hint"
          role="status"
          style={{
            top: hintPos.top,
            right: hintPos.right,
            maxWidth: hintPos.maxWidth,
            "--clb-hint-arrow": `${hintPos.arrow}px`,
          }}
        >
          {hint}
        </span>
      )}
    </span>
  );
}

/* ========================================
   PANEL
======================================== */

function Section({ title, children }) {
  return (
    <div className="clb-summary__section">
      <h4 className="clb-summary__heading">{title}</h4>
      {children}
    </div>
  );
}

function List({ items }) {
  return (
    <ul className="clb-summary__list">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

export function SummaryPanel({ state, title = "AI summary" }) {
  const { summary, isLoading, error, isVisible, toggleSummary, closeSummary } =
    state;

  if (!isVisible) return null;

  return (
    <section
      className={
        isLoading ? "clb-summary clb-summary--loading" : "clb-summary"
      }
      aria-live="polite"
      aria-busy={isLoading}
    >
      <div className="clb-summary__top">
        <span className="clb-summary__title">{title}</span>

        <button
          type="button"
          className="clb-summary__close"
          onClick={closeSummary}
          aria-label="Hide summary"
        >
          ✕
        </button>
      </div>

      {isLoading && (
        <div className="clb-summary__loading">
          <p className="clb-summary__status">Reading and summarizing…</p>

          <span className="clb-summary__skeleton" />
          <span className="clb-summary__skeleton clb-summary__skeleton--mid" />
          <span className="clb-summary__skeleton clb-summary__skeleton--short" />
        </div>
      )}

      {error && !isLoading && (
        <div className="clb-summary__error" role="alert">
          <span>{error}</span>

          <button type="button" onClick={toggleSummary}>
            Retry
          </button>
        </div>
      )}

      {summary && !isLoading && (
        <>
          {summary.overview && (
            <p className="clb-summary__overview">{summary.overview}</p>
          )}

          {summary.keyPoints?.length > 0 && (
            <Section title="Key points">
              <List items={summary.keyPoints} />
            </Section>
          )}

          {summary.decisions?.length > 0 && (
            <Section title="Decisions">
              <List items={summary.decisions} />
            </Section>
          )}

          {summary.actionItems?.length > 0 && (
            <Section title="Action items">
              <ul className="clb-summary__list">
                {summary.actionItems.map((item, index) => (
                  <li key={index}>
                    {item.task}

                    {(item.owner || item.deadline) && (
                      <span className="clb-summary__meta">
                        {item.owner && ` · ${item.owner}`}
                        {item.deadline && ` · by ${item.deadline}`}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {summary.deadlines?.length > 0 && (
            <Section title="Deadlines">
              <List items={summary.deadlines} />
            </Section>
          )}

          {summary.participants?.length > 0 && (
            <Section title="Participants">
              <p className="clb-summary__participants">
                {summary.participants.join(", ")}
              </p>
            </Section>
          )}
        </>
      )}
    </section>
  );
}