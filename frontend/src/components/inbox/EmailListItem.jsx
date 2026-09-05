
import "./EmailListItem.css";


function formatEmailTime(date) {

  if (!date) {
    return "";
  }


  const emailDate =
    new Date(date);


  if (
    Number.isNaN(
      emailDate.getTime(),
    )
  ) {
    return "";
  }


  const now =
    new Date();


  const isToday =
    emailDate.toDateString() ===
    now.toDateString();


  if (isToday) {

    return emailDate.toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit",
      },
    );

  }


  return emailDate.toLocaleDateString(
    [],
    {
      day: "numeric",
      month: "short",
    },
  );

}


function EmailListItem({
  email,
  isActive = false,
  onSelect,
}) {


  /* =====================================
     VALIDATE EMAIL
  ===================================== */

  if (!email) {
    return null;
  }


  /* =====================================
     GET EMAIL ID

     Supports both:
     - id
     - _id
  ===================================== */

  const emailId =
    email.id ||
    email._id;


  /* =====================================
     SENDER
  ===================================== */

  const senderName =
    email.from?.name ||
    email.from?.email ||
    email.sender ||
    email.senderEmail ||
    "Unknown Sender";


  const senderInitial =
    senderName
      .charAt(0)
      .toUpperCase() ||
    "?";


  /* =====================================
     TIME
  ===================================== */

  const time =
    formatEmailTime(
      email.date ||
      email.internalDate ||
      email.timestamp,
    );


  /* =====================================
     READ STATUS
  ===================================== */

  const unread =
    email.isRead === false ||
    email.unread === true;


  /* =====================================
     HANDLE CLICK
  ===================================== */

  function handleClick() {

    if (
      typeof onSelect !==
      "function"
    ) {
      return;
    }


    if (!emailId) {
      console.warn(
        "Cannot select email: Email ID is missing.",
        email,
      );

      return;
    }


    onSelect(
      emailId,
    );

  }


  /* =====================================
     RENDER
  ===================================== */

  return (

    <button
      type="button"

      className={
        "clb-email-item" +

        (
          isActive
            ? " clb-email-item--active"
            : ""
        ) +

        (
          unread
            ? " clb-email-item--unread"
            : ""
        )
      }

      onClick={
        handleClick
      }
    >


      {/* ===============================
          AVATAR
      =============================== */}

      <span className="clb-email-item__avatar">

        {senderInitial}

      </span>


      {/* ===============================
          EMAIL BODY
      =============================== */}

      <span className="clb-email-item__body">


        {/* TOP */}

        <span className="clb-email-item__top">


          <strong>

            {senderName}

          </strong>


          <span className="clb-email-item__time">

            {time}

          </span>


        </span>


        {/* SUBJECT */}

        <span className="clb-email-item__subject">


          {email.subject ||
            "(No Subject)"}


          {email.threadCount > 1 && (

            <span className="clb-email-item__thread-count">

              {" "}

              (
                {email.threadCount}
              )

            </span>

          )}


        </span>


        {/* SNIPPET */}

        <span className="clb-email-item__snippet">

          {email.snippet || ""}

        </span>


      </span>


    </button>

  );

}


export default EmailListItem;

