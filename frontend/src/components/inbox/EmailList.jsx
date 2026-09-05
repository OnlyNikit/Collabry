import EmailListItem from "./EmailListItem";
import EmailListItemSkeleton from "../common/emailListLoader";

import "./EmailList.css";


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


  /* =====================================
     HANDLE EMAIL SELECT
  ===================================== */

  function handleSelectEmail(
    emailOrId,
  ) {

    /*
      EmailListItem may send either:

      1. email object
      OR
      2. email ID

      This handles both cases safely.
    */

    if (
      typeof onSelect !==
      "function"
    ) {
      return;
    }


    if (
      typeof emailOrId ===
      "object" &&
      emailOrId !== null
    ) {

      const emailId =
        emailOrId.id ||
        emailOrId._id;


      if (emailId) {

        onSelect(emailId);

      }

      return;

    }


    onSelect(emailOrId);

  }


  /* =====================================
     LOADING
  ===================================== */

  if (loading) {

    return (

      <div className="clb-email-list">

        {Array.from(
          { length: 18 },
        ).map(
          (_, index) => (

            <EmailListItemSkeleton
              key={
                `email-skeleton-${index}`
              }
            />

          ),
        )}

      </div>

    );

  }


  /* =====================================
     ERROR
  ===================================== */

  if (error) {

    return (

      <div className="clb-email-list">

        <div className="clb-email-list__empty">

          <p>
            {error}
          </p>

        </div>

      </div>

    );

  }


  /* =====================================
     EMPTY
  ===================================== */

  if (
    !Array.isArray(emails) ||
    emails.length === 0
  ) {

    return (

      <div className="clb-email-list">

        <div className="clb-email-list__empty">

          <p>
            No emails here.
          </p>

        </div>

      </div>

    );

  }


  /* =====================================
     EMAIL LIST
  ===================================== */

  return (

    <div className="clb-email-list">


      {emails.map(
        (email) => {

          const emailId =
            email.id ||
            email._id;


          if (!emailId) {
            return null;
          }


          return (

            <EmailListItem
              key={
                String(emailId)
              }

              email={
                email
              }

              isActive={
                String(emailId) ===
                String(activeEmailId)
              }

              onSelect={
                handleSelectEmail
              }
            />

          );

        },
      )}


      {/* ===============================
          LOAD MORE
      =============================== */}

      {hasMoreEmails && (

        <div className="clb-email-list__load-more">

          <button
            type="button"
            className="
              clb-email-list__load-more-btn
            "
            onClick={
              onLoadMore
            }
            disabled={
              loadingMore ||
              typeof onLoadMore !==
                "function"
            }
          >

            {loadingMore
              ? "Loading..."
              : "Load More"}

          </button>

        </div>

      )}


    </div>

  );

}


export default EmailList;