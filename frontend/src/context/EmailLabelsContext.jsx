import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";

import api from "../services/api";
import { useToast } from "./ToastContext";
import { useMailbox } from "./MailboxContext";

/* =========================================================
   CONTEXT
========================================================= */

const EmailLabelsContext = createContext(null);

/* =========================================================
   HELPERS
========================================================= */

const normalizeEmailId = (emailId) => {
  if (emailId === null || emailId === undefined) {
    return "";
  }

  return String(emailId);
};

const normalizeLabelId = (label) => {
  if (!label) {
    return null;
  }

  if (typeof label === "string") {
    return label;
  }

  return label._id || label.id || null;
};

const normalizeLabelIds = (labels) => {
  if (!Array.isArray(labels)) {
    return [];
  }

  return [
    ...new Set(labels.map(normalizeLabelId).filter(Boolean).map(String)),
  ];
};

/* =========================================================
   INNER PROVIDER
========================================================= */

function EmailLabelsProviderInner({ children }) {
  const { showToast } = useToast();

  /*
    Structure:
    { "email-id-1": ["label-id-1", "label-id-2"] }
  */
  const [emailLabels, setEmailLabels] = useState({});

  /* Successfully loaded email IDs */
  const loadedEmailIdsRef = useRef(new Set());

  /* Currently running requests */
  const loadingRequestsRef = useRef(new Map());

  const [loadingEmailIds, setLoadingEmailIds] = useState({});
  const [error, setError] = useState(null);

  /* =======================================================
     GET LABELS FOR EMAIL
  ======================================================= */

  const getEmailLabels = useCallback(
    (emailId) => {
      const id = normalizeEmailId(emailId);

      if (!id) {
        return [];
      }

      return emailLabels[id] || [];
    },
    [emailLabels],
  );

  /* =======================================================
     CHECK LOADED / LOADING
  ======================================================= */

  const isEmailLabelsLoaded = useCallback((emailId) => {
    const id = normalizeEmailId(emailId);

    if (!id) {
      return false;
    }

    return loadedEmailIdsRef.current.has(id);
  }, []);

  const isEmailLabelsLoading = useCallback(
    (emailId) => {
      const id = normalizeEmailId(emailId);

      if (!id) {
        return false;
      }

      return Boolean(loadingEmailIds[id]);
    },
    [loadingEmailIds],
  );

  /* =======================================================
     SYNC LABELS FROM EMAIL OBJECTS
  ======================================================= */

  const syncEmailLabelsFromEmails = useCallback((emails = [], options = {}) => {
    const { markAsLoaded = false } = options;

    if (!Array.isArray(emails)) {
      return;
    }

    const updates = {};

    emails.forEach((email) => {
      if (!email) {
        return;
      }

      const emailId = normalizeEmailId(
        email.id || email.messageId || email.message?.id,
      );

      if (!emailId) {
        return;
      }

      const rawLabels = email.labels || email.labelIds || email.label_ids || [];

      /* Sirf tab sync karo jab labels actually array ho */
      if (!Array.isArray(rawLabels)) {
        return;
      }

      updates[emailId] = normalizeLabelIds(rawLabels);

      if (markAsLoaded) {
        loadedEmailIdsRef.current.add(emailId);
      }
    });

    if (Object.keys(updates).length === 0) {
      return;
    }

    setEmailLabels((previous) => {
      const next = { ...previous };

      Object.entries(updates).forEach(([emailId, labelIds]) => {
        next[emailId] = [...new Set([...(previous[emailId] || []), ...labelIds])];
      });

      return next;
    });
  }, []);

  /* =======================================================
     FETCH LABELS FOR ONE EMAIL
  ======================================================= */

  const fetchEmailLabels = useCallback(
    async (emailId, options = {}) => {
      const { force = false } = options;

      const id = normalizeEmailId(emailId);

      if (!id) {
        return [];
      }

      /* Cached data */
      if (!force && loadedEmailIdsRef.current.has(id)) {
        return emailLabels[id] || [];
      }

      /* Already running request */
      const existingRequest = loadingRequestsRef.current.get(id);

      if (existingRequest) {
        return existingRequest;
      }

      const request = (async () => {
        try {
          setError(null);

          setLoadingEmailIds((previous) => ({
            ...previous,
            [id]: true,
          }));

          const response = await api.get(
            `/email-labels/email/${encodeURIComponent(id)}`,
          );

          const responseData = response?.data;

          const labels = Array.isArray(responseData)
            ? responseData
            : responseData?.labels || responseData?.data || [];

          const labelIds = normalizeLabelIds(labels);

          setEmailLabels((previous) => ({
            ...previous,
            [id]: labelIds,
          }));

          loadedEmailIdsRef.current.add(id);

          return labelIds;
        } catch (err) {
          console.error("Fetch email labels error:", err);

          const message =
            err.response?.data?.message ||
            err.message ||
            "Failed to fetch email labels.";

          setError(message);

          loadedEmailIdsRef.current.delete(id);

          showToast(`❌ ${message}`, "error", 5000);

          throw new Error(message);
        } finally {
          setLoadingEmailIds((previous) => {
            const updated = { ...previous };

            delete updated[id];

            return updated;
          });

          loadingRequestsRef.current.delete(id);
        }
      })();

      loadingRequestsRef.current.set(id, request);

      return request;
    },
    [emailLabels, showToast],
  );

  /* =======================================================
     FETCH LABELS FOR MULTIPLE EMAILS
  ======================================================= */

  const fetchLabelsForEmails = useCallback(
    async (emailIds = [], options = {}) => {
      if (!Array.isArray(emailIds)) {
        return [];
      }

      const { force = false } = options;

      const uniqueEmailIds = [
        ...new Set(emailIds.map(normalizeEmailId).filter(Boolean)),
      ];

      const idsToFetch = force
        ? uniqueEmailIds
        : uniqueEmailIds.filter((id) => !loadedEmailIdsRef.current.has(id));

      if (idsToFetch.length === 0) {
        return uniqueEmailIds.map((id) => emailLabels[id] || []);
      }

      return Promise.all(
        idsToFetch.map((id) =>
          fetchEmailLabels(id, { force }).catch((fetchError) => {
            console.error(`Failed to load labels for email ${id}:`, fetchError);

            return [];
          }),
        ),
      );
    },
    [emailLabels, fetchEmailLabels],
  );

  /* =======================================================
     ADD LABEL
  ======================================================= */

  const addLabelToEmail = useCallback(
    async (emailId, labelId) => {
      const normalizedEmailId = normalizeEmailId(emailId);
      const normalizedLabelId = normalizeEmailId(labelId);

      if (!normalizedEmailId || !normalizedLabelId) {
        const message = "Email ID and Label ID are required.";

        showToast(`❌ ${message}`, "error", 5000);

        throw new Error(message);
      }

      try {
        setError(null);

        await api.post(
          `/email-labels/${encodeURIComponent(
            normalizedEmailId,
          )}/${encodeURIComponent(normalizedLabelId)}`,
        );

        setEmailLabels((previous) => {
          const current = previous[normalizedEmailId] || [];

          if (current.some((id) => String(id) === normalizedLabelId)) {
            return previous;
          }

          return {
            ...previous,
            [normalizedEmailId]: [...current, normalizedLabelId],
          };
        });

        loadedEmailIdsRef.current.add(normalizedEmailId);

        showToast("Label added successfully.", "success", 3000);

        return true;
      } catch (err) {
        const message =
          err.response?.data?.message || err.message || "Failed to add label.";

        setError(message);

        showToast(`❌ ${message}`, "error", 5000);

        throw new Error(message);
      }
    },
    [showToast],
  );

  /* =======================================================
     REMOVE LABEL
  ======================================================= */

  const removeLabelFromEmail = useCallback(
    async (emailId, labelId) => {
      const normalizedEmailId = normalizeEmailId(emailId);
      const normalizedLabelId = normalizeEmailId(labelId);

      if (!normalizedEmailId || !normalizedLabelId) {
        const message = "Email ID and Label ID are required.";

        showToast(`❌ ${message}`, "error", 5000);

        throw new Error(message);
      }

      try {
        setError(null);

        await api.delete(
          `/email-labels/${encodeURIComponent(
            normalizedEmailId,
          )}/${encodeURIComponent(normalizedLabelId)}`,
        );

        setEmailLabels((previous) => {
          const current = previous[normalizedEmailId] || [];

          return {
            ...previous,
            [normalizedEmailId]: current.filter(
              (id) => String(id) !== normalizedLabelId,
            ),
          };
        });

        loadedEmailIdsRef.current.add(normalizedEmailId);

        showToast("Label removed successfully.", "success", 3000);

        return true;
      } catch (err) {
        const message =
          err.response?.data?.message ||
          err.message ||
          "Failed to remove label.";

        setError(message);

        showToast(`❌ ${message}`, "error", 5000);

        throw new Error(message);
      }
    },
    [showToast],
  );

  /* =======================================================
     TOGGLE LABEL
  ======================================================= */

  const toggleEmailLabel = useCallback(
    async (emailId, labelId) => {
      const normalizedEmailId = normalizeEmailId(emailId);
      const normalizedLabelId = normalizeEmailId(labelId);

      if (!normalizedEmailId || !normalizedLabelId) {
        const message = "Email ID and Label ID are required.";

        showToast(`❌ ${message}`, "error", 5000);

        throw new Error(message);
      }

      const currentLabels = emailLabels[normalizedEmailId] || [];

      const exists = currentLabels.some(
        (id) => String(id) === normalizedLabelId,
      );

      if (exists) {
        return removeLabelFromEmail(normalizedEmailId, normalizedLabelId);
      }

      return addLabelToEmail(normalizedEmailId, normalizedLabelId);
    },
    [emailLabels, addLabelToEmail, removeLabelFromEmail, showToast],
  );

  /* =======================================================
     CHECK LABEL
  ======================================================= */

  const hasEmailLabel = useCallback(
    (emailId, labelId) => {
      const normalizedEmailId = normalizeEmailId(emailId);
      const normalizedLabelId = normalizeEmailId(labelId);

      if (!normalizedEmailId || !normalizedLabelId) {
        return false;
      }

      return (emailLabels[normalizedEmailId] || []).some(
        (id) => String(id) === normalizedLabelId,
      );
    },
    [emailLabels],
  );

  /* =======================================================
     GET EMAIL IDS FOR LABEL
  ======================================================= */

  const getEmailsForLabel = useCallback(
    (labelId) => {
      const normalizedLabelId = normalizeEmailId(labelId);

      if (!normalizedLabelId) {
        return [];
      }

      return Object.entries(emailLabels)
        .filter(
          ([, labelIds]) =>
            Array.isArray(labelIds) &&
            labelIds.some((id) => String(id) === normalizedLabelId),
        )
        .map(([emailId]) => emailId);
    },
    [emailLabels],
  );

  /* =======================================================
     CACHE HELPERS
  ======================================================= */

  const markEmailLabelsStale = useCallback((emailId) => {
    const id = normalizeEmailId(emailId);

    if (!id) {
      return;
    }

    loadedEmailIdsRef.current.delete(id);
  }, []);

  const clearEmailLabelsCache = useCallback((emailId) => {
    const id = normalizeEmailId(emailId);

    if (!id) {
      return;
    }

    loadedEmailIdsRef.current.delete(id);
    loadingRequestsRef.current.delete(id);

    setEmailLabels((previous) => {
      const updated = { ...previous };

      delete updated[id];

      return updated;
    });
  }, []);

  const clearAllEmailLabelsCache = useCallback(() => {
    loadedEmailIdsRef.current.clear();
    loadingRequestsRef.current.clear();

    setEmailLabels({});
    setLoadingEmailIds({});
    setError(null);
  }, []);

  /* =======================================================
     CONTEXT VALUE
  ======================================================= */

  const value = {
    /* DATA */
    emailLabels,
    error,
    loading: Object.keys(loadingEmailIds).length > 0,
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
    <EmailLabelsContext.Provider value={value}>
      {children}
    </EmailLabelsContext.Provider>
  );
}

/* =========================================================
   PUBLIC PROVIDER

   Mailbox badalte hi inner provider remount hota hai:
   purane mailbox ka label cache clear ho jata hai, aur naye
   mailbox ke labels dobara fetch hote hain (X-Acting-As ke saath).
========================================================= */

export function EmailLabelsProvider({ children }) {
  const { mailboxKey } = useMailbox();

  return (
    <EmailLabelsProviderInner key={mailboxKey}>
      {children}
    </EmailLabelsProviderInner>
  );
}

/* =========================================================
   HOOK
========================================================= */

export function useEmailLabels() {
  const context = useContext(EmailLabelsContext);

  if (!context) {
    throw new Error("useEmailLabels must be used inside EmailLabelsProvider");
  }

  return context;
}