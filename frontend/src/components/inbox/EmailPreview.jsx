import {
  useState,
  useMemo,
  useEffect,
} from "react";

import toast from "react-hot-toast";

import DOMPurify from "dompurify";

import {
  Trash2,
} from "lucide-react";

import ReplyBox from "./ReplyBox";

import AttachmentPreview
  from "./AttachmentPreview";

import LabelPicker
  from "./LabelPicker";

import Loader
  from "../common/Loader";

import TrackerForm
  from "../tracker/TrackerForm";

import {
  useTracker,
} from "../../context/TrackerContext";

import {
  useEmailLabels,
} from "../../context/EmailLabelsContext";

import {
  useEmails,
} from "../../context/EmailContext";

import "./EmailPreview.css";


/* ========================================
   SANITIZE EMAIL HTML
======================================== */

function sanitizeEmailHtml(
  html,
) {

  if (
    typeof html !==
    "string"
  ) {

    return "";

  }


  return DOMPurify.sanitize(
    html,
    {
      USE_PROFILES: {
        html: true,
      },

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
    },
  );

}


/* ========================================
   GET MESSAGE CONTENT

   IMPORTANT:
   Do NOT return "No message content available."
   from here.

   Empty content must stay empty so the UI
   can distinguish between:

   1. Loading
   2. Empty email
   3. Actual content
======================================== */

function getMessageContent(
  message,
) {

  if (
    typeof message?.bodyHtml ===
      "string" &&
    message.bodyHtml.trim()
  ) {

    return {

      content:
        message.bodyHtml,

      isHtml:
        true,

      hasRealContent:
        true,

    };

  }


  if (
    typeof message?.bodyText ===
      "string" &&
    message.bodyText.trim()
  ) {

    return {

      content:
        message.bodyText,

      isHtml:
        false,

      hasRealContent:
        true,

    };

  }


  if (
    typeof message?.body ===
      "string" &&
    message.body.trim()
  ) {

    return {

      content:
        message.body,

      isHtml:
        /<[a-z][\s\S]*>/i.test(
          message.body,
        ),

      hasRealContent:
        true,

    };

  }


  /*
    Snippet is useful as a fallback preview,
    but it should NOT be treated as the full
    message body.
  */

  return {

    content:
      "",

    isHtml:
      false,

    hasRealContent:
      false,

  };

}


/* ========================================
   CHECK WHETHER EMAIL HAS BODY
======================================== */

function hasMessageBody(
  message,
) {

  if (
    typeof message?.bodyHtml ===
      "string" &&
    message.bodyHtml.trim()
  ) {

    return true;

  }


  if (
    typeof message?.bodyText ===
      "string" &&
    message.bodyText.trim()
  ) {

    return true;

  }


  if (
    typeof message?.body ===
      "string" &&
    message.body.trim()
  ) {

    return true;

  }


  return false;

}


/* ========================================
   GET CLEAN TEXT
======================================== */

function htmlToPlainText(
  html,
) {

  if (
    typeof html !==
    "string"
  ) {

    return "";

  }


  if (
    typeof document !==
    "undefined"
  ) {

    const container =
      document.createElement(
        "div",
      );


    container.innerHTML =
      html;


    return (
      container.textContent ||
      container.innerText ||
      ""
    )
      .replace(
        /\u00a0/g,
        " ",
      )
      .replace(
        /\s+/g,
        " ",
      )
      .trim();

  }


  return html
    .replace(
      /<[^>]*>/g,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();

}


/* ========================================
   SPLIT PLAIN TEXT QUOTE
======================================== */

function splitPlainTextQuote(
  text,
) {

  if (
    typeof text !==
    "string"
  ) {

    return {

      mainText:
        "",

      quotedText:
        "",

    };

  }


  const quotePatterns = [

    /\n\s*On\s.+?\swrote:\s*/i,

    /\n\s*-{2,}\s*Original Message\s*-{2,}/i,

    /\n\s*From:\s.+?\n\s*Sent:\s.+/i,

    /\n\s*_{2,}\s*/i,

  ];


  let quoteIndex =
    -1;


  for (
    const pattern of
    quotePatterns
  ) {

    const match =
      pattern.exec(
        text,
      );


    if (
      match &&
      typeof match.index ===
        "number"
    ) {

      quoteIndex =
        match.index;

      break;

    }

  }


  const lines =
    text.split(
      "\n",
    );


  const firstQuoteLine =
    lines.findIndex(
      (line) =>
        line
          .trim()
          .startsWith(
            ">",
          ),
    );


  if (
    quoteIndex === -1 &&
    firstQuoteLine >= 0
  ) {

    return {

      mainText:
        lines
          .slice(
            0,
            firstQuoteLine,
          )
          .join(
            "\n",
          )
          .trim(),

      quotedText:
        lines
          .slice(
            firstQuoteLine,
          )
          .join(
            "\n",
          )
          .trim(),

    };

  }


  if (
    quoteIndex !== -1
  ) {

    return {

      mainText:
        text
          .slice(
            0,
            quoteIndex,
          )
          .trim(),

      quotedText:
        text
          .slice(
            quoteIndex,
          )
          .trim(),

    };

  }


  return {

    mainText:
      text.trim(),

    quotedText:
      "",

  };

}


/* ========================================
   SPLIT HTML QUOTE
======================================== */

function splitHtmlQuote(
  html,
) {

  if (
    typeof html !==
      "string" ||
    typeof document ===
      "undefined"
  ) {

    return {

      mainHtml:
        html || "",

      quotedHtml:
        "",

    };

  }


  const container =
    document.createElement(
      "div",
    );


  container.innerHTML =
    sanitizeEmailHtml(
      html,
    );


  const quoteSelectors = [

    ".gmail_quote",

    "blockquote.gmail_quote",

    ".gmail_extra",

    "blockquote",

  ];


  const quoteElements =
    [];


  quoteSelectors.forEach(
    (selector) => {

      const elements =
        container.querySelectorAll(
          selector,
        );


      elements.forEach(
        (element) => {

          if (
            !quoteElements.includes(
              element,
            )
          ) {

            quoteElements.push(
              element,
            );

          }

        },
      );

    },
  );


  if (
    quoteElements.length === 0
  ) {

    return {

      mainHtml:
        container.innerHTML.trim(),

      quotedHtml:
        "",

    };

  }


  const quoteContainer =
    document.createElement(
      "div",
    );


  const topLevelQuotes =
    quoteElements.filter(
      (element) =>

        !quoteElements.some(
          (otherElement) =>

            otherElement !==
              element &&

            otherElement.contains(
              element,
            ),

        ),

    );


  topLevelQuotes.forEach(
    (element) => {

      quoteContainer.appendChild(
        element.cloneNode(
          true,
        ),
      );


      element.remove();

    },
  );


  return {

    mainHtml:
      container.innerHTML.trim(),

    quotedHtml:
      quoteContainer.innerHTML.trim(),

  };

}


/* ========================================
   GET CLEAN MESSAGE PREVIEW
======================================== */

function getCleanMessagePreview(
  mainContent,
  isHtml,
  message,
) {

  let preview =
    "";


  if (
    isHtml
  ) {

    preview =
      htmlToPlainText(
        mainContent?.mainHtml ||
        "",
      );

  } else {

    preview =
      mainContent?.mainText ||
      "";

  }


  /*
    If full content isn't available yet,
    use snippet ONLY for collapsed preview.
  */

  if (
    !preview &&
    typeof message?.snippet ===
      "string"
  ) {

    preview =
      message.snippet;

  }


  preview =
    preview
      .replace(
        /\s+/g,
        " ",
      )
      .trim();


  const MAX_LENGTH =
    180;


  if (
    preview.length >
    MAX_LENGTH
  ) {

    return (
      preview.slice(
        0,
        MAX_LENGTH,
      ) + "..."
    );

  }


  return preview;

}


/* ========================================
   THREAD MESSAGE CARD
======================================== */

function ThreadMessage({
  message,
  isLatest,
  isLoadingContent =
    false,
}) {


  const [
    isExpanded,
    setIsExpanded,
  ] =
    useState(
      isLatest,
    );


  const [
    showQuotedText,
    setShowQuotedText,
  ] =
    useState(
      false,
    );


  useEffect(() => {

    if (
      isLatest
    ) {

      setIsExpanded(
        true,
      );

    }

  }, [
    isLatest,
  ]);


  useEffect(() => {

    setShowQuotedText(
      false,
    );

  }, [
    message?.id,
    message?._id,
  ]);


  const {
    content:
      messageBody,

    isHtml,

    hasRealContent,

  } =
    getMessageContent(
      message,
    );


  const messageContent =
    useMemo(() => {

      if (
        !hasRealContent
      ) {

        return {

          mainHtml:
            "",

          quotedHtml:
            "",

          mainText:
            "",

          quotedText:
            "",

        };

      }


      if (
        isHtml
      ) {

        const result =
          splitHtmlQuote(
            messageBody,
          );


        return {

          mainHtml:
            result.mainHtml,

          quotedHtml:
            result.quotedHtml,

          mainText:
            "",

          quotedText:
            "",

        };

      }


      const result =
        splitPlainTextQuote(
          messageBody,
        );


      return {

        mainHtml:
          "",

        quotedHtml:
          "",

        mainText:
          result.mainText,

        quotedText:
          result.quotedText,

      };

    }, [
      messageBody,
      isHtml,
      hasRealContent,
    ]);


  const mainHtml =
    isHtml
      ? sanitizeEmailHtml(
          messageContent.mainHtml ||
          "",
        )
      : "";


  const quotedHtml =
    isHtml
      ? sanitizeEmailHtml(
          messageContent.quotedHtml ||
          "",
        )
      : "";


  const mainText =
    !isHtml
      ? (
          messageContent.mainText ||
          messageBody ||
          ""
        )
      : "";


  const quotedText =
    !isHtml
      ? (
          messageContent.quotedText ||
          ""
        )
      : "";


  const hasQuotedText =
    isHtml
      ? Boolean(
          quotedHtml &&
          htmlToPlainText(
            quotedHtml,
          ).trim(),
        )
      : Boolean(
          quotedText &&
          quotedText.trim(),
        );


  const messagePreview =
    getCleanMessagePreview(
      messageContent,
      isHtml,
      message,
    );


  const shouldShowLoader =
    isLoadingContent &&
    !hasRealContent;


  const shouldShowEmptyState =
    !isLoadingContent &&
    !hasRealContent;


  function handleToggle() {

    setIsExpanded(
      (previous) =>
        !previous,
    );

  }


  return (

    <article
      className={[
        "clb-thread-message",

        isExpanded
          ? "clb-thread-message--expanded"
          : "clb-thread-message--collapsed",

        isLatest
          ? "clb-thread-message--latest"
          : "",
      ]
        .filter(
          Boolean,
        )
        .join(
          " ",
        )}
    >


      <button
        type="button"
        className="clb-thread-message__toggle"
        onClick={
          handleToggle
        }
        aria-expanded={
          isExpanded
        }
      >


        <div className="clb-thread-message__avatar">

          {message?.sender
            ?.[
              0
            ]
            ?.toUpperCase() ||
            "?"}

        </div>


        <div className="clb-thread-message__summary">


          <div className="clb-thread-message__summary-top">


            <strong className="clb-thread-message__sender-name">

              {message?.sender ||
                "Unknown Sender"}

            </strong>


            {message?.time && (

              <span className="clb-thread-message__time">

                {message.time}

              </span>

            )}


          </div>


          {!isExpanded && (

            <div className="clb-thread-message__snippet">

              {shouldShowLoader
                ? "Loading conversation..."
                : (
                    messagePreview ||
                    (
                      shouldShowEmptyState
                        ? "No message content available."
                        : ""
                    )
                  )}

            </div>

          )}


          {isExpanded &&
            message?.senderEmail && (

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


      {isExpanded && (

        <div className="clb-thread-message__content">


          <div className="clb-thread-message__body">


            {shouldShowLoader ? (

              <Loader
                inline
                text="Loading conversation..."
              />

            ) : hasRealContent ? (

              isHtml ? (

                mainHtml ? (

                  <div
                    className="clb-email-preview__html"
                    dangerouslySetInnerHTML={{
                      __html:
                        mainHtml,
                    }}
                  />

                ) : (

                  <div className="clb-email-preview__text">

                    No readable message content.

                  </div>

                )

              ) : (

                <div className="clb-email-preview__text">

                  {mainText}

                </div>

              )

            ) : shouldShowEmptyState ? (

              <div className="clb-email-preview__text">

                No message content available.

              </div>

            ) : null}


          </div>


          {!shouldShowLoader &&
            hasRealContent &&
            hasQuotedText && (

              <div className="clb-thread-message__quoted-section">


                <button
                  type="button"
                  className="clb-thread-message__quoted-toggle"
                  onClick={() =>
                    setShowQuotedText(
                      (previous) =>
                        !previous,
                    )
                  }
                  aria-expanded={
                    showQuotedText
                  }
                >


                  <span>

                    {showQuotedText
                      ? "Hide quoted text"
                      : "Show quoted text"}

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

                      <div
                        className="clb-email-preview__html clb-email-preview__quoted-html"
                        dangerouslySetInnerHTML={{
                          __html:
                            quotedHtml,
                        }}
                      />

                    ) : (

                      <div className="clb-email-preview__text clb-email-preview__quoted-text">

                        {quotedText}

                      </div>

                    )}


                  </div>

                )}


              </div>

            )}


          {!shouldShowLoader &&
            message?.attachments
              ?.length > 0 && (

              <div className="clb-thread-message__attachments">

                <AttachmentPreview
                  attachments={
                    message.attachments
                  }
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

function EmailPreview({
  email,
}) {


  /* ========================================
     CONTEXT
  ======================================== */

  const {
    addTracker,
  } =
    useTracker();


  const {

    replyToEmail,

    trashEmail,

    clearActiveEmail,

    sendEmail,

    activeThread,

    threadLoading,

    threadError,

  } =
    useEmails();


  const {

    getEmailLabels,

    fetchEmailLabels,

    addLabelToEmail,

    removeLabelFromEmail,

  } =
    useEmailLabels();


  /* ========================================
     STATE
  ======================================== */

  const [

    isReplying,

    setIsReplying,

  ] =
    useState(
      false,
    );


  const [

    isForwarding,

    setIsForwarding,

  ] =
    useState(
      false,
    );


  const [

    isLabelPickerOpen,

    setLabelPickerOpen,

  ] =
    useState(
      false,
    );


  const [

    isTrackerFormOpen,

    setIsTrackerFormOpen,

  ] =
    useState(
      false,
    );


  const [

    replyError,

    setReplyError,

  ] =
    useState(
      null,
    );


  const [

    labelError,

    setLabelError,

  ] =
    useState(
      null,
    );


  const [

    isSavingLabels,

    setIsSavingLabels,

  ] =
    useState(
      false,
    );


  const [

    isSendingReply,

    setIsSendingReply,

  ] =
    useState(
      false,
    );


  /* ========================================
     DELETE STATE
  ======================================== */

  const [

    isDeleting,

    setIsDeleting,

  ] =
    useState(
      false,
    );


  const [

    deleteError,

    setDeleteError,

  ] =
    useState(
      null,
    );


  const [

    isDeleteConfirmOpen,

    setIsDeleteConfirmOpen,

  ] =
    useState(
      false,
    );


  /* ========================================
     CURRENT EMAIL ID
  ======================================== */

  const currentEmailId =
    email?.id ||
    email?._id;


  const currentThreadId =
    email?.threadId ||
    null;


  /* ========================================
     DOES SELECTED EMAIL ALREADY
     HAVE FULL CONTENT?
  ======================================== */

  const selectedEmailHasContent =
    useMemo(
      () =>
        hasMessageBody(
          email,
        ),
      [
        email,
      ],
    );


  /* ========================================
     VALIDATE ACTIVE THREAD
  ======================================== */

  const activeThreadMatchesCurrentEmail =
    useMemo(() => {

      if (
        !Array.isArray(
          activeThread,
        ) ||
        activeThread.length ===
          0 ||
        !email
      ) {

        return false;

      }


      const containsCurrentEmail =
        activeThread.some(
          (message) => {

            const messageId =
              message?.id ||
              message?._id;


            return (
              currentEmailId &&
              String(
                messageId,
              ) ===
                String(
                  currentEmailId,
                )
            );

          },
        );


      if (
        containsCurrentEmail
      ) {

        return true;

      }


      if (
        currentThreadId
      ) {

        return activeThread.some(
          (message) =>

            message?.threadId &&
            String(
              message.threadId,
            ) ===
              String(
                currentThreadId,
              ),

        );

      }


      return false;

    }, [
      activeThread,
      currentEmailId,
      currentThreadId,
      email,
    ]);


  /* ========================================
     THREAD DATA
  ======================================== */

  const threadEmails =
    useMemo(() => {

      if (
        activeThreadMatchesCurrentEmail &&
        activeThread?.length >
          0
      ) {

        return activeThread;

      }


      return email
        ? [
            email,
          ]
        : [];

    }, [
      activeThread,
      activeThreadMatchesCurrentEmail,
      email,
    ]);


  /* ========================================
     IMPORTANT LOADING LOGIC

     Show loader when:

     - threadLoading is true
     - selected email does not already
       contain the full body

     This prevents "No message content"
     from flashing before API data arrives.
  ======================================== */

  const shouldShowThreadLoader =
    Boolean(
      threadLoading &&
      !selectedEmailHasContent,
    );


  /*
    If activeThread is already available
    for the selected email, don't keep
    showing the loader.
  */

  const hasLoadedCurrentThread =
    activeThreadMatchesCurrentEmail &&
    activeThread?.length >
      0;


  const isCurrentContentLoading =
    shouldShowThreadLoader &&
    !hasLoadedCurrentThread;


  /* ========================================
     LOAD EMAIL LABELS
  ======================================== */

  useEffect(() => {

    if (
      !currentEmailId
    ) {

      return;

    }


    fetchEmailLabels(
      currentEmailId,
    ).catch(
      (error) => {

        console.error(
          "Failed to load email labels:",
          error,
        );

      },
    );

  }, [
    currentEmailId,
    fetchEmailLabels,
  ]);


  /* ========================================
     RESET UI ON EMAIL CHANGE
  ======================================== */

  useEffect(() => {

    setIsDeleteConfirmOpen(
      false,
    );

    setDeleteError(
      null,
    );

    setIsDeleting(
      false,
    );

    setIsReplying(
      false,
    );

    setIsForwarding(
      false,
    );

    setReplyError(
      null,
    );

    setLabelError(
      null,
    );

    setLabelPickerOpen(
      false,
    );

    setIsTrackerFormOpen(
      false,
    );

  }, [
    currentEmailId,
  ]);


  /* ========================================
     EMAIL LABELS
  ======================================== */

  const selectedLabelIds =
    currentEmailId
      ? (
          getEmailLabels(
            currentEmailId,
          ) || []
        )
      : [];


  /* ========================================
     SAVE LABELS
  ======================================== */

  async function handleSaveLabels(
    newSelectedIds,
  ) {

    if (
      !currentEmailId
    ) {

      const error =
        new Error(
          "Email ID is missing.",
        );


      setLabelError(
        error.message,
      );


      throw error;

    }


    try {

      setLabelError(
        null,
      );

      setIsSavingLabels(
        true,
      );


      const currentIds =
        selectedLabelIds.map(
          (id) =>
            String(
              id,
            ),
        );


      const nextIds =
        newSelectedIds.map(
          (id) =>
            String(
              id,
            ),
        );


      const labelsToAdd =
        nextIds.filter(
          (labelId) =>

            !currentIds.includes(
              labelId,
            ),

        );


      const labelsToRemove =
        currentIds.filter(
          (labelId) =>

            !nextIds.includes(
              labelId,
            ),

        );


      await Promise.all(

        labelsToRemove.map(
          (labelId) =>

            removeLabelFromEmail(
              currentEmailId,
              labelId,
            ),

        ),

      );


      await Promise.all(

        labelsToAdd.map(
          (labelId) =>

            addLabelToEmail(
              currentEmailId,
              labelId,
            ),

        ),

      );


      toast.success(
        "Labels updated successfully!",
      );


      setLabelPickerOpen(
        false,
      );

    } catch (
      error
    ) {

      console.error(
        "Failed to save labels:",
        error,
      );


      const message =
        error.message ||
        "Failed to update labels.";


      setLabelError(
        message,
      );


      toast.error(
        message,
      );


      throw error;

    } finally {

      setIsSavingLabels(
        false,
      );

    }

  }


  /* ========================================
     SEND REPLY
  ======================================== */

  async function handleReply({
    body,
  }) {

    if (
      !body ||
      !body.trim()
    ) {

      setReplyError(
        "Reply message cannot be empty.",
      );

      return;

    }


    if (
      !currentEmailId
    ) {

      setReplyError(
        "Email ID is missing.",
      );

      return;

    }


    try {

      setReplyError(
        null,
      );

      setIsSendingReply(
        true,
      );


      await replyToEmail(
        currentEmailId,
        {

          text:
            body.trim(),

          replyAll:
            false,

        },
      );


      setIsReplying(
        false,
      );

    } catch (
      error
    ) {

      console.error(
        "Failed to send reply:",
        error,
      );


      setReplyError(
        error.message ||
        "Failed to send reply.",
      );

    } finally {

      setIsSendingReply(
        false,
      );

    }

  }


  /* ========================================
     FORWARD
  ======================================== */

  async function handleForward({
    to,
    body,
  }) {

    if (
      !to ||
      !to.trim()
    ) {

      setReplyError(
        "Recipient is required.",
      );

      return;

    }


    try {

      setReplyError(
        null,
      );

      setIsSendingReply(
        true,
      );


      const subject =
        email?.subject
          ? `Fwd: ${email.subject}`
          : "Fwd:";


      const originalContent =
        email?.bodyHtml ||
        email?.bodyText ||
        email?.body ||
        email?.snippet ||
        "";


      const forwardText = [

        body?.trim() ||
          "",

        "",

        "---------- Forwarded message ----------",

        `From: ${
          email?.senderEmail ||
          email?.sender ||
          ""
        }`,

        `Subject: ${
          email?.subject ||
          ""
        }`,

        "",

        originalContent,

      ]
        .filter(
          (item) =>

            item !==
              undefined &&

            item !==
              null,

        )
        .join(
          "\n",
        );


      await sendEmail({

        to:
          to.trim(),

        subject,

        text:
          forwardText,

      });


      setIsForwarding(
        false,
      );

    } catch (
      error
    ) {

      console.error(
        "Failed to forward email:",
        error,
      );


      setReplyError(
        error.message ||
        "Failed to forward email.",
      );

    } finally {

      setIsSendingReply(
        false,
      );

    }

  }


  /* ========================================
     DELETE EMAIL
  ======================================== */

  async function handleDeleteEmail() {

    if (
      !currentEmailId
    ) {

      setDeleteError(
        "Email ID is missing.",
      );

      return;

    }


    try {

      setDeleteError(
        null,
      );

      setIsDeleting(
        true,
      );


      await trashEmail(
        currentEmailId,
      );


      setIsDeleteConfirmOpen(
        false,
      );


      clearActiveEmail();

    } catch (
      error
    ) {

      console.error(
        "Failed to delete email:",
        error,
      );


      setDeleteError(
        error.message ||
        "Failed to move email to trash.",
      );

    } finally {

      setIsDeleting(
        false,
      );

    }

  }


  /* ========================================
     NO EMAIL SELECTED
  ======================================== */

  if (
    !email
  ) {

    return (

      <div className="clb-email-preview clb-email-preview--empty">

        <p>
          Select an email to read it here.
        </p>

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

          {email.sender
            ?.[
              0
            ]
            ?.toUpperCase() ||
            "?"}

        </div>


        <div className="clb-email-preview__header-content">


          <div className="clb-email-preview__sender-row">


            <div>


              <h2>

                {email.sender ||
                  "Unknown Sender"}

              </h2>


              {email.senderEmail && (

                <p className="clb-email-preview__sender-email">

                  {email.senderEmail}

                </p>

              )}


            </div>


            {email.time && (

              <span className="clb-email-preview__time">

                {email.time}

              </span>

            )}


          </div>


        </div>


      </header>


      {/* ===============================
          THREAD
      =============================== */}

      <main className="clb-email-preview__body">


        {/*
          Loading state must take priority
          over the empty-content state.
        */}

        {isCurrentContentLoading ? (

          <Loader
            inline
            text="Loading conversation..."
          />

        ) : (

          <>


            {threadError &&
              !threadLoading &&
              !hasLoadedCurrentThread && (

                <div
                  className="clb-thread-error"
                  role="alert"
                >

                  {threadError}

                </div>

              )}


            <div
              className="clb-email-thread"
              key={
                String(
                  currentEmailId ||
                  currentThreadId ||
                  "",
                )
              }
            >


              {threadEmails.map(
                (
                  message,
                  index,
                ) => (

                  <ThreadMessage

                    key={
                      message.id ||
                      message._id ||
                      `${message.threadId}-${index}`
                    }

                    message={
                      message
                    }

                    isLatest={
                      index ===
                      threadEmails.length - 1
                    }

                    isLoadingContent={
                      Boolean(
                        threadLoading &&
                        !hasMessageBody(
                          message,
                        ),
                      )
                    }

                  />

                ),
              )}


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
          disabled={
            isSendingReply ||
            isDeleting
          }
          onClick={() => {

            setIsReplying(
              (open) =>
                !open,
            );

            setIsForwarding(
              false,
            );

            setReplyError(
              null,
            );

          }}
        >

          {isSendingReply
            ? "Sending..."
            : "Reply"}

        </button>


        {/* FORWARD */}

        <button
          type="button"
          className="clb-btn clb-btn--ghost"
          disabled={
            isSendingReply ||
            isDeleting
          }
          onClick={() => {

            setIsForwarding(
              (open) =>
                !open,
            );

            setIsReplying(
              false,
            );

            setReplyError(
              null,
            );

          }}
        >

          Forward

        </button>


        {/* LABELS */}

        <div className="clb-email-preview__label-anchor">


          <button
            type="button"
            className="clb-btn clb-btn--ghost"
            disabled={
              isDeleting ||
              isSavingLabels
            }
            onClick={() =>

              setLabelPickerOpen(
                (open) =>
                  !open,
              )

            }
          >

            {isSavingLabels
              ? "Saving..."
              : "Add Label"}

            {selectedLabelIds.length > 0 &&
              ` (${selectedLabelIds.length})`}

          </button>


          {isLabelPickerOpen && (

            <LabelPicker

              selectedIds={
                selectedLabelIds
              }

              onSave={
                handleSaveLabels
              }

              onClose={() =>
                setLabelPickerOpen(
                  false,
                )
              }

            />

          )}


        </div>


        {/* TRACKER */}

        <button
          type="button"
          className="clb-btn clb-btn--ghost"
          disabled={
            isDeleting
          }
          onClick={() =>
            setIsTrackerFormOpen(
              true,
            )
          }
        >

          📌 Add to Tracker

        </button>


        {/* DELETE */}

        <button
          type="button"
          className="clb-btn clb-btn--danger"
          disabled={
            isDeleting
          }
          onClick={() => {

            setDeleteError(
              null,
            );

            setIsDeleteConfirmOpen(
              true,
            );

          }}
          aria-label="Move email to trash"
          title="Move email to trash"
        >

          <Trash2 size={17} />

          <span>
            Delete
          </span>

        </button>


      </div>


      {/* ===============================
          LABEL ERROR
      =============================== */}

      {labelError && (

        <div
          className="clb-email-preview__error"
          role="alert"
        >

          {labelError}

        </div>

      )}


      {/* ===============================
          DELETE CONFIRMATION
      =============================== */}

      {isDeleteConfirmOpen && (

        <div
          className="clb-delete-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-email-title"
        >


          <div
            className="clb-delete-modal__backdrop"
            onClick={() => {

              if (
                !isDeleting
              ) {

                setIsDeleteConfirmOpen(
                  false,
                );

              }

            }}
          />


          <div className="clb-delete-modal__content">


            <h3
              id="delete-email-title"
              className="clb-delete-modal__title"
            >

              Move email to Trash?

            </h3>


            <p className="clb-delete-modal__text">

              This email will be moved to
              the Trash folder.

            </p>


            {deleteError && (

              <div
                className="clb-delete-modal__error"
                role="alert"
              >

                {deleteError}

              </div>

            )}


            <div className="clb-delete-modal__actions">


              <button
                type="button"
                className="clb-delete-modal__cancel"
                disabled={
                  isDeleting
                }
                onClick={() =>
                  setIsDeleteConfirmOpen(
                    false,
                  )
                }
              >

                Cancel

              </button>


              <button
                type="button"
                className="clb-delete-modal__confirm"
                disabled={
                  isDeleting
                }
                onClick={
                  handleDeleteEmail
                }
              >

                {isDeleting
                  ? "Deleting..."
                  : "Move to Trash"}

              </button>


            </div>


          </div>


        </div>

      )}


      {/* ===============================
          REPLY ERROR
      =============================== */}

      {replyError && (

        <div
          className="clb-email-preview__error"
          role="alert"
        >

          {replyError}

        </div>

      )}


      {/* ===============================
          REPLY BOX
      =============================== */}

      {isReplying && (

        <ReplyBox

          mode="reply"

          recipient={
            email.senderEmail ||
            email.sender
          }

          onCancel={() => {

            if (
              !isSendingReply
            ) {

              setIsReplying(
                false,
              );

              setReplyError(
                null,
              );

            }

          }}

          onSend={
            handleReply
          }

          isLoading={
            isSendingReply
          }

        />

      )}


      {/* ===============================
          FORWARD BOX
      =============================== */}

      {isForwarding && (

        <ReplyBox

          mode="forward"

          onCancel={() => {

            if (
              !isSendingReply
            ) {

              setIsForwarding(
                false,
              );

              setReplyError(
                null,
              );

            }

          }}

          onSend={
            handleForward
          }

          isLoading={
            isSendingReply
          }

        />

      )}


      {/* ===============================
          TRACKER FORM
      =============================== */}

      <TrackerForm

        isOpen={
          isTrackerFormOpen
        }

        onClose={() =>
          setIsTrackerFormOpen(
            false,
          )
        }

        onSave={
          addTracker
        }

        initialValues={{

          name:
            email.sender || "",

          email:
            email.senderEmail || "",

          subject:
            email.subject || "",

          threadId:
            email.threadId ||
            currentEmailId ||
            "",

        }}

      />


    </div>

  );

}


export default EmailPreview;