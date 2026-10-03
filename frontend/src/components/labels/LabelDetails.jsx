import { useMemo, useEffect, useState } from "react";

import { Link, useParams } from "react-router-dom";

import { ArrowLeft, Tag, ChevronLeft } from "lucide-react";

import EmailList from "../../components/inbox/EmailList";
import EmailPreview from "../../components/inbox/EmailPreview";

import { useLabels } from "../../context/LabelsContext";

import { useEmails } from "../../context/EmailContext";

import { useEmailLabels } from "../../context/EmailLabelsContext";

import "./LabelDetails.css";

function LabelDetail() {
  const { labelId } = useParams();

  // Mobile only: true = preview dikhao, false = list dikhao.
  // Sirf user ke click par true hota hai (auto-select se nahi).
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  /* =====================================
     CONTEXT
  ===================================== */

  const { getLabel, loading: labelsLoading } = useLabels();

  const {
    emails,
    loading: emailsLoading,
    activeEmailId,
    activeEmail,
    selectEmail,
    clearActiveEmail,
  } = useEmails();

  const { getEmailLabels, fetchEmailLabels, isEmailLabelsLoaded } =
    useEmailLabels();

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

      if (!Array.isArray(emailLabelIds)) {
        return false;
      }

      return emailLabelIds.some((id) => String(id) === String(labelId));
    });
  }, [emails, labelId, getEmailLabels]);

  /* =====================================
     RESET SELECTION WHEN LABEL CHANGES
  ===================================== */

  useEffect(() => {
    clearActiveEmail();
    setMobilePreviewOpen(false);
  }, [labelId, clearActiveEmail]);

  /* =====================================
     SELECT FIRST EMAIL WHEN FILTERED
     EMAILS CHANGE
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
  ===================================== */

  function handleSelectEmail(emailId) {
    if (!emailId) {
      return;
    }

    // Mobile par list hide karke preview dikhao
    setMobilePreviewOpen(true);

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

      <div
        className={`clb-label-detail__inbox ${
          mobilePreviewOpen ? "clb-label-detail__inbox--preview-open" : ""
        }`}
      >
        {/* EMAIL LIST */}
        <section className="clb-label-detail__list">
          <EmailList
            emails={filteredEmails}
            activeEmailId={activeEmailId}
            onSelect={handleSelectEmail}
          />
        </section>

        {/* EMAIL PREVIEW */}
        <section className="clb-label-detail__preview">
          {/* Sirf mobile par dikhega */}
          <button
            type="button"
            className="clb-label-detail__mobile-back"
            onClick={() => setMobilePreviewOpen(false)}
          >
            <ChevronLeft size={18} />
            Back to emails
          </button>

          {activeEmail ? (
            <EmailPreview
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