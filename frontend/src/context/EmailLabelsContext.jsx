import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";

import api from "../services/api";

/* =========================================================
   CONTEXT
========================================================= */

const EmailLabelsContext =
  createContext(null);


/* =========================================================
   HELPERS
========================================================= */

const normalizeEmailId =
  (emailId) => {
    if (
      emailId === null ||
      emailId === undefined
    ) {
      return "";
    }

    return String(emailId);
  };


const normalizeLabelId =
  (label) => {
    if (!label) {
      return null;
    }

    if (
      typeof label === "string"
    ) {
      return label;
    }

    return (
      label._id ||
      label.id ||
      null
    );
  };


const normalizeLabelIds =
  (labels) => {
    if (
      !Array.isArray(labels)
    ) {
      return [];
    }

    return [
      ...new Set(
        labels
          .map(
            normalizeLabelId
          )
          .filter(Boolean)
          .map(String)
      ),
    ];
  };


/* =========================================================
   PROVIDER
========================================================= */

export function EmailLabelsProvider({
  children,
}) {

  /*
    Structure:

    {
      "email-id-1": [
        "label-id-1",
        "label-id-2",
      ]
    }
  */

  const [
    emailLabels,
    setEmailLabels,
  ] = useState({});


  /*
    Successfully loaded email IDs
  */

  const loadedEmailIdsRef =
    useRef(
      new Set()
    );


  /*
    Currently running requests
  */

  const loadingRequestsRef =
    useRef(
      new Map()
    );


  const [
    loadingEmailIds,
    setLoadingEmailIds,
  ] = useState({});


  const [
    error,
    setError,
  ] = useState(null);


  /* =======================================================
     GET LABELS FOR EMAIL
  ======================================================= */

  const getEmailLabels =
    useCallback(
      (emailId) => {

        const normalizedEmailId =
          normalizeEmailId(
            emailId
          );


        if (
          !normalizedEmailId
        ) {
          return [];
        }


        return (
          emailLabels[
            normalizedEmailId
          ] || []
        );

      },
      [
        emailLabels,
      ]
    );


  /* =======================================================
     CHECK LOADED
  ======================================================= */

  const isEmailLabelsLoaded =
    useCallback(
      (emailId) => {

        const normalizedEmailId =
          normalizeEmailId(
            emailId
          );


        if (
          !normalizedEmailId
        ) {
          return false;
        }


        return loadedEmailIdsRef
          .current
          .has(
            normalizedEmailId
          );

      },
      []
    );


  /* =======================================================
     CHECK LOADING
  ======================================================= */

  const isEmailLabelsLoading =
    useCallback(
      (emailId) => {

        const normalizedEmailId =
          normalizeEmailId(
            emailId
          );


        if (
          !normalizedEmailId
        ) {
          return false;
        }


        return Boolean(
          loadingEmailIds[
            normalizedEmailId
          ]
        );

      },
      [
        loadingEmailIds,
      ]
    );


  /* =======================================================
     SYNC LABELS FROM EMAIL OBJECTS

     IMPORTANT:

     This fixes the initial empty label issue
     when the email API already returns labels.

     Example:

     email.labels
     email.labelIds
  ======================================================= */

  const syncEmailLabelsFromEmails =
    useCallback(
      (
        emails = [],
        options = {}
      ) => {

        const {
          markAsLoaded = false,
        } = options;


        if (
          !Array.isArray(
            emails
          )
        ) {
          return;
        }


        const updates = {};


        emails.forEach(
          (
            email
          ) => {

            if (!email) {
              return;
            }


            const emailId =
              normalizeEmailId(
                email.id ||
                email.messageId ||
                email.message?.id
              );


            if (
              !emailId
            ) {
              return;
            }


            /*
              Check multiple possible fields
            */

            const rawLabels =
              email.labels ||
              email.labelIds ||
              email.label_ids ||
              [];


            /*
              Only sync if labels
              actually exist as an array.

              We should not overwrite
              cached custom labels with []
              when backend doesn't send labels.
            */

            if (
              !Array.isArray(
                rawLabels
              )
            ) {
              return;
            }


            const labelIds =
              normalizeLabelIds(
                rawLabels
              );


            updates[
              emailId
            ] =
              labelIds;


            if (
              markAsLoaded
            ) {
              loadedEmailIdsRef
                .current
                .add(
                  emailId
                );
            }

          }
        );


        if (
          Object.keys(
            updates
          ).length === 0
        ) {
          return;
        }


        setEmailLabels(
          (
            previous
          ) => {

            const next =
              {
                ...previous,
              };


            Object.entries(
              updates
            ).forEach(
              ([
                emailId,
                labelIds,
              ]) => {

                next[
                  emailId
                ] =
                  [
                    ...new Set(
                      [
                        ...(
                          previous[
                            emailId
                          ] || []
                        ),
                        ...labelIds,
                      ]
                    ),
                  ];

              }
            );


            return next;

          }
        );

      },
      []
    );


  /* =======================================================
     FETCH LABELS FOR ONE EMAIL
  ======================================================= */

  const fetchEmailLabels =
    useCallback(
      async (
        emailId,
        options = {}
      ) => {

        const {
          force = false,
        } = options;


        const normalizedEmailId =
          normalizeEmailId(
            emailId
          );


        if (
          !normalizedEmailId
        ) {
          return [];
        }


        /*
          Return cached data
        */

        if (
          !force &&
          loadedEmailIdsRef
            .current
            .has(
              normalizedEmailId
            )
        ) {

          return (
            emailLabels[
              normalizedEmailId
            ] || []
          );

        }


        /*
          Return existing request
        */

        const existingRequest =
          loadingRequestsRef
            .current
            .get(
              normalizedEmailId
            );


        if (
          existingRequest
        ) {
          return existingRequest;
        }


        const request =
          (async () => {

            try {

              setError(
                null
              );


              setLoadingEmailIds(
                (
                  previous
                ) => ({
                  ...previous,

                  [normalizedEmailId]:
                    true,
                })
              );


              const response =
                await api.get(
                  `/email-labels/email/${encodeURIComponent(
                    normalizedEmailId
                  )}`
                );


              const responseData =
                response?.data;


              const labels =
                Array.isArray(
                  responseData
                )
                  ? responseData
                  : (
                      responseData
                        ?.labels ||
                      responseData
                        ?.data ||
                      []
                    );


              const labelIds =
                normalizeLabelIds(
                  labels
                );


              setEmailLabels(
                (
                  previous
                ) => ({
                  ...previous,

                  [normalizedEmailId]:
                    labelIds,
                })
              );


              loadedEmailIdsRef
                .current
                .add(
                  normalizedEmailId
                );


              return labelIds;

            } catch (
              err
            ) {

              console.error(
                "Fetch email labels error:",
                err
              );


              const message =
                err.response?.data
                  ?.message ||
                err.message ||
                "Failed to fetch email labels.";


              setError(
                message
              );


              loadedEmailIdsRef
                .current
                .delete(
                  normalizedEmailId
                );


              throw new Error(
                message
              );

            } finally {

              setLoadingEmailIds(
                (
                  previous
                ) => {

                  const updated =
                    {
                      ...previous,
                    };


                  delete updated[
                    normalizedEmailId
                  ];


                  return updated;

                }
              );


              loadingRequestsRef
                .current
                .delete(
                  normalizedEmailId
                );

            }

          })();


        loadingRequestsRef
          .current
          .set(
            normalizedEmailId,
            request
          );


        return request;

      },
      [
        emailLabels,
      ]
    );


  /* =======================================================
     FETCH LABELS FOR MULTIPLE EMAILS

     Only fetches emails whose labels
     are not already loaded.
  ======================================================= */

  const fetchLabelsForEmails =
    useCallback(
      async (
        emailIds = [],
        options = {}
      ) => {

        if (
          !Array.isArray(
            emailIds
          )
        ) {
          return [];
        }


        const {
          force = false,
        } = options;


        const uniqueEmailIds =
          [
            ...new Set(
              emailIds
                .map(
                  normalizeEmailId
                )
                .filter(Boolean)
            ),
          ];


        /*
          Only request missing emails
        */

        const idsToFetch =
          force
            ? uniqueEmailIds
            : uniqueEmailIds.filter(
                (
                  emailId
                ) =>
                  !loadedEmailIdsRef
                    .current
                    .has(
                      emailId
                    )
              );


        if (
          idsToFetch.length === 0
        ) {

          return uniqueEmailIds.map(
            (
              emailId
            ) =>
              emailLabels[
                emailId
              ] || []
          );

        }


        const results =
          await Promise.all(
            idsToFetch.map(
              (
                emailId
              ) =>
                fetchEmailLabels(
                  emailId,
                  {
                    force,
                  }
                )
                  .catch(
                    (
                      fetchError
                    ) => {

                      console.error(
                        `Failed to load labels for email ${emailId}:`,
                        fetchError
                      );


                      return [];

                    }
                  )
            )
          );


        return results;

      },
      [
        emailLabels,
        fetchEmailLabels,
      ]
    );


  /* =======================================================
     ADD LABEL
  ======================================================= */

  const addLabelToEmail =
    useCallback(
      async (
        emailId,
        labelId
      ) => {

        const normalizedEmailId =
          normalizeEmailId(
            emailId
          );


        const normalizedLabelId =
          normalizeEmailId(
            labelId
          );


        if (
          !normalizedEmailId ||
          !normalizedLabelId
        ) {

          throw new Error(
            "Email ID and Label ID are required."
          );

        }


        try {

          setError(
            null
          );


          await api.post(
            `/email-labels/${encodeURIComponent(
              normalizedEmailId
            )}/${encodeURIComponent(
              normalizedLabelId
            )}`
          );


          setEmailLabels(
            (
              previous
            ) => {

              const current =
                previous[
                  normalizedEmailId
                ] || [];


              if (
                current.some(
                  (
                    id
                  ) =>
                    String(
                      id
                    ) ===
                    normalizedLabelId
                )
              ) {

                return previous;

              }


              return {
                ...previous,

                [normalizedEmailId]:
                  [
                    ...current,
                    normalizedLabelId,
                  ],
              };

            }
          );


          loadedEmailIdsRef
            .current
            .add(
              normalizedEmailId
            );


          return true;

        } catch (
          err
        ) {

          const message =
            err.response?.data
              ?.message ||
            err.message ||
            "Failed to add label.";


          setError(
            message
          );


          throw new Error(
            message
          );

        }

      },
      []
    );


  /* =======================================================
     REMOVE LABEL
  ======================================================= */

  const removeLabelFromEmail =
    useCallback(
      async (
        emailId,
        labelId
      ) => {

        const normalizedEmailId =
          normalizeEmailId(
            emailId
          );


        const normalizedLabelId =
          normalizeEmailId(
            labelId
          );


        if (
          !normalizedEmailId ||
          !normalizedLabelId
        ) {

          throw new Error(
            "Email ID and Label ID are required."
          );

        }


        try {

          setError(
            null
          );


          await api.delete(
            `/email-labels/${encodeURIComponent(
              normalizedEmailId
            )}/${encodeURIComponent(
              normalizedLabelId
            )}`
          );


          setEmailLabels(
            (
              previous
            ) => {

              const current =
                previous[
                  normalizedEmailId
                ] || [];


              return {

                ...previous,

                [normalizedEmailId]:
                  current.filter(
                    (
                      id
                    ) =>
                      String(
                        id
                      ) !==
                      normalizedLabelId
                  ),

              };

            }
          );


          loadedEmailIdsRef
            .current
            .add(
              normalizedEmailId
            );


          return true;

        } catch (
          err
        ) {

          const message =
            err.response?.data
              ?.message ||
            err.message ||
            "Failed to remove label.";


          setError(
            message
          );


          throw new Error(
            message
          );

        }

      },
      []
    );


  /* =======================================================
     TOGGLE LABEL
  ======================================================= */

  const toggleEmailLabel =
    useCallback(
      async (
        emailId,
        labelId
      ) => {

        const normalizedEmailId =
          normalizeEmailId(
            emailId
          );


        const normalizedLabelId =
          normalizeEmailId(
            labelId
          );


        if (
          !normalizedEmailId ||
          !normalizedLabelId
        ) {

          throw new Error(
            "Email ID and Label ID are required."
          );

        }


        const currentLabels =
          emailLabels[
            normalizedEmailId
          ] || [];


        const exists =
          currentLabels.some(
            (
              id
            ) =>
              String(
                id
              ) ===
              normalizedLabelId
          );


        if (
          exists
        ) {

          return removeLabelFromEmail(
            normalizedEmailId,
            normalizedLabelId
          );

        }


        return addLabelToEmail(
          normalizedEmailId,
          normalizedLabelId
        );

      },
      [
        emailLabels,
        addLabelToEmail,
        removeLabelFromEmail,
      ]
    );


  /* =======================================================
     CHECK LABEL
  ======================================================= */

  const hasEmailLabel =
    useCallback(
      (
        emailId,
        labelId
      ) => {

        const normalizedEmailId =
          normalizeEmailId(
            emailId
          );


        const normalizedLabelId =
          normalizeEmailId(
            labelId
          );


        if (
          !normalizedEmailId ||
          !normalizedLabelId
        ) {
          return false;
        }


        return (
          emailLabels[
            normalizedEmailId
          ] || []
        ).some(
          (
            id
          ) =>
            String(
              id
            ) ===
            normalizedLabelId
        );

      },
      [
        emailLabels,
      ]
    );


  /* =======================================================
     GET EMAIL IDS FOR LABEL
  ======================================================= */

  const getEmailsForLabel =
    useCallback(
      (
        labelId
      ) => {

        const normalizedLabelId =
          normalizeEmailId(
            labelId
          );


        if (
          !normalizedLabelId
        ) {
          return [];
        }


        return Object.entries(
          emailLabels
        )
          .filter(
            ([
              ,
              labelIds,
            ]) =>
              Array.isArray(
                labelIds
              ) &&
              labelIds.some(
                (
                  id
                ) =>
                  String(
                    id
                  ) ===
                  normalizedLabelId
              )
          )
          .map(
            ([
              emailId,
            ]) =>
              emailId
          );

      },
      [
        emailLabels,
      ]
    );


  /* =======================================================
     CACHE HELPERS
  ======================================================= */

  const markEmailLabelsStale =
    useCallback(
      (
        emailId
      ) => {

        const normalizedEmailId =
          normalizeEmailId(
            emailId
          );


        if (
          !normalizedEmailId
        ) {
          return;
        }


        loadedEmailIdsRef
          .current
          .delete(
            normalizedEmailId
          );

      },
      []
    );


  const clearEmailLabelsCache =
    useCallback(
      (
        emailId
      ) => {

        const normalizedEmailId =
          normalizeEmailId(
            emailId
          );


        if (
          !normalizedEmailId
        ) {
          return;
        }


        loadedEmailIdsRef
          .current
          .delete(
            normalizedEmailId
          );


        loadingRequestsRef
          .current
          .delete(
            normalizedEmailId
          );


        setEmailLabels(
          (
            previous
          ) => {

            const updated =
              {
                ...previous,
              };


            delete updated[
              normalizedEmailId
            ];


            return updated;

          }
        );

      },
      []
    );


  const clearAllEmailLabelsCache =
    useCallback(
      () => {

        loadedEmailIdsRef
          .current
          .clear();


        loadingRequestsRef
          .current
          .clear();


        setEmailLabels(
          {}
        );


        setLoadingEmailIds(
          {}
        );


        setError(
          null
        );

      },
      []
    );


  /* =======================================================
     CONTEXT VALUE
  ======================================================= */

  const value = {

    /* DATA */

    emailLabels,

    error,

    loading:
      Object.keys(
        loadingEmailIds
      ).length > 0,

    loadingEmailIds,


    /* FETCH */

    fetchEmailLabels,

    fetchLabelsForEmails,

    syncEmailLabelsFromEmails,


    /* CRUD */

    addLabelToEmail,

    removeLabelFromEmail,

    toggleEmailLabel,


    /* HELPERS */

    getEmailLabels,

    getEmailsForLabel,

    hasEmailLabel,

    isEmailLabelsLoaded,

    isEmailLabelsLoading,


    /* CACHE */

    markEmailLabelsStale,

    clearEmailLabelsCache,

    clearAllEmailLabelsCache,

  };


  return (

    <EmailLabelsContext.Provider
      value={
        value
      }
    >

      {children}

    </EmailLabelsContext.Provider>

  );

}


/* =========================================================
   HOOK
========================================================= */

export function useEmailLabels() {

  const context =
    useContext(
      EmailLabelsContext
    );


  if (
    !context
  ) {

    throw new Error(
      "useEmailLabels must be used inside EmailLabelsProvider"
    );

  }


  return context;

}