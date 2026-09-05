import {
  useEffect,
  useState,
} from "react";


import {
  X,
} from "lucide-react";


import "./CollaborationForm.css";


const STATUS_OPTIONS = [

  {
    value: "script_pending",
    label: "Script Pending",
  },

  {
    value: "script_ready",
    label: "Script Ready",
  },

  {
    value: "editing",
    label: "Editing",
  },

  {
    value: "review",
    label: "Internal Review",
  },

  {
    value: "revision",
    label: "Revision Required",
  },

  {
    value: "awaiting_approval",
    label: "Awaiting Approval",
  },

  {
    value: "approved",
    label: "Approved",
  },

  {
    value: "live",
    label: "Live",
  },

  {
    value: "completed",
    label: "Completed",
  },

];


function CollaborationForm({

  isOpen,

  onClose,

  onSave,

  initialValues = {},

  isEditMode,

  isSaving = false,

  error,

}) {


  const [
    formData,
    setFormData,
  ] = useState({

    brandName: "",

    contactName: "",

    title: "",

    status:
      "script_pending",

    priority:
      "medium",

    editor: "",

    platform:
      "YouTube",

    amount: "",

    currency:
      "INR",

    paymentStatus:
      "not_discussed",

    deadline: "",

    notes: "",

  });


  /* =====================================
     LOAD INITIAL VALUES
  ===================================== */

  useEffect(() => {

    if (!isOpen) {
      return;
    }


    let formattedDeadline =
      "";


    if (
      initialValues.deadline
    ) {

      const date =
        new Date(
          initialValues.deadline
        );


      if (
        !Number.isNaN(
          date.getTime()
        )
      ) {

        formattedDeadline =
          date
            .toISOString()
            .split("T")[0];

      }

    }


    setFormData({

      brandName:
        initialValues.brandName ||
        "",

      contactName:
        initialValues.contactName ||
        "",

      title:
        initialValues.title ||
        "",

      status:
        initialValues.status ||
        "script_pending",

      priority:
        initialValues.priority ||
        "medium",

      editor:
        initialValues.editor ||
        "",

      platform:
        initialValues.platform ||
        "YouTube",

      amount:
        initialValues.amount ??
        "",

      currency:
        initialValues.currency ||
        "INR",

      paymentStatus:
        initialValues.paymentStatus ||
        "not_discussed",

      deadline:
        formattedDeadline,

      notes:
        initialValues.notes ||
        "",

    });

  }, [
    isOpen,
    initialValues,
  ]);


  if (!isOpen) {
    return null;
  }


  /* =====================================
     UPDATE FIELD
  ===================================== */

  function updateField(
    field,
    value
  ) {

    setFormData(
      (previous) => ({

        ...previous,

        [field]:
          value,

      })
    );

  }


  /* =====================================
     SUBMIT
  ===================================== */

  async function handleSubmit(
    event
  ) {

    event.preventDefault();


    await onSave({

      ...formData,

      amount:
        formData.amount !== ""
          ? Number(
              formData.amount
            )
          : 0,

      deadline:
        formData.deadline ||
        null,

    });

  }


  return (

    <div
      className="clb-collab-form-backdrop"
      onClick={
        isSaving
          ? undefined
          : onClose
      }
    >

      <div
        className="clb-collab-form-modal"
        onClick={
          (event) =>
            event.stopPropagation()
        }
      >


        {/* HEADER */}

        <header
          className="clb-collab-form-modal__header"
        >

          <div>

            <h2>

              {isEditMode
                ? "Edit Collaboration"
                : "Create Collaboration"}

            </h2>


            <p>

              Manage the project
              from script to completion.

            </p>

          </div>


          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close form"
          >

            <X size={20} />

          </button>

        </header>


        {/* FORM */}

        <form
          className="clb-collab-form"
          onSubmit={
            handleSubmit
          }
        >


          {/* ERROR */}

          {error && (

            <div
              className="clb-collab-form__error"
            >

              {error}

            </div>

          )}


          {/* BRAND */}

          <div
            className="clb-collab-form__section"
          >

            <h3>
              Brand Details
            </h3>


            <div
              className="clb-collab-form__grid"
            >

              <label>

                Brand Name

                <input
                  required
                  disabled={isSaving}
                  value={
                    formData.brandName
                  }
                  onChange={
                    (event) =>
                      updateField(
                        "brandName",
                        event.target.value
                      )
                  }
                  placeholder="e.g. Nova AI"
                />

              </label>


              <label>

                Contact Person

                <input
                  disabled={isSaving}
                  value={
                    formData.contactName
                  }
                  onChange={
                    (event) =>
                      updateField(
                        "contactName",
                        event.target.value
                      )
                  }
                  placeholder="Client name"
                />

              </label>

            </div>

          </div>


          {/* PROJECT */}

          <div
            className="clb-collab-form__section"
          >

            <h3>
              Project Details
            </h3>


            <label>

              Collaboration Title

              <input
                required
                disabled={isSaving}
                value={
                  formData.title
                }
                onChange={
                  (event) =>
                    updateField(
                      "title",
                      event.target.value
                    )
                }
                placeholder="Campaign title"
              />

            </label>


            <div
              className="clb-collab-form__grid"
            >

              <label>

                Platform

                <select
                  disabled={isSaving}
                  value={
                    formData.platform
                  }
                  onChange={
                    (event) =>
                      updateField(
                        "platform",
                        event.target.value
                      )
                  }
                >

                  <option value="YouTube">
                    YouTube
                  </option>

                  <option value="Instagram">
                    Instagram
                  </option>

                  <option value="TikTok">
                    TikTok
                  </option>

                  <option value="Multiple Platforms">
                    Multiple Platforms
                  </option>

                  <option value="Other">
                    Other
                  </option>

                </select>

              </label>


              <label>

                Editor

                <input
                  disabled={isSaving}
                  value={
                    formData.editor
                  }
                  onChange={
                    (event) =>
                      updateField(
                        "editor",
                        event.target.value
                      )
                  }
                  placeholder="Assign editor"
                />

              </label>

            </div>

          </div>


          {/* STATUS */}

          <div
            className="clb-collab-form__section"
          >

            <h3>
              Production Status
            </h3>


            <div
              className="clb-collab-form__grid"
            >

              <label>

                Status

                <select
                  disabled={isSaving}
                  value={
                    formData.status
                  }
                  onChange={
                    (event) =>
                      updateField(
                        "status",
                        event.target.value
                      )
                  }
                >

                  {STATUS_OPTIONS.map(
                    (option) => (

                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >

                        {option.label}

                      </option>

                    )
                  )}

                </select>

              </label>


              <label>

                Priority

                <select
                  disabled={isSaving}
                  value={
                    formData.priority
                  }
                  onChange={
                    (event) =>
                      updateField(
                        "priority",
                        event.target.value
                      )
                  }
                >

                  <option value="low">
                    Low
                  </option>

                  <option value="medium">
                    Medium
                  </option>

                  <option value="high">
                    High
                  </option>

                </select>

              </label>


              <label>

                Deadline

                <input
                  type="date"
                  disabled={isSaving}
                  value={
                    formData.deadline
                  }
                  onChange={
                    (event) =>
                      updateField(
                        "deadline",
                        event.target.value
                      )
                  }
                />

              </label>

            </div>

          </div>


          {/* PAYMENT */}

          <div
            className="clb-collab-form__section"
          >

            <h3>
              Payment
            </h3>


            <div
              className="clb-collab-form__grid"
            >

              <label>

                Amount

                <input
                  type="number"
                  min="0"
                  disabled={isSaving}
                  value={
                    formData.amount
                  }
                  onChange={
                    (event) =>
                      updateField(
                        "amount",
                        event.target.value
                      )
                  }
                  placeholder="25000"
                />

              </label>


              <label>

                Currency

                <select
                  disabled={isSaving}
                  value={
                    formData.currency
                  }
                  onChange={
                    (event) =>
                      updateField(
                        "currency",
                        event.target.value
                      )
                  }
                >

                  <option value="INR">
                    INR (₹)
                  </option>

                  <option value="USD">
                    USD ($)
                  </option>

                  <option value="EUR">
                    EUR (€)
                  </option>

                </select>

              </label>


              <label>

                Payment Status

                <select
                  disabled={isSaving}
                  value={
                    formData.paymentStatus
                  }
                  onChange={
                    (event) =>
                      updateField(
                        "paymentStatus",
                        event.target.value
                      )
                  }
                >

                  <option value="not_discussed">
                    Not Discussed
                  </option>

                  <option value="pending">
                    Pending
                  </option>

                  <option value="partially_paid">
                    Partially Paid
                  </option>

                  <option value="paid">
                    Paid
                  </option>

                </select>

              </label>

            </div>

          </div>


          {/* NOTES */}

          <div
            className="clb-collab-form__section"
          >

            <label>

              Notes / Requirements

              <textarea
                rows="4"
                disabled={isSaving}
                value={
                  formData.notes
                }
                onChange={
                  (event) =>
                    updateField(
                      "notes",
                      event.target.value
                    )
                }
                placeholder="Add client requirements, video brief, revision notes..."
              />

            </label>

          </div>


          {/* ACTIONS */}

          <div
            className="clb-collab-form__actions"
          >

            <button
              type="button"
              className="clb-btn clb-btn--ghost"
              onClick={
                onClose
              }
              disabled={
                isSaving
              }
            >

              Cancel

            </button>


            <button
              type="submit"
              className="clb-btn clb-btn--primary"
              disabled={
                isSaving
              }
            >

              {isSaving
                ? "Saving..."
                : isEditMode
                ? "Save Changes"
                : "Create Collaboration"}

            </button>

          </div>

        </form>

      </div>

    </div>

  );

}


export default
  CollaborationForm;