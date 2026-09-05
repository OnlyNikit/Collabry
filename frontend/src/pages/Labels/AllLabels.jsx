import {
useMemo,
useState,
useEffect,
} from "react";

import {
useNavigate,
} from "react-router-dom";

import {
Plus,
Pencil,
Trash2,
} from "lucide-react";

import {
useEmails,
} from "../../context/EmailContext";

import {
useLabels,
} from "../../context/LabelsContext";

import {
useEmailLabels,
} from "../../context/EmailLabelsContext";

import LabelForm from "../../components/labels/LabelForm";

import "./AllLabels.css";

/* =====================================
DEFAULT LABEL DISPLAY ORDER
===================================== */

const LABEL_ORDER = [

"New Opportunity",

"Brand Inquiry",

"Potential Partnership",

"Negotiation",

"Proposal Sent",

"Awaiting Reply",

"Follow Up",

"Deal Confirmed",

"Contract",

"Content Required",

"Content Submitted",

"Awaiting Approval",

"Revision Required",

"Campaign Live",

"Payment Pending",

"Payment Received",

"Completed",

"Declined",

];

/* =====================================
ALL LABELS
===================================== */

function AllLabels() {

const navigate =
useNavigate();

/* =====================================
CONTEXT

FIX: emails aur labels ke apne "loading" states bhi
nikaal liye — pehle sirf isLoadingMappings/
emailLabelsLoading check ho raha tha, jo tab hi true
hota tha jab emails already load ho chuke hote the.
Jab tak emails ya labels khud fetch ho rahe hote,
stats seedha "0" dikha deta tha.
===================================== */

const {
emails,
loading: emailsLoading,
} = useEmails();

const {
labels,
loading: labelsLoading,
createLabel,
updateLabel,
deleteLabel,
} = useLabels();

const {
getEmailLabels,
fetchLabelsForEmails,
loading: emailLabelsLoading,
} = useEmailLabels();

/* =====================================
STATE
===================================== */

const [
isFormOpen,
setIsFormOpen,
] = useState(
false,
);

const [
editingLabel,
setEditingLabel,
] = useState(
null,
);

const [
isLoadingMappings,
setIsLoadingMappings,
] = useState(
false,
);

/* =====================================
COMBINED LOADING STATE

FIX: ab ye chaar cheezein cover karta hai —
1. emails khud fetch ho rahe hain (EmailContext)
2. labels khud fetch ho rahe hain (LabelsContext)
3. label-mappings fetch ho rahe hain (is page ka apna effect)
4. koi individual email-label request chal rahi hai

Jab tak in mein se KOI bhi true hai, stats "Loading..."
dikhayenge, "0" nahi.
===================================== */

const isLoading =
emailsLoading ||
labelsLoading ||
isLoadingMappings ||
emailLabelsLoading;

/* =====================================
LOAD EMAIL LABEL MAPPINGS
===================================== */

useEffect(() => {


if (
  !emails ||
  emails.length === 0
) {
  return;
}


let isMounted =
  true;


async function loadMappings() {

  try {

    if (
      isMounted
    ) {

      setIsLoadingMappings(
        true,
      );

    }


    const emailIds = emails
      .map(
        (email) =>
          email.id ||
          email._id,
      )
      .filter(
        Boolean,
      );


    await fetchLabelsForEmails(
      emailIds,
    );

  } catch (
    error
  ) {

    console.error(
      "Failed to load email label mappings:",
      error,
    );

  } finally {

    if (
      isMounted
    ) {

      setIsLoadingMappings(
        false,
      );

    }

  }

}


loadMappings();


return () => {

  isMounted =
    false;

};


}, [
emails,
fetchLabelsForEmails,
]);

/* =====================================
SORT LABELS IN REQUIRED SEQUENCE
===================================== */

const sortedLabels =
useMemo(() => {


  if (
    !Array.isArray(
      labels,
    )
  ) {

    return [];

  }


  return [
    ...labels,
  ].sort(
    (
      labelA,
      labelB,
    ) => {

      const nameA =
        labelA?.name?.trim() ||
        "";


      const nameB =
        labelB?.name?.trim() ||
        "";


      const indexA =
        LABEL_ORDER.indexOf(
          nameA,
        );


      const indexB =
        LABEL_ORDER.indexOf(
          nameB,
        );


      /*
        Both labels are part of
        the default sequence.
      */

      if (
        indexA !== -1 &&
        indexB !== -1
      ) {

        return (
          indexA -
          indexB
        );

      }


      /*
        Default labels always
        appear before custom labels.
      */

      if (
        indexA !== -1
      ) {

        return -1;

      }


      if (
        indexB !== -1
      ) {

        return 1;

      }


      /*
        Custom labels:
        keep a stable alphabetical
        order after default labels.
      */

      return nameA.localeCompare(
        nameB,
      );

    },
  );

}, [
  labels,
]);


 /*                                                                         |
| -------------------------------------------------------------------------- |
| LABEL STATS                                                                |
| -------------------------------------------------------------------------- |
| */                                                                         

const labelStats =
useMemo(() => {


  return sortedLabels.map(
    (
      label,
    ) => {

      const labelId =
        label._id ||
        label.id;


      const emailCount =
        emails.filter(
          (
            email,
          ) => {

            const emailId =
              email.id ||
              email._id;


            if (
              !emailId
            ) {

              return false;

            }


            const emailLabelIds =
              getEmailLabels(
                emailId,
              ) || [];


            return emailLabelIds.some(
              (
                id,
              ) =>

                String(
                  id,
                ) ===
                String(
                  labelId,
                ),

            );

          },
        ).length;


      return {

        ...label,

        id:
          labelId,

        labelId,

        emailCount,

      };

    },
  );

}, [
  sortedLabels,
  emails,
  getEmailLabels,
]);


/* =====================================
TOTAL LABELED EMAILS
===================================== */

const totalLabeledEmails =
useMemo(() => {


  return emails.filter(
    (
      email,
    ) => {

      const emailId =
        email.id ||
        email._id;


      if (
        !emailId
      ) {

        return false;

      }


      const emailLabelIds =
        getEmailLabels(
          emailId,
        ) || [];


      return (
        emailLabelIds.length >
        0
      );

    },
  ).length;

}, [
  emails,
  getEmailLabels,
]);


/*                                                                         |
| -------------------------------------------------------------------------- |
| CREATE LABEL                                                               |
| -------------------------------------------------------------------------- |
| */                                                                         

function handleCreateLabel() {


setEditingLabel(
  null,
);

setIsFormOpen(
  true,
);


}

 /*                                                                         |
| -------------------------------------------------------------------------- |
| EDIT LABEL                                                                 |
| -------------------------------------------------------------------------- |
| */                                                                         

function handleEditLabel(
event,
label,
) {


event.stopPropagation();


setEditingLabel(
  label,
);


setIsFormOpen(
  true,
);


}

 /*                                                                         |
| -------------------------------------------------------------------------- |
| SAVE LABEL                                                                 |
| -------------------------------------------------------------------------- |
| */                                                                         

async function handleSaveLabel(
data,
) {


try {

  if (
    editingLabel
  ) {

    const labelId =
      editingLabel._id ||
      editingLabel.id;


    await updateLabel(
      labelId,
      data,
    );

  } else {

    await createLabel(
      data,
    );

  }


  setIsFormOpen(
    false,
  );


  setEditingLabel(
    null,
  );

} catch (
  error
) {

  window.alert(
    error.message ||
      "Something went wrong while saving the label.",
  );

}


}

/*                                                                         |
| -------------------------------------------------------------------------- |
| CLOSE FORM                                                                 |
| -------------------------------------------------------------------------- |
| */                                                                         

function handleCloseForm() {


setIsFormOpen(
  false,
);

setEditingLabel(
  null,
);


}

 /*                                                                         |
| -------------------------------------------------------------------------- |
| DELETE LABEL                                                               |
| -------------------------------------------------------------------------- |
| */                                                                         

async function handleDeleteLabel(
event,
label,
) {


event.stopPropagation();


const shouldDelete =
  window.confirm(
    `Delete "${label.name}" label?`,
  );


if (
  !shouldDelete
) {

  return;

}


try {

  const labelId =
    label._id ||
    label.id;


  await deleteLabel(
    labelId,
  );

} catch (
  error
) {

  window.alert(
    error.message ||
      "Failed to delete label.",
  );

}


}

 /*                                                                         |
| -------------------------------------------------------------------------- |
| NAVIGATE TO LABEL                                                          |
| -------------------------------------------------------------------------- |
| */                                                                         

function handleOpenLabel(
labelId,
) {


navigate(
  `/labels/${labelId}`,
);


}

/* =====================================
RENDER
===================================== */

return (


<div className="clb-all-labels">


  {/* HEADER */}

  <header className="clb-all-labels__header">


    <div>


      <p className="clb-all-labels__eyebrow">

        Email Organization

      </p>


      <h1>

        All Labels

      </h1>


      <p className="clb-all-labels__description">

        Organize and manage your
        collaboration emails.

      </p>


    </div>


    <div className="clb-all-labels__header-right">


      {/* STATS */}

      <div className="clb-all-labels__stats">


        <div className="clb-all-labels__stat">

          <strong>

            {labelsLoading
              ? "..."
              : labels.length}

          </strong>

          <span>

            Labels

          </span>

        </div>


        <div className="clb-all-labels__stat">

          <strong>

            {isLoading
              ? "..."
              : totalLabeledEmails}

          </strong>

          <span>

            Labeled Emails

          </span>

        </div>


      </div>


      {/* CREATE BUTTON */}

      <button
        type="button"
        className="clb-btn clb-btn--primary"
        onClick={
          handleCreateLabel
        }
      >

        <Plus size={18} />

        Create Label

      </button>


    </div>


  </header>


  {/* LABELS GRID */}

  {labelStats.length > 0 && (

    <section className="clb-all-labels__grid">


      {labelStats.map(
        (
          label,
        ) => (

          <article
            key={
              label.labelId
            }
            className={
              `clb-label-card clb-label-card--${
                label.color ||
                "pink"
              }`
            }
          >


            {/* MAIN CLICKABLE AREA */}

            <button
              type="button"
              className="clb-label-card__main"
              onClick={() =>
                handleOpenLabel(
                  label.labelId,
                )
              }
            >


              <div className="clb-label-card__top">


                <span className="clb-label-card__icon">

                  {label.icon ||
                    "🏷️"}

                </span>


                <span className="clb-label-card__arrow">

                  →

                </span>


              </div>


              <div className="clb-label-card__content">


                <h2>

                  {label.name}

                </h2>


                {label.description && (

                  <p className="clb-label-card__description">

                    {label.description}

                  </p>

                )}


                <span className="clb-label-card__count">


                  {isLoading
                    ? "Loading..."
                    : (
                        <>
                          {label.emailCount}{" "}

                          {label.emailCount ===
                          1
                            ? "email"
                            : "emails"}

                        </>
                      )}


                </span>


              </div>


            </button>


            {/* ACTIONS */}

            <div className="clb-label-card__actions">


              {/* EDIT */}

              <button
                type="button"
                className="clb-label-card__action"
                onClick={(
                  event,
                ) =>
                  handleEditLabel(
                    event,
                    label,
                  )
                }
                aria-label={`Edit ${label.name}`}
                title="Edit Label"
              >

                <Pencil size={16} />

              </button>


              {/* DELETE */}

              <button
                type="button"
                className="
                  clb-label-card__action
                  clb-label-card__action--delete
                "
                onClick={(
                  event,
                ) =>
                  handleDeleteLabel(
                    event,
                    label,
                  )
                }
                aria-label={`Delete ${label.name}`}
                title="Delete Label"
              >

                <Trash2 size={16} />

              </button>


            </div>


          </article>

        ),
      )}


    </section>

  )}


  {/* EMPTY STATE */}

  {labelStats.length === 0 && !labelsLoading && (

    <div className="clb-all-labels__empty">


      <span>

        🏷️

      </span>


      <h2>

        No labels yet

      </h2>


      <p>

        Create labels to organize
        your collaboration emails.

      </p>


      <button
        type="button"
        className="clb-btn clb-btn--primary"
        onClick={
          handleCreateLabel
        }
      >

        <Plus size={18} />

        Create Your First Label

      </button>


    </div>

  )}


  {/* CREATE / EDIT FORM */}

  <LabelForm
    isOpen={
      isFormOpen
    }
    onClose={
      handleCloseForm
    }
    onSave={
      handleSaveLabel
    }
    initialValues={
      editingLabel ||
      {}
    }
    isEditMode={
      Boolean(
        editingLabel,
      )
    }
  />


</div>


);

}

export default AllLabels;