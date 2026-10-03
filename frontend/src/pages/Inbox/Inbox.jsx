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
    emails, // "viewEmails" ki jagah
    activeEmailId,
    activeEmail,
    selectEmail,
    markAsRead,
    clearActiveEmail,
    currentView,
    changeView,
    loading,
    loadingMore,
    error,
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
  PREVIEW EMAIL

  Click ke turant baad context me activeEmail abhi
  set ho raha hota hai, isliye list wale record ko
  fallback rakho. Preview kabhi "Select an email"
  nahi dikhayega, seedha loader dikhayega.
  ======================================== */

  const previewEmail = useMemo(() => {
    if (activeEmail) {
      return activeEmail;
    }

    if (!activeEmailId) {
      return null;
    }

    return (
      emails.find((email) => String(email.id) === String(activeEmailId)) || null
    );
  }, [activeEmail, activeEmailId, emails]);

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

  FIX: pehle yahan `await selectEmail()` ke BAAD
  mobile preview khulta tha, isliye thread load hone
  tak list hi dikhti rehti thi.

  Ab click hote hi:
    1. mobile par preview turant khulta hai
    2. selectEmail() start hota hai (await nahi)
       -> context turant activeEmailId set karta hai
          aur isThreadReady = false, to preview ke
          andar "Loading conversation..." loader dikhta hai
    3. thread load hone ke baad unread email read mark hota hai
  ======================================== */

  function handleSelectEmail(emailId) {
    const selectedEmail = emails.find(
      (email) => String(email.id) === String(emailId),
    );

    // 1) Turant preview kholo
    if (isMobileView) {
      setMobileView("preview");
    }

    // 2) Thread load shuru karo (await nahi karna)
    selectEmail(emailId)
      .then(async () => {
        // 3) Thread aane ke baad read mark karo
        if (selectedEmail && selectedEmail.unread) {
          try {
            await markAsRead(emailId);
          } catch (markError) {
            console.error("Failed to mark email as read:", markError);
          }
        }
      })
      .catch((selectError) => {
        console.error("Failed to select email:", selectError);
      });
  }

  /* ========================================
  MOBILE BACK
  ======================================== */

  function handleBackToList() {
    // Load beech me chhod diya ho toh wo bhi cancel ho jaye
    clearActiveEmail();

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
          <EmailPreview email={previewEmail} />
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
          <EmailPreview email={previewEmail} />
        </section>
      )}

      {/* ====================================
          EMAIL LIST
      ==================================== */}

      <section className="clb-inbox__list-pane">
        <EmailList
          emails={emails}
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