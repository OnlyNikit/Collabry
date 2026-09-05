import {
  Link,
} from "react-router-dom";

import {
  Tag,
} from "lucide-react";

import {
  useLabels,
} from "../../context/LabelsContext";

import {
  useEmails,
} from "../../context/EmailContext";

import {
  useEmailLabels,
} from "../../context/EmailLabelsContext";

import {
  useMemo,
} from "react";

import "./Labels.css";


function Labels() {


  /* =====================================
     CONTEXT
  ===================================== */

  const {
    labels,
    loading,
    error,
  } = useLabels();


  const {
    emails,
  } = useEmails();


  const {
    getEmailLabels,
  } = useEmailLabels();


  /* =====================================
     LABEL STATS
  ===================================== */

  const labelsWithCounts =
    useMemo(() => {

      return labels.map(
        (label) => {

          const labelId =
            label._id ||
            label.id;


          const emailCount =
            emails.filter(
              (email) => {

                const emailId =
                  email.id ||
                  email._id;


                if (!emailId) {
                  return false;
                }


                const emailLabelIds =
                  getEmailLabels(
                    emailId
                  ) || [];


                return emailLabelIds.some(
                  (currentLabelId) =>
                    String(
                      currentLabelId
                    ) ===
                    String(
                      labelId
                    )
                );

              }
            ).length;


          return {

            ...label,

            labelId,

            emailCount,

          };

        }
      );

    }, [
      labels,
      emails,
      getEmailLabels,
    ]);


  /* =====================================
     LOADING
  ===================================== */

  if (loading) {

    return (

      <div className="clb-labels-page">

        <p>
          Loading labels...
        </p>

      </div>

    );

  }


  /* =====================================
     ERROR
  ===================================== */

  if (error) {

    return (

      <div className="clb-labels-page">

        <p>
          {error}
        </p>

      </div>

    );

  }


  /* =====================================
     PAGE
  ===================================== */

  return (

    <div className="clb-labels-page">


      {/* =====================================
         HEADER
      ===================================== */}

      <header className="clb-labels-page__header">


        <div>


          <div className="clb-labels-page__title">

            <Tag size={26} />

            <h1>
              Labels
            </h1>

          </div>


          <p>
            Organize and manage your emails
            by labels.
          </p>


        </div>


      </header>


      {/* =====================================
         LABEL GRID
      ===================================== */}

      <div className="clb-labels-grid">


        {labelsWithCounts.length === 0 ? (


          <div className="clb-labels-page__empty">

            <span>
              🏷️
            </span>

            <h2>
              No labels created yet
            </h2>

            <p>
              Create a label to organize
              your emails.
            </p>

          </div>


        ) : (


          labelsWithCounts.map(
            (label) => (


              <Link
                key={
                  label.labelId
                }
                to={
                  `/labels/${label.labelId}`
                }
                className="clb-label-card"
              >


                {/* ICON */}

                <div className="clb-label-card__icon">

                  {label.icon || "🏷️"}

                </div>


                {/* CONTENT */}

                <div className="clb-label-card__content">


                  <h2>
                    {label.name}
                  </h2>


                  <p>

                    {label.description ||
                      "No description"}

                  </p>


                  <span className="clb-label-card__count">

                    {label.emailCount}{" "}

                    {label.emailCount === 1
                      ? "email"
                      : "emails"}

                  </span>


                </div>


                {/* ARROW */}

                <span className="clb-label-card__arrow">

                  →

                </span>


              </Link>


            )
          )


        )}


      </div>


    </div>

  );

}


export default Labels;