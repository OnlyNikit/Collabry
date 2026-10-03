import { useState, useMemo, useEffect, useRef } from "react";

import toast from "react-hot-toast";

import DOMPurify from "dompurify";

import { Trash2 } from "lucide-react";

import ReplyBox from "./ReplyBox";
import AttachmentPreview from "./AttachmentPreview";
import LabelPicker from "./LabelPicker";
import Loader from "../common/Loader";
import TrackerForm from "../tracker/TrackerForm";
import DeleteModal from "../common/DeleteModal";
import { SummarizeButton, SummaryPanel, useAiSummary } from "./AiSummary";

import { useTracker } from "../../context/TrackerContext";
import { useEmailLabels } from "../../context/EmailLabelsContext";
import { useEmails } from "../../context/EmailContext";

import {
  generateThreadSummary,
  generateMessageSummary,
} from "../../services/aiApi";

import "./EmailPreview.css";

/* ========================================
   SANITIZE EMAIL HTML
======================================== */

/*
  Email ke saare links naye tab mein khulein.
  rel="noopener noreferrer" security ke liye zaroori hai,
  taaki khula hua page is app ke window ko control na kar sake.
*/
function openLinksInNewTab(node) {
  if (node.tagName === "A" && node.hasAttribute("href")) {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
}

function sanitizeEmailHtml(html) {
  if (typeof html !== "string") {
    return "";
  }

  /*
    Hook sirf is sanitize call ke liye lagta hai aur turant hat jata hai,
    taaki app ke baaki DOMPurify use par asar na pade.
  */
  DOMPurify.addHook("afterSanitizeAttributes", openLinksInNewTab);

  try {
    return sanitizeWithProfile(html);
  } finally {
    DOMPurify.removeHook("afterSanitizeAttributes", openLinksInNewTab);
  }
}

function sanitizeWithProfile(html) {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: {
      html: true,
    },

    /*
      FORCE_BODY: email ke shuru ki <style> tag DOMPurify hata deta tha,
      jisse email ki responsive CSS (media queries) kho jati thi aur
      mobile par layout nahi bachta tha. Ye email ki <style> ko rakhta hai.
      Email sirf sandboxed iframe me render hota hai (scripts band),
      isliye ye safe hai.
    */
    FORCE_BODY: true,
    ADD_TAGS: ["style"],

    ADD_ATTR: [
      "target",
      "style",
      "width",
      "height",
      "align",
      "border",
      "cellpadding",
      "cellspacing",
    ],
  });
}

/* ========================================
   LINKIFY PLAIN TEXT

   Plain-text emails mein URLs clickable nahi hote.
   Ye unhe naye tab mein khulne wale links bana deta hai.
   React elements use hote hain, isliye HTML inject nahi hota.
======================================== */

const URL_PATTERN = /(https?:\/\/[^\s<>"']*[^\s<>"'.,;:!?)\]])/g;

function LinkifiedText({ text = "" }) {
  // split() capture group ke saath URLs ko odd indexes par rakhta hai
  const parts = String(text).split(URL_PATTERN);

  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <a key={index} href={part} target="_blank" rel="noopener noreferrer">
        {part}
      </a>
    ) : (
      part
    ),
  );
}

/* ========================================
   EMAIL FRAME (isolated iframe)

   HTML email ko sandboxed iframe me render karte hain
   (Gmail web bhi aisa hi karta hai). Fayde:

   1. App ki CSS email ke layout ko nahi bigad sakti
      (pehle table columns me text ek-ek letter me toot raha tha).
   2. Email ki apni <style> / media queries iframe ki width ke
      hisaab se chalti hain, isliye responsive emails chhoti
      screen par apne aap stack ho jate hain.
   3. Email ki CSS app me leak nahi hoti.

   sandbox me "allow-scripts" NAHI hai, isliye email ke andar
   koi script chal hi nahi sakti. "allow-same-origin" sirf isliye
   hai ki hum height naap sakein.

   Agar fir bhi koi fixed-width email chauda ho, to use scale
   karke width me fit kar dete hain (left-right scroll nahi).
======================================== */

/*
  Gmail app jaisa fit:

  - Responsive email (apni @media max-width CSS wali): iframe ko
    available width par render karte hain, taaki email apne aap
    mobile layout me stack ho jaye.
  - Non-responsive email (fixed 600px tables wali): pehle
    MIN_LAYOUT_WIDTH par desktop layout me render karte hain, phir
    poore iframe ko scale karke screen me fit kar dete hain. Isse
    columns kabhi 1-1 letter me nahi tootte.
*/
const MIN_LAYOUT_WIDTH = 640;

function isResponsiveHtml(html) {
  return /@media[^{]*(max|min)-(device-)?width/i.test(html || "");
}

function buildEmailDocument(html, muted = false) {
  const textColor = muted ? "#5f6368" : "#202124";

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<base target="_blank">
<style>
  html {
    background: #ffffff;
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }
  body {
    margin: 0;
    padding: 12px;
    box-sizing: border-box;
    background: #ffffff;
    color: ${textColor};
    font-family: Arial, Helvetica, sans-serif;
    font-size: 14px;
    line-height: 1.5;
  }
  /*
    "word-break: break-word" / "overflow-wrap: anywhere" table cells ki
    min-width 0 kar dete hain (text ek-ek letter me toot jata hai).
    "overflow-wrap: break-word" sirf lambe words todta hai, layout nahi.
  */
  * {
    word-break: normal !important;
    overflow-wrap: break-word !important;
  }
  img {
    max-width: 100%;
    height: auto;
  }
  pre {
    max-width: 100%;
    white-space: pre-wrap;
  }
  video, embed { max-width: 100%; }
  a { color: #1a73e8; }
</style>
</head>
<body>${html}</body>
</html>`;
}

function EmailFrame({ html, muted = false }) {
  const wrapRef = useRef(null);
  const frameRef = useRef(null);
  const [wrapHeight, setWrapHeight] = useState(80);

  const srcDoc = useMemo(
    () => buildEmailDocument(html, muted),
    [html, muted],
  );

  const responsive = useMemo(() => isResponsiveHtml(html), [html]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const frame = frameRef.current;

    if (!wrap || !frame) {
      return undefined;
    }

    let resizeObserver = null;
    let lastWidth = 0;
    let timer = null;
    let imageCleanups = [];

    function fit() {
      const doc = frame.contentDocument;
      const root = doc?.documentElement;

      if (!root || !doc.body) {
        return;
      }

      const available = wrap.clientWidth;

      if (available <= 0) {
        return;
      }

      const layoutWidth = responsive
        ? available
        : Math.max(available, MIN_LAYOUT_WIDTH);

      // reset, taaki natural size naap sakein
      frame.style.transform = "none";
      frame.style.height = "0px";
      frame.style.width = `${layoutWidth}px`;

      // Content layout width se chauda ho to iframe chauda kar do
      let width = layoutWidth;
      const needed = root.scrollWidth;

      if (needed > layoutWidth + 1) {
        width = needed;
        frame.style.width = `${width}px`;
      }

      const contentHeight = Math.ceil(root.scrollHeight);

      frame.style.height = `${contentHeight}px`;

      // Poora iframe scale karke screen me fit (left-right scroll nahi)
      const scale = width > available ? available / width : 1;

      if (scale < 1) {
        frame.style.transformOrigin = "0 0";
        frame.style.transform = `scale(${scale})`;
      }

      setWrapHeight(Math.ceil(contentHeight * scale) + 2);
    }

    function handleLoad() {
      const doc = frame.contentDocument;

      if (!doc) {
        return;
      }

      fit();

      // Images late load hoti hain, tab height badalti hai
      imageCleanups = Array.from(doc.querySelectorAll("img")).map((img) => {
        img.addEventListener("load", fit);

        return () => img.removeEventListener("load", fit);
      });

      // Fonts / late layout ke liye ek baar aur
      timer = setTimeout(fit, 350);
    }

    frame.addEventListener("load", handleLoad);

    // srcdoc kabhi kabhi listener lagne se pehle load ho chuka hota hai
    if (frame.contentDocument?.readyState === "complete") {
      handleLoad();
    }

    // Container ki width badli (rotate / resize) => dobara fit
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        const width = wrap.clientWidth;

        if (width !== lastWidth) {
          lastWidth = width;
          fit();
        }
      });

      resizeObserver.observe(wrap);
    }

    return () => {
      frame.removeEventListener("load", handleLoad);

      if (resizeObserver) {
        resizeObserver.disconnect();
      }

      if (timer) {
        clearTimeout(timer);
      }

      imageCleanups.forEach((cleanup) => cleanup());
    };
  }, [srcDoc, responsive]);

  return (
    <div
      ref={wrapRef}
      className="clb-email-frame-wrap"
      style={{ height: wrapHeight }}
    >
      <iframe
        ref={frameRef}
        className="clb-email-frame"
        title="Email content"
        srcDoc={srcDoc}
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        scrolling="no"
      />
    </div>
  );
}

/* ========================================
   GET MESSAGE CONTENT

   Empty content stays empty so the UI can
   distinguish between loading, an empty
   email, and real content.
======================================== */

function getMessageContent(message) {
  if (typeof message?.bodyHtml === "string" && message.bodyHtml.trim()) {
    return {
      content: message.bodyHtml,
      isHtml: true,
      hasRealContent: true,
    };
  }

  if (typeof message?.bodyText === "string" && message.bodyText.trim()) {
    return {
      content: message.bodyText,
      isHtml: false,
      hasRealContent: true,
    };
  }

  if (typeof message?.body === "string" && message.body.trim()) {
    return {
      content: message.body,
      isHtml: /<[a-z][\s\S]*>/i.test(message.body),
      hasRealContent: true,
    };
  }

  /*
    Snippet is only a fallback for the collapsed
    preview, never the full message body.
  */

  return {
    content: "",
    isHtml: false,
    hasRealContent: false,
  };
}

/* ========================================
   GET CLEAN TEXT
======================================== */

function htmlToPlainText(html) {
  if (typeof html !== "string") {
    return "";
  }

  if (typeof document !== "undefined") {
    const container = document.createElement("div");

    container.innerHTML = html;

    // <style> ka CSS text preview / quote check me na aaye
    container
      .querySelectorAll("style, script, title")
      .forEach((node) => node.remove());

    return (container.textContent || container.innerText || "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ========================================
   SPLIT PLAIN TEXT QUOTE
======================================== */

function splitPlainTextQuote(text) {
  if (typeof text !== "string") {
    return {
      mainText: "",
      quotedText: "",
    };
  }

  const quotePatterns = [
    /\n\s*On\s.+?\swrote:\s*/i,
    /\n\s*-{2,}\s*Original Message\s*-{2,}/i,
    /\n\s*From:\s.+?\n\s*Sent:\s.+/i,
    /\n\s*_{2,}\s*/i,
  ];

  let quoteIndex = -1;

  for (const pattern of quotePatterns) {
    const match = pattern.exec(text);

    if (match && typeof match.index === "number") {
      quoteIndex = match.index;
      break;
    }
  }

  const lines = text.split("\n");

  const firstQuoteLine = lines.findIndex((line) => line.trim().startsWith(">"));

  if (quoteIndex === -1 && firstQuoteLine >= 0) {
    return {
      mainText: lines.slice(0, firstQuoteLine).join("\n").trim(),
      quotedText: lines.slice(firstQuoteLine).join("\n").trim(),
    };
  }

  if (quoteIndex !== -1) {
    return {
      mainText: text.slice(0, quoteIndex).trim(),
      quotedText: text.slice(quoteIndex).trim(),
    };
  }

  return {
    mainText: text.trim(),
    quotedText: "",
  };
}

/* ========================================
   SPLIT HTML QUOTE
======================================== */

function splitHtmlQuote(html) {
  if (typeof html !== "string" || typeof document === "undefined") {
    return {
      mainHtml: html || "",
      quotedHtml: "",
    };
  }

  const container = document.createElement("div");

  container.innerHTML = sanitizeEmailHtml(html);

  const quoteSelectors = [
    ".gmail_quote",
    "blockquote.gmail_quote",
    ".gmail_extra",
    "blockquote",
  ];

  const quoteElements = [];

  quoteSelectors.forEach((selector) => {
    const elements = container.querySelectorAll(selector);

    elements.forEach((element) => {
      if (!quoteElements.includes(element)) {
        quoteElements.push(element);
      }
    });
  });

  if (quoteElements.length === 0) {
    return {
      mainHtml: container.innerHTML.trim(),
      quotedHtml: "",
    };
  }

  const quoteContainer = document.createElement("div");

  const topLevelQuotes = quoteElements.filter(
    (element) =>
      !quoteElements.some(
        (otherElement) =>
          otherElement !== element && otherElement.contains(element),
      ),
  );

  topLevelQuotes.forEach((element) => {
    quoteContainer.appendChild(element.cloneNode(true));
    element.remove();
  });

  return {
    mainHtml: container.innerHTML.trim(),
    quotedHtml: quoteContainer.innerHTML.trim(),
  };
}

/* ========================================
   GET CLEAN MESSAGE PREVIEW
======================================== */

function getCleanMessagePreview(mainContent, isHtml, message) {
  let preview = "";

  if (isHtml) {
    preview = htmlToPlainText(mainContent?.mainHtml || "");
  } else {
    preview = mainContent?.mainText || "";
  }

  /*
    If full content isn't available,
    use snippet ONLY for collapsed preview.
  */

  if (!preview && typeof message?.snippet === "string") {
    preview = message.snippet;
  }

  preview = preview.replace(/\s+/g, " ").trim();

  const MAX_LENGTH = 180;

  if (preview.length > MAX_LENGTH) {
    return preview.slice(0, MAX_LENGTH) + "...";
  }

  return preview;
}

/* ========================================
   ATTACHMENT KEY

   Same attachment (naam + size + type) ko
   pehchanne ke liye. Thread mein ek hi file
   baar-baar na dikhe, isliye.
======================================== */

function getAttachmentKey(file = {}) {
  return [
    file.filename || file.name || "",
    Number(file.size) || 0,
    file.mimeType || file.type || "",
  ].join("|");
}

/* ========================================
   MESSAGE KEY
======================================== */

function getMessageKey(message, index) {
  return String(message?.id || message?._id || `${message?.threadId}-${index}`);
}

/* ========================================
   THREAD MESSAGE CARD

   The parent only renders these AFTER the
   full thread is ready, so there is no
   per-message loading state any more.

   `attachments` parent se aata hai: sirf wo
   files jo pehli baar isi message mein aayi.

   Har message ki bar par apna "Summarize"
   button hai, jo SIRF isi message ka summary
   banata hai (collapsed ho ya expanded).
======================================== */

function ThreadMessage({ message, isLatest, attachments = [] }) {
  const [isExpanded, setIsExpanded] = useState(isLatest);

  const [showQuotedText, setShowQuotedText] = useState(false);

  /* Sirf is message ka AI summary */
  const messageId = message?.id || message?._id;

  const summaryState = useAiSummary(
    () => generateMessageSummary(messageId),
    messageId,
  );

  useEffect(() => {
    if (isLatest) {
      setIsExpanded(true);
    }
  }, [isLatest]);

  useEffect(() => {
    setShowQuotedText(false);
  }, [message?.id, message?._id]);

  const {
    content: messageBody,
    isHtml,
    hasRealContent,
  } = getMessageContent(message);

  const messageContent = useMemo(() => {
    if (!hasRealContent) {
      return {
        mainHtml: "",
        quotedHtml: "",
        mainText: "",
        quotedText: "",
      };
    }

    if (isHtml) {
      const result = splitHtmlQuote(messageBody);

      return {
        mainHtml: result.mainHtml,
        quotedHtml: result.quotedHtml,
        mainText: "",
        quotedText: "",
      };
    }

    const result = splitPlainTextQuote(messageBody);

    return {
      mainHtml: "",
      quotedHtml: "",
      mainText: result.mainText,
      quotedText: result.quotedText,
    };
  }, [messageBody, isHtml, hasRealContent]);

  const mainHtml = isHtml
    ? sanitizeEmailHtml(messageContent.mainHtml || "")
    : "";

  const quotedHtml = isHtml
    ? sanitizeEmailHtml(messageContent.quotedHtml || "")
    : "";

  const mainText = !isHtml ? messageContent.mainText || messageBody || "" : "";

  const quotedText = !isHtml ? messageContent.quotedText || "" : "";

  const hasQuotedText = isHtml
    ? Boolean(quotedHtml && htmlToPlainText(quotedHtml).trim())
    : Boolean(quotedText && quotedText.trim());

  const messagePreview = getCleanMessagePreview(
    messageContent,
    isHtml,
    message,
  );

  function handleToggle() {
    setIsExpanded((previous) => !previous);
  }

  return (
    <article
      className={[
        "clb-thread-message",

        isExpanded
          ? "clb-thread-message--expanded"
          : "clb-thread-message--collapsed",

        isLatest ? "clb-thread-message--latest" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/*
        Bar: expand/collapse button + summarize button.
        Dono siblings hain (button ke andar button invalid HTML hota hai).
      */}
      <div className="clb-thread-message__header">
        <button
          type="button"
          className="clb-thread-message__toggle"
          onClick={handleToggle}
          aria-expanded={isExpanded}
        >
          <div className="clb-thread-message__avatar">
            {message?.sender?.[0]?.toUpperCase() || "?"}
          </div>

          <div className="clb-thread-message__summary">
            <div className="clb-thread-message__summary-top">
              <strong className="clb-thread-message__sender-name">
                {message?.sender || "Unknown Sender"}
              </strong>

              {message?.time && (
                <span className="clb-thread-message__time">
                  {message.time}
                </span>
              )}
            </div>

            {!isExpanded && (
              <div className="clb-thread-message__snippet">
                {messagePreview || "No message content available."}
              </div>
            )}

            {isExpanded && message?.senderEmail && (
              <div className="clb-thread-message__email">
                {message.senderEmail}
              </div>
            )}
          </div>

          <span
            className={
              isExpanded
                ? "clb-thread-message__arrow clb-thread-message__arrow--open"
                : "clb-thread-message__arrow"
            }
          >
            ▾
          </span>
        </button>

        <SummarizeButton
          state={summaryState}
          size="sm"
          title="Summarize only this message"
        />
      </div>

      {/* Message summary: collapsed ho ya expanded, dono mein dikhega */}
      <SummaryPanel state={summaryState} title="Message summary" />

      {isExpanded && (
        <div className="clb-thread-message__content">
          <div className="clb-thread-message__body">
            {hasRealContent ? (
              isHtml ? (
                mainHtml ? (
                  <EmailFrame html={mainHtml} />
                ) : (
                  <div className="clb-email-preview__text">
                    No readable message content.
                  </div>
                )
              ) : (
                <div className="clb-email-preview__text">
                  <LinkifiedText text={mainText} />
                </div>
              )
            ) : (
              <div className="clb-email-preview__text">
                No message content available.
              </div>
            )}
          </div>

          {hasRealContent && hasQuotedText && (
            <div className="clb-thread-message__quoted-section">
              <button
                type="button"
                className="clb-thread-message__quoted-toggle"
                onClick={() => setShowQuotedText((previous) => !previous)}
                aria-expanded={showQuotedText}
              >
                <span>
                  {showQuotedText ? "Hide quoted text" : "Show quoted text"}
                </span>

                <span
                  className={
                    showQuotedText
                      ? "clb-thread-message__quoted-arrow clb-thread-message__quoted-arrow--open"
                      : "clb-thread-message__quoted-arrow"
                  }
                >
                  ▾
                </span>
              </button>

              {showQuotedText && (
                <div className="clb-thread-message__quoted-content">
                  {isHtml ? (
                    <EmailFrame html={quotedHtml} muted />
                  ) : (
                    <div className="clb-email-preview__text clb-email-preview__quoted-text">
                      <LinkifiedText text={quotedText} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {attachments.length > 0 && (
            <div className="clb-thread-message__attachments">
              <AttachmentPreview
                attachments={attachments}
                messageId={message?.id || message?._id}
              />
            </div>
          )}
        </div>
      )}
    </article>
  );
}

/* ========================================
   EMAIL PREVIEW
======================================== */

function EmailPreview({ email }) {
  /* ========================================
     CONTEXT
  ======================================== */

  const { addTracker } = useTracker();

  const {
    replyToEmail,
    trashEmail,
    clearActiveEmail,
    sendEmail,
    activeThread,
    threadLoading,
    threadError,
    isThreadReady,
  } = useEmails();

  const {
    getEmailLabels,
    fetchEmailLabels,
    addLabelToEmail,
    removeLabelFromEmail,
  } = useEmailLabels();

  /* ========================================
     STATE
  ======================================== */

  const [isReplying, setIsReplying] = useState(false);
  const [isForwarding, setIsForwarding] = useState(false);
  const [isLabelPickerOpen, setLabelPickerOpen] = useState(false);
  const [isTrackerFormOpen, setIsTrackerFormOpen] = useState(false);
  const [replyError, setReplyError] = useState(null);
  const [labelError, setLabelError] = useState(null);
  const [isSavingLabels, setIsSavingLabels] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);

  /* ========================================
     DELETE STATE
  ======================================== */

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  /* ========================================
     CURRENT EMAIL ID
  ======================================== */

  const currentEmailId = email?.id || email?._id;

  const currentThreadId = email?.threadId || null;

  /* ========================================
     AI SUMMARY (WHOLE THREAD)

     Header ke button se poore thread ka summary.
     Email badalte hi summary reset ho jata hai.
  ======================================== */

  const threadSummary = useAiSummary(
    () => generateThreadSummary(currentEmailId),
    currentEmailId,
  );

  /* ========================================
     VALIDATE ACTIVE THREAD
  ======================================== */

  const activeThreadMatchesCurrentEmail = useMemo(() => {
    if (!Array.isArray(activeThread) || activeThread.length === 0 || !email) {
      return false;
    }

    const containsCurrentEmail = activeThread.some((message) => {
      const messageId = message?.id || message?._id;

      return currentEmailId && String(messageId) === String(currentEmailId);
    });

    if (containsCurrentEmail) {
      return true;
    }

    if (currentThreadId) {
      return activeThread.some(
        (message) =>
          message?.threadId &&
          String(message.threadId) === String(currentThreadId),
      );
    }

    return false;
  }, [activeThread, currentEmailId, currentThreadId, email]);

  /* ========================================
     THREAD DATA
  ======================================== */

  const threadEmails = useMemo(() => {
    if (activeThreadMatchesCurrentEmail && activeThread?.length > 0) {
      return activeThread;
    }

    return email ? [email] : [];
  }, [activeThread, activeThreadMatchesCurrentEmail, email]);

  const hasLoadedCurrentThread =
    activeThreadMatchesCurrentEmail && activeThread?.length > 0;

  /* ========================================
     ATTACHMENTS PER MESSAGE

     Same attachment (naam + size + type) sirf us
     message mein dikhao jahan wo pehli baar aaya.
     Aage ke replies mein dobara nahi.
     (threadEmails purane se naye order mein hota hai)
  ======================================== */

  const attachmentsByMessage = useMemo(() => {
    const seen = new Set();
    const result = new Map();

    threadEmails.forEach((message, index) => {
      const files = Array.isArray(message?.attachments)
        ? message.attachments
        : [];

      // Sirf pichhle messages se compare karo,
      // isi message ki do alag files nahi chhupni chahiye
      const previouslySeen = new Set(seen);

      result.set(
        getMessageKey(message, index),
        files.filter((file) => !previouslySeen.has(getAttachmentKey(file))),
      );

      files.forEach((file) => seen.add(getAttachmentKey(file)));
    });

    return result;
  }, [threadEmails]);

  /* ========================================
     LOADING LOGIC

     The loader is shown until the context says
     the whole thread is ready. Nothing is shown
     from the partial list record in the meantime,
     so "No message content available." can never
     flash while the thread is still being fetched.
  ======================================== */

  const isCurrentContentLoading = !isThreadReady;

  /* ========================================
     LOAD EMAIL LABELS
  ======================================== */

  useEffect(() => {
    if (!currentEmailId) {
      return;
    }

    fetchEmailLabels(currentEmailId).catch((error) => {
      console.error("Failed to load email labels:", error);
    });
  }, [currentEmailId, fetchEmailLabels]);

  /* ========================================
     RESET UI ON EMAIL CHANGE
  ======================================== */

  useEffect(() => {
    setIsDeleteConfirmOpen(false);
    setDeleteError(null);
    setIsDeleting(false);
    setIsReplying(false);
    setIsForwarding(false);
    setReplyError(null);
    setLabelError(null);
    setLabelPickerOpen(false);
    setIsTrackerFormOpen(false);
  }, [currentEmailId]);

  /* ========================================
     EMAIL LABELS
  ======================================== */

  const selectedLabelIds = currentEmailId
    ? getEmailLabels(currentEmailId) || []
    : [];

  /* ========================================
     SAVE LABELS
  ======================================== */

  async function handleSaveLabels(newSelectedIds) {
    if (!currentEmailId) {
      const error = new Error("Email ID is missing.");

      setLabelError(error.message);

      throw error;
    }

    try {
      setLabelError(null);
      setIsSavingLabels(true);

      const currentIds = selectedLabelIds.map((id) => String(id));
      const nextIds = newSelectedIds.map((id) => String(id));

      const labelsToAdd = nextIds.filter(
        (labelId) => !currentIds.includes(labelId),
      );

      const labelsToRemove = currentIds.filter(
        (labelId) => !nextIds.includes(labelId),
      );

      await Promise.all(
        labelsToRemove.map((labelId) =>
          removeLabelFromEmail(currentEmailId, labelId),
        ),
      );

      await Promise.all(
        labelsToAdd.map((labelId) => addLabelToEmail(currentEmailId, labelId)),
      );

      toast.success("Labels updated successfully!");

      setLabelPickerOpen(false);
    } catch (error) {
      console.error("Failed to save labels:", error);

      const message = error.message || "Failed to update labels.";

      setLabelError(message);

      toast.error(message);

      throw error;
    } finally {
      setIsSavingLabels(false);
    }
  }

  /* ========================================
     SEND REPLY
  ======================================== */

  async function handleReply({ body, attachments = [] }) {
    const replyText = (body || "").trim();

    // Text ya attachment, dono mein se ek zaroori hai
    if (!replyText && attachments.length === 0) {
      setReplyError("Reply message cannot be empty.");
      return;
    }

    if (!currentEmailId) {
      setReplyError("Email ID is missing.");
      return;
    }

    try {
      setReplyError(null);
      setIsSendingReply(true);

      await replyToEmail(currentEmailId, {
        text: replyText,
        replyAll: false,
        attachments,
      });

      setIsReplying(false);
    } catch (error) {
      console.error("Failed to send reply:", error);

      setReplyError(error.message || "Failed to send reply.");

      // ReplyBox ko pata chale ki send fail hua (fields clear na ho)
      throw error;
    } finally {
      setIsSendingReply(false);
    }
  }

  /* ========================================
     FORWARD
  ======================================== */

  async function handleForward({ to, body, attachments = [] }) {
    if (!to || !to.trim()) {
      setReplyError("Recipient is required.");
      return;
    }

    try {
      setReplyError(null);
      setIsSendingReply(true);

      const subject = email?.subject ? `Fwd: ${email.subject}` : "Fwd:";

      const originalContent =
        email?.bodyHtml ||
        email?.bodyText ||
        email?.body ||
        email?.snippet ||
        "";

      const forwardText = [
        body?.trim() || "",
        "",
        "---------- Forwarded message ----------",
        `From: ${email?.senderEmail || email?.sender || ""}`,
        `Subject: ${email?.subject || ""}`,
        "",
        originalContent,
      ]
        .filter((item) => item !== undefined && item !== null)
        .join("\n");

      await sendEmail({
        to: to.trim(),
        subject,
        text: forwardText,
        attachments,
      });

      setIsForwarding(false);
    } catch (error) {
      console.error("Failed to forward email:", error);

      setReplyError(error.message || "Failed to forward email.");

      throw error;
    } finally {
      setIsSendingReply(false);
    }
  }

  /* ========================================
     DELETE EMAIL
  ======================================== */

  async function handleDeleteEmail() {
    if (!currentEmailId) {
      setDeleteError("Email ID is missing.");
      return;
    }

    try {
      setDeleteError(null);
      setIsDeleting(true);

      await trashEmail(currentEmailId);

      setIsDeleteConfirmOpen(false);

      clearActiveEmail();
    } catch (error) {
      console.error("Failed to delete email:", error);

      setDeleteError(error.message || "Failed to move email to trash.");
    } finally {
      setIsDeleting(false);
    }
  }

  /* ========================================
     NO EMAIL SELECTED
  ======================================== */

  if (!email) {
    return (
      <div className="clb-email-preview clb-email-preview--empty">
        <p>Select an email to read it here.</p>
      </div>
    );
  }

  /* ========================================
     RENDER
  ======================================== */

  return (
    <div className="clb-email-preview">
      {/* ===============================
          HEADER
      =============================== */}

      <header className="clb-email-preview__header">
        <div className="clb-email-preview__avatar">
          {email.sender?.[0]?.toUpperCase() || "?"}
        </div>

        <div className="clb-email-preview__header-content">
          <div className="clb-email-preview__sender-row">
            <div>
              <h2>{email.sender || "Unknown Sender"}</h2>

              {email.senderEmail && (
                <p className="clb-email-preview__sender-email">
                  {email.senderEmail}
                </p>
              )}
            </div>

            <div className="clb-email-preview__header-actions">
              {email.time && (
                <span className="clb-email-preview__time">{email.time}</span>
              )}

              {/* WHOLE THREAD SUMMARY: header ke sabse right mein */}
              <SummarizeButton
                state={threadSummary}
                disabled={isCurrentContentLoading}
                title="Summarize the whole conversation"
                hint="You can summarize your email"
                hintKey={String(currentEmailId || "")}
              />
            </div>
          </div>
        </div>
      </header>

      {/* ===============================
          THREAD
      =============================== */}

      <main className="clb-email-preview__body">
        {isCurrentContentLoading ? (
          <Loader inline text="Loading conversation..." />
        ) : (
          <>
            {threadError && !threadLoading && !hasLoadedCurrentThread && (
              <div className="clb-thread-error" role="alert">
                {threadError}
              </div>
            )}

            {/* Poore thread ka summary */}
            <SummaryPanel state={threadSummary} title="Thread summary" />

            <div
              className="clb-email-thread"
              key={String(currentEmailId || currentThreadId || "")}
            >
              {threadEmails.map((message, index) => {
                const messageKey = getMessageKey(message, index);

                return (
                  <ThreadMessage
                    key={messageKey}
                    message={message}
                    isLatest={index === threadEmails.length - 1}
                    attachments={attachmentsByMessage.get(messageKey) || []}
                  />
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* ===============================
          ACTIONS
      =============================== */}

      <div className="clb-email-preview__actions">
        {/* REPLY */}

        <button
          type="button"
          className="clb-btn clb-btn--primary"
          disabled={isSendingReply || isDeleting}
          onClick={() => {
            setIsReplying((open) => !open);
            setIsForwarding(false);
            setReplyError(null);
          }}
        >
          {isSendingReply ? "Sending..." : "Reply"}
        </button>

        {/* FORWARD */}

        <button
          type="button"
          className="clb-btn clb-btn--ghost"
          disabled={isSendingReply || isDeleting}
          onClick={() => {
            setIsForwarding((open) => !open);
            setIsReplying(false);
            setReplyError(null);
          }}
        >
          Forward
        </button>

        {/* LABELS */}

        <div className="clb-email-preview__label-anchor">
          <button
            type="button"
            className="clb-btn clb-btn--ghost"
            disabled={isDeleting || isSavingLabels}
            onClick={() => setLabelPickerOpen((open) => !open)}
          >
            {isSavingLabels ? "Saving..." : "Add Label"}

            {selectedLabelIds.length > 0 && ` (${selectedLabelIds.length})`}
          </button>

          {isLabelPickerOpen && (
            <LabelPicker
              selectedIds={selectedLabelIds}
              onSave={handleSaveLabels}
              onClose={() => setLabelPickerOpen(false)}
            />
          )}
        </div>

        {/* TRACKER */}

        <button
          type="button"
          className="clb-btn clb-btn--ghost"
          disabled={isDeleting}
          onClick={() => setIsTrackerFormOpen(true)}
        >
          📌 Add to Tracker
        </button>

        {/* DELETE */}

        <button
          type="button"
          className="clb-btn clb-btn--danger"
          disabled={isDeleting}
          onClick={() => {
            setDeleteError(null);
            setIsDeleteConfirmOpen(true);
          }}
          aria-label="Move email to trash"
          title="Move email to trash"
        >
          <Trash2 size={17} />

          <span>Delete</span>
        </button>
      </div>

      {/* ===============================
          LABEL ERROR
      =============================== */}

      {labelError && (
        <div className="clb-email-preview__error" role="alert">
          {labelError}
        </div>
      )}

      {/* ===============================
          DELETE CONFIRMATION
      =============================== */}

      <DeleteModal
        isOpen={isDeleteConfirmOpen}
        title="Move email to Trash?"
        description="This email will be moved to the Trash folder."
        confirmText="Move to Trash"
        loadingText="Deleting..."
        isDeleting={isDeleting}
        error={deleteError}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteEmail}
      />

      {/* ===============================
          REPLY ERROR
      =============================== */}

      {replyError && (
        <div className="clb-email-preview__error" role="alert">
          {replyError}
        </div>
      )}

      {/* ===============================
          REPLY BOX
      =============================== */}

      {isReplying && (
        <ReplyBox
          mode="reply"
          emailId={currentEmailId}
          recipient={email.senderEmail || email.sender}
          onCancel={() => {
            if (!isSendingReply) {
              setIsReplying(false);
              setReplyError(null);
            }
          }}
          onSend={handleReply}
          isLoading={isSendingReply}
        />
      )}

      {/* ===============================
          FORWARD BOX
      =============================== */}

      {isForwarding && (
        <ReplyBox
          mode="forward"
          onCancel={() => {
            if (!isSendingReply) {
              setIsForwarding(false);
              setReplyError(null);
            }
          }}
          onSend={handleForward}
          isLoading={isSendingReply}
        />
      )}

      {/* ===============================
          TRACKER FORM
      =============================== */}

      <TrackerForm
        isOpen={isTrackerFormOpen}
        onClose={() => setIsTrackerFormOpen(false)}
        onSave={addTracker}
        initialValues={{
          name: email.sender || "",
          email: email.senderEmail || "",
          subject: email.subject || "",

          threadId: email.threadId || currentEmailId || "",
        }}
      />
    </div>
  );
}

export default EmailPreview;