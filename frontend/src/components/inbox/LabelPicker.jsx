import {
  useEffect,
  useState,
} from "react";

import {
  Loader2,
} from "lucide-react";

import {
  useLabels,
} from "../../context/LabelsContext";

import "./LabelPicker.css";


function LabelPicker({
  selectedIds = [],
  onSave,
  onClose,
}) {

  const {
    labels,
    loading,
  } = useLabels();


  /*
  |--------------------------------------------------------------------------
  | LOCAL SELECTED LABELS
  |--------------------------------------------------------------------------
  */

  const [
    localSelectedIds,
    setLocalSelectedIds,
  ] = useState(
    selectedIds
  );


  const [
    isSaving,
    setIsSaving,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState(null);


  /*
  |--------------------------------------------------------------------------
  | UPDATE LOCAL STATE WHEN EMAIL CHANGES
  |--------------------------------------------------------------------------
  */

  useEffect(
    () => {

      setLocalSelectedIds(
        selectedIds
      );

    },
    [
      selectedIds,
    ]
  );


  /*
  |--------------------------------------------------------------------------
  | TOGGLE LABEL
  |--------------------------------------------------------------------------
  */

  function handleToggle(
    labelId
  ) {

    if (isSaving) {
      return;
    }


    setError(
      null
    );


    setLocalSelectedIds(
      (previous) => {

        const exists =
          previous.some(
            (id) =>
              String(id) ===
              String(labelId)
          );


        /*
        REMOVE
        */

        if (exists) {

          return previous.filter(
            (id) =>
              String(id) !==
              String(labelId)
          );

        }


        /*
        ADD
        */

        return [
          ...previous,
          labelId,
        ];

      }
    );

  }


  /*
  |--------------------------------------------------------------------------
  | SAVE LABELS
  |--------------------------------------------------------------------------
  */

  async function handleSave() {

    if (
      typeof onSave !==
      "function"
    ) {
      return;
    }


    try {

      setError(
        null
      );

      setIsSaving(
        true
      );


      await onSave(
        localSelectedIds
      );


      /*
      Close picker
      after successful save
      */

      onClose?.();

    } catch (error) {

      console.error(
        "Failed to save labels:",
        error
      );


      setError(
        error.message ||
          "Failed to save labels."
      );

    } finally {

      setIsSaving(
        false
      );

    }

  }


  return (

    <div
      className="
        clb-label-picker
      "
    >


      {/* ======================================
          HEADER
      ====================================== */}

      <div
        className="
          clb-label-picker__header
        "
      >

        <span>
          Apply labels
        </span>


        <button
          type="button"
          className="
            clb-label-picker__close
          "
          onClick={onClose}
          disabled={isSaving}
          aria-label="Close"
        >
          ✕
        </button>

      </div>



      {/* ======================================
          LABEL LIST
      ====================================== */}

      <ul
        className="
          clb-label-picker__list
        "
      >

        {loading ? (

          <li
            className="
              clb-label-picker__empty
            "
          >
            Loading labels...
          </li>

        ) : labels.length === 0 ? (

          <li
            className="
              clb-label-picker__empty
            "
          >
            No labels available
          </li>

        ) : (

          labels.map(
            (label) => {


              const labelId =
                label._id ||
                label.id;


              const isSelected =
                localSelectedIds.some(
                  (id) =>
                    String(id) ===
                    String(labelId)
                );


              return (

                <li
                  key={labelId}
                >

                  <button
                    type="button"
                    className={
                      `clb-label-picker__option${
                        isSelected
                          ? " clb-label-picker__option--selected"
                          : ""
                      }`
                    }
                    onClick={() =>
                      handleToggle(
                        labelId
                      )
                    }
                    disabled={
                      isSaving
                    }
                  >


                    {/* CHECKBOX */}

                    <span
                      className="
                        clb-label-picker__checkbox
                      "
                    >

                      {isSelected
                        ? "✓"
                        : ""}

                    </span>



                    {/* ICON */}

                    <span
                      className="
                        clb-label-picker__icon
                      "
                    >

                      {
                        label.icon ||
                        "🏷️"
                      }

                    </span>



                    {/* NAME */}

                    <span
                      className="
                        clb-label-picker__name
                      "
                    >

                      {
                        label.name
                      }

                    </span>


                  </button>

                </li>

              );

            }
          )

        )}

      </ul>



      {/* ======================================
          ERROR
      ====================================== */}

      {error && (

        <div
          className="
            clb-label-picker__error
          "
          role="alert"
        >

          {error}

        </div>

      )}



      {/* ======================================
          FOOTER
      ====================================== */}

      <div
        className="
          clb-label-picker__footer
        "
      >

        <button
          type="button"
          className="
            clb-label-picker__save
          "
          onClick={
            handleSave
          }
          disabled={
            loading ||
            isSaving
          }
        >

          {isSaving ? (

            <>

              <Loader2
                size={16}
                className="
                  clb-label-picker__loader
                "
              />

              Saving...

            </>

          ) : (

            "Save Labels"

          )}

        </button>

      </div>


    </div>

  );

}


export default LabelPicker;