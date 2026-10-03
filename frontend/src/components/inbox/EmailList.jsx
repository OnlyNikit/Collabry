import { createPortal } from "react-dom";

import EmailListItem from "./EmailListItem";
import EmailListItemSkeleton from "../common/emailListLoader";

import { useEmails } from "../../context/EmailContext";

import "./EmailList.css";
import "./EmailListLoading.css";

function EmailList({
  emails = [],
  activeEmailId,
  onSelect,
  loading = false,
  error = null,
  hasMoreEmails = false,
  loadingMore = false,
  onLoadMore,
}) {
  /*
    Click hote hi context activeEmailId set kar deta hai aur
    isThreadReady = false. Jab tak thread load ho raha hai,
    chhoti screen par list ke upar loader dikhao.
    (Desktop par ye CSS se hidden rehta hai, kyunki wahan
    preview side mein khud loader dikhata hai.)
  */
  const { activeEmailId: pendingEmailId, isThreadReady } = useEmails();

  const isOpeningEmail = Boolean(pendingEmailId) && !isThreadReady;

  // DEBUG (zarurat ho toh uncomment karo, click par console dekho):
  // console.log("[EmailList]", { pendingEmailId, isThreadReady, isOpeningEmail });

  function handleSelectEmail(emailOrId) {
    if (typeof onSelect !== "function") {
      return;
    }

    if (typeof emailOrId === "object" && emailOrId !== null) {
      const emailId = emailOrId.id || emailOrId._id;

      if (emailId) {
        onSelect(emailId);
      }

      return;
    }

    if (emailOrId) {
      onSelect(emailOrId);
    }
  }

  if (loading) {
    return (
      <div className="clb-email-list">
        {Array.from({ length: 18 }).map((_, index) => (
          <EmailListItemSkeleton key={`email-skeleton-${index}`} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="clb-email-list">
        <div className="clb-email-list__empty">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!Array.isArray(emails) || emails.length === 0) {
    return (
      <div className="clb-email-list">
        <div className="clb-email-list__empty">
          <p>No emails here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="clb-email-list">
      {emails.map((email) => {
        const emailId = email.id || email._id;

        if (!emailId) {
          return null;
        }

        return (
          <EmailListItem
            key={String(emailId)}
            email={email}
            isActive={String(emailId) === String(activeEmailId)}
            onSelect={handleSelectEmail}
          />
        );
      })}

      {hasMoreEmails && (
        <div className="clb-email-list__load-more">
          <button
            type="button"
            className="clb-email-list__load-more-btn"
            onClick={onLoadMore}
            disabled={loadingMore || typeof onLoadMore !== "function"}
          >
            {loadingMore ? "Loading..." : "Load More"}
          </button>
        </div>
      )}

      {/*
        Portal: overlay seedha document.body mein render hota hai,
        taaki parent ke overflow / transform / z-index se kat na jaye.
      */}
      {isOpeningEmail &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="clb-email-list__pending"
            role="status"
            aria-live="polite"
          >
            <div className="clb-email-list__pending-box">
              <span className="clb-email-list__spinner" />
              <span>Loading conversation...</span>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export default EmailList;