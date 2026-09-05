import { useEffect, useMemo, useState } from "react";

import { useSearchParams } from "react-router-dom";

import { ArrowLeft } from "lucide-react";

import { useEmails } from "../../context/EmailContext";

import EmailList from "../../components/inbox/EmailList";
import EmailPreview from "../../components/inbox/EmailPreview";

import "./Inbox.css";

/* =========================================================
VIEW CONFIG
========================================================= */

const VIEW_CONFIG = {
  inbox: {
    label: "Inbox",
  },

  unread: {
    label: "Unread",
  },

  starred: {
    label: "Starred",
  },

  sent: {
    label: "Sent",
  },

  drafts: {
    label: "Drafts",
  },

  trash: {
    label: "Trash",
  },
};

/* =========================================================
INBOX
========================================================= */

function Inbox() {
  const [searchParams] = useSearchParams();

  /* ========================================
  EMAIL CONTEXT
  ======================================== */

  const {
    // FIX: viewEmails is the shared cache filtered down to the
    // currently active view (inbox/unread/sent/...). This is what
    // should be rendered — NOT the raw `emails` pool, which spans
    // every view ever fetched this session.
    viewEmails,

    activeEmailId,

    activeEmail,

    selectEmail,

    markAsRead,

    clearActiveEmail,

    currentView,

    changeView,

    /* Loading */

    loading,

    loadingMore,

    error,

    /* Pagination */

    hasMoreEmails,

    loadMoreEmails,
  } = useEmails();

  /* ========================================
  CURRENT URL VIEW
  ======================================== */

  const requestedView = searchParams.get("view") || "inbox";

  const currentUrlView = VIEW_CONFIG[requestedView] ? requestedView : "inbox";

  /* ========================================
  VIEW CONFIG
  ======================================== */

  const viewConfig = useMemo(() => VIEW_CONFIG[currentUrlView], [currentUrlView]);

  /* ========================================
  MOBILE STATE
  ======================================== */

  const [isMobileView, setIsMobileView] = useState(
    () => window.innerWidth < 960,
  );

  const [mobileView, setMobileView] = useState(() =>
    window.innerWidth < 960 ? "list" : "desktop",
  );

  /* ========================================
  WINDOW RESIZE
  ======================================== */

  useEffect(() => {
    function handleResize() {
      const isMobile = window.innerWidth < 960;

      setIsMobileView(isMobile);

      if (!isMobile) {
        setMobileView("desktop");

        return;
      }

      setMobileView((previous) => (previous === "desktop" ? "list" : previous));
    }

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  /* ========================================
  CHANGE VIEW WHEN URL CHANGES
  ======================================== */

  useEffect(() => {
    /*
      Agar already same view hai, dobara load mat karo.
    */

    if (currentView === currentUrlView) {
      return;
    }

    clearActiveEmail();

    if (window.innerWidth < 960) {
      setMobileView("list");
    }

    /*
      IMPORTANT:

      Context ka changeView use karo. Ye ab per-view cache use
      karta hai — agar yeh view pehle load ho chuki hai, turant
      cache se dikhayega aur background me silently refresh
      karega, bina naya network fetch block kiye.
    */

    changeView(currentUrlView).catch((changeError) => {
      console.error(`Failed to load ${currentUrlView}:`, changeError);
    });
  }, [currentUrlView, currentView, changeView, clearActiveEmail]);

  /* ========================================
  SELECT EMAIL
  ======================================== */

  async function handleSelectEmail(emailId) {
    try {
      const selectedEmail = viewEmails.find((email) => email.id === emailId);

      await selectEmail(emailId);

      if (selectedEmail && selectedEmail.unread) {
        try {
          await markAsRead(emailId);
        } catch (markError) {
          console.error("Failed to mark email as read:", markError);
        }
      }

      if (isMobileView) {
        setMobileView("preview");
      }
    } catch (selectError) {
      console.error("Failed to select email:", selectError);
    }
  }

  /* ========================================
  MOBILE BACK
  ======================================== */

  function handleBackToList() {
    setMobileView("list");
  }

  /* ========================================
  LOAD MORE
  ======================================== */

  async function handleLoadMore() {
    try {
      await loadMoreEmails();
    } catch (loadError) {
      console.error("Failed to load more emails:", loadError);
    }
  }

  /* ========================================
  MOBILE PREVIEW
  ======================================== */

  if (isMobileView && mobileView === "preview") {
    return (
      <div className="clb-inbox clb-inbox--mobile">
        {/* MOBILE HEADER */}

        <div className="clb-inbox__mobile-header">
          <button
            type="button"
            className="clb-inbox__back-btn"
            onClick={handleBackToList}
          >
            <ArrowLeft size={19} />

            <span>Back to {viewConfig.label}</span>
          </button>
        </div>

        {/* EMAIL PREVIEW */}

        <section className="clb-inbox__mobile-preview">
          <EmailPreview email={activeEmail} />
        </section>
      </div>
    );
  }

  /* ========================================
  MAIN VIEW
  ======================================== */

  return (
    <div
      className={`clb-inbox ${
        isMobileView ? "clb-inbox--mobile" : "clb-inbox--desktop"
      }`}
    >
      {/* ====================================
          ERROR
      ==================================== */}

      {error && <div className="clb-inbox__error">{error}</div>}

      {/* ====================================
          DESKTOP PREVIEW
      ==================================== */}

      {!isMobileView && (
        <section className="clb-inbox__preview-pane">
          <EmailPreview email={activeEmail} />
        </section>
      )}

      {/* ====================================
          EMAIL LIST
      ==================================== */}

      <section className="clb-inbox__list-pane">
        <EmailList
          emails={viewEmails}
          activeEmailId={activeEmailId}
          onSelect={handleSelectEmail}
          loading={loading}
          error={error}
          hasMoreEmails={hasMoreEmails}
          loadingMore={loadingMore}
          onLoadMore={handleLoadMore}
          title={viewConfig.label}
        />
      </section>
    </div>
  );
}

export default Inbox;