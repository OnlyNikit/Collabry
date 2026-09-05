import { useMemo, useEffect } from "react";

import { Link, useParams } from "react-router-dom";

import { ArrowLeft, Tag } from "lucide-react";

import EmailList from "../../components/inbox/EmailList";
import EmailPreview from "../../components/inbox/EmailPreview";

import { useLabels } from "../../context/LabelsContext";

import { useEmails } from "../../context/EmailContext";

import { useEmailLabels } from "../../context/EmailLabelsContext";

import "./LabelDetails.css";

function LabelDetail() {
  const { labelId } = useParams();

  /* =====================================
     CONTEXT
  ===================================== */

  const { getLabel, loading: labelsLoading } = useLabels();

  const {
    // FIX: use the full shared pool (all views) to search across
    // every email for this label — that part was already correct.
    emails,
    loading: emailsLoading,

    // FIX: these come from the SAME context Inbox.jsx uses. Selecting
    // through selectEmail() is what actually fetches an email's full
    // body/thread — that's the piece that was missing before, which
    // is why content only showed up for emails already opened in Inbox.
    activeEmailId,
    activeEmail,
    selectEmail,
    clearActiveEmail,
  } = useEmails();

  const {
    getEmailLabels,
    fetchEmailLabels,
    // FIX: getEmailLabels() ALWAYS returns an array (defaults to []),
    // it never returns undefined — so the old `existingLabels ===
    // undefined` check below never fired, meaning this page's own
    // per-email label fetch never actually ran unless AllLabels had
    // already loaded that email's labels first. isEmailLabelsLoaded()
    // is the real "have we fetched this yet" check.
    isEmailLabelsLoaded,
  } = useEmailLabels();

  /* =====================================
     GET CURRENT LABEL
  ===================================== */

  const label = getLabel(labelId);

  /* =====================================
     LOAD LABELS FOR EMAILS
  ===================================== */

  useEffect(() => {
    if (!emails?.length) {
      return;
    }

    emails.forEach((email) => {
      const emailId = email.id || email._id;

      if (!emailId) {
        return;
      }

      if (!isEmailLabelsLoaded(emailId)) {
        fetchEmailLabels(emailId).catch((error) => {
          console.error("Failed to fetch email labels:", error);
        });
      }
    });
  }, [emails, isEmailLabelsLoaded, fetchEmailLabels]);

  /* =====================================
     FILTER EMAILS BY CURRENT LABEL
  ===================================== */

  const filteredEmails = useMemo(() => {
    if (!emails?.length) {
      return [];
    }

    return emails.filter((email) => {
      const emailId = email.id || email._id;

      if (!emailId) {
        return false;
      }

      const emailLabelIds = getEmailLabels(emailId);

      /*
        Labels are still loading.
      */

      if (!Array.isArray(emailLabelIds)) {
        return false;
      }

      return emailLabelIds.some((id) => String(id) === String(labelId));
    });
  }, [emails, labelId, getEmailLabels]);

  /* =====================================
     RESET SELECTION WHEN LABEL CHANGES

     FIX: clears the SHARED context selection (not a local
     one), so switching labels doesn't leave a stale email
     from a different label (or from Inbox) selected.
  ===================================== */

  useEffect(() => {
    clearActiveEmail();
  }, [labelId, clearActiveEmail]);

  /* =====================================
     SELECT FIRST EMAIL WHEN FILTERED
     EMAILS CHANGE

     FIX: calls the context's selectEmail() instead of just
     setting a local id — this is what actually fetches the
     email's full body/thread from the API.
  ===================================== */

  useEffect(() => {
    if (filteredEmails.length === 0) {
      return;
    }

    const selectedStillExists = filteredEmails.some((email) => {
      const emailId = email.id || email._id;

      return String(emailId) === String(activeEmailId);
    });

    if (!activeEmailId || !selectedStillExists) {
      const firstEmailId = filteredEmails[0].id || filteredEmails[0]._id;

      selectEmail(firstEmailId).catch((error) => {
        console.error("Failed to select first label email:", error);
      });
    }
  }, [filteredEmails, activeEmailId, selectEmail]);

  /* =====================================
     HANDLE EMAIL SELECTION

     FIX: routes through the shared context's selectEmail()
     — same function Inbox.jsx uses — so the full email body
     loads no matter which page you opened it from.
  ===================================== */

  function handleSelectEmail(emailId) {
    if (!emailId) {
      return;
    }

    selectEmail(emailId).catch((error) => {
      console.error("Failed to select email:", error);
    });
  }

  /* =====================================
     LOADING
  ===================================== */

  if (labelsLoading || emailsLoading) {
    return (
      <div className="clb-label-detail">
        <p>Loading...</p>
      </div>
    );
  }

  /* =====================================
     LABEL NOT FOUND
  ===================================== */

  if (!label) {
    return (
      <div className="clb-label-detail">
        <div className="clb-label-detail__not-found">
          <h1>Label not found</h1>

          <Link to="/labels" className="clb-btn clb-btn--ghost">
            Back to Labels
          </Link>
        </div>
      </div>
    );
  }

  /* =====================================
     PAGE
  ===================================== */

  return (
    <div className="clb-label-detail">
      {/* ===============================
          HEADER
      =============================== */}

      <header className="clb-label-detail__header">
        <Link to="/labels" className="clb-label-detail__back">
          <ArrowLeft size={18} />
          Back to Labels
        </Link>

        <div className="clb-label-detail__title">
          <span className="clb-label-detail__icon">{label.icon || "🏷️"}</span>

          <div>
            <div className="clb-label-detail__heading">
              <Tag size={20} />
              <h1>{label.name}</h1>
            </div>

            <p>
              {filteredEmails.length}{" "}
              {filteredEmails.length === 1 ? "email" : "emails"}
            </p>
          </div>
        </div>
      </header>

      {/* ===============================
          INBOX
      =============================== */}

      <div className="clb-label-detail__inbox">
        {/* ===============================
            EMAIL LIST
        =============================== */}

        <section className="clb-label-detail__list">
          <EmailList
            emails={filteredEmails}
            activeEmailId={activeEmailId}
            onSelect={handleSelectEmail}
          />
        </section>

        {/* ===============================
            EMAIL PREVIEW
        =============================== */}

        <section className="clb-label-detail__preview">
          {activeEmail ? (
            <EmailPreview
              /*
                Force a fresh preview whenever the selected
                email changes.
              */
              key={String(activeEmailId || "")}
              email={activeEmail}
            />
          ) : (
            <div className="clb-label-detail__empty">
              <span>🏷️</span>

              <h2>No emails</h2>

              <p>There are no emails with this label yet.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default LabelDetail;