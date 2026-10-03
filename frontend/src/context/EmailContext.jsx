import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";

import { io } from "socket.io-client";
import { useToast } from "./ToastContext";

/* FIX: acting-as ka single source of truth ab MailboxContext hai
   (ProfileAccounts bhi usi me owner save karta hai) */
import { getActingOwnerId, useMailbox } from "./MailboxContext";

/* Delegated mailbox: socket ko sahi mailbox ke realtime room me rakhta hai */
import attachMailboxRoomSync from "../utils/useMailBoxSocketSync";

const EmailsContext = createContext(null);

/* =========================================================
   API + SOCKET URLS

   Production me API calls relative jaati hain (Vercel rewrite => Render),
   isse cookie first-party rehti hai. Socket seedha Render se judta hai
   (Vercel websocket proxy nahi karta), isliye VITE_SOCKET_URL chahiye.
========================================================= */

const API_URL = import.meta.env.PROD
  ? ""
  : import.meta.env.VITE_API_URL || "http://localhost:8080";

const SOCKET_URL = import.meta.env.PROD
  ? import.meta.env.VITE_SOCKET_URL
  : import.meta.env.VITE_API_URL || "http://localhost:8080";

const SOCKET_TOKEN_URL = import.meta.env.PROD
  ? "/api/auth/socket-token"
  : `${SOCKET_URL}/api/auth/socket-token`;

async function fetchSocketToken() {
  try {
    const response = await fetch(SOCKET_TOKEN_URL, {
      credentials: "include",
    });

    if (!response.ok) return null;

    const json = await response.json();

    return json?.data?.token || null;
  } catch {
    return null;
  }
}

/*
  auth function har connect / reconnect par chalta hai,
  isliye expire hua token apne aap naya ho jata hai.
*/
function createAuthedSocket() {
  const socket = io(SOCKET_URL, {
    withCredentials: true,
    transports: ["websocket", "polling"],
    autoConnect: false,
    auth: (callback) => {
      fetchSocketToken().then((token) => callback({ token }));
    },
  });

  socket.connect();

  return socket;
}

/* =========================================================
CONSTANTS
========================================================= */

const DEFAULT_MAX_RESULTS = 25;
const MAX_RESULTS_LIMIT = 50;
const BODY_FIELDS = ["body", "bodyHtml", "bodyText"];

/* Realtime event ke baad thread refresh se pehle chhota wait,
   taaki ek saath aane wale events ek hi refresh me merge ho jayein */
const THREAD_REFRESH_DELAY_MS = 250;

/* =========================================================
VIEW FILTERS
========================================================= */

const getViewFilters = (view = "inbox") => {
  switch (view) {
    case "unread":
      return { labelIds: "INBOX", query: "is:unread" };
    case "starred":
      return { labelIds: "STARRED" };
    case "sent":
      return { labelIds: "SENT" };
    case "drafts":
      return { labelIds: "DRAFT" };
    case "trash":
      return { labelIds: "TRASH" };
    case "inbox":
    default:
      return { labelIds: "INBOX" };
  }
};

/* =========================================================
CLIENT-SIDE VIEW MEMBERSHIP
========================================================= */

const emailMatchesView = (email, view) => {
  if (!email) return false;

  const labels = Array.isArray(email.labels) ? email.labels : [];

  switch (view) {
    case "unread":
      return labels.includes("INBOX") && Boolean(email.unread);
    case "starred":
      return Boolean(email.starred) || labels.includes("STARRED");
    case "sent":
      return labels.includes("SENT");
    case "drafts":
      return labels.includes("DRAFT");
    case "trash":
      return labels.includes("TRASH");
    case "inbox":
    default:
      return labels.includes("INBOX");
  }
};

/* =========================================================
HELPERS
========================================================= */

const getEmailTimestamp = (email = {}) => {
  if (email.internalDate) {
    const value = Number(email.internalDate);
    if (!Number.isNaN(value) && value > 0) return value;
  }

  if (email.timestamp) {
    const value = Number(email.timestamp);
    if (!Number.isNaN(value) && value > 0) return value;
  }

  if (email.date) {
    const value = new Date(email.date).getTime();
    if (!Number.isNaN(value)) return value;
  }

  return 0;
};

const normalizeLabels = (labels) => {
  if (!Array.isArray(labels)) return [];
  return [...new Set(labels.filter(Boolean))];
};

const addLabel = (labels = [], label) => normalizeLabels([...labels, label]);

const removeLabel = (labels = [], label) =>
  normalizeLabels(labels.filter((item) => item !== label));

/* Email me kisi bhi form me (html / text / body) content hai? */
const hasEmailBody = (email) =>
  BODY_FIELDS.some(
    (field) => typeof email?.[field] === "string" && email[field].trim(),
  );

/* =========================================================
FORM DATA (attachments ke saath send/reply)

Arrays (cc, bcc) JSON string ban kar jate hain;
backend ka parseList() unhe wapas array bana deta hai.
========================================================= */

const buildFormData = (fields = {}, attachments = []) => {
  const formData = new FormData();

  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    formData.append(
      key,
      Array.isArray(value) ? JSON.stringify(value) : String(value),
    );
  });

  attachments.forEach((file) => {
    formData.append("attachments", file, file.name);
  });

  return formData;
};

/* =========================================================
NORMALIZE EMAIL
========================================================= */

const normalizeEmail = (email = {}) => {
  const rawBody =
    email.body?.html ||
    email.body?.text ||
    (typeof email.body === "string" ? email.body : "");

  const timestamp =
    email.timestamp || email.internalDate || getEmailTimestamp(email);

  const labels = normalizeLabels(email.labels || email.labelIds);

  const isRead =
    typeof email.isRead === "boolean"
      ? email.isRead
      : !labels.includes("UNREAD");

  const isStarred =
    typeof email.isStarred === "boolean"
      ? email.isStarred
      : labels.includes("STARRED");

  const isImportant =
    typeof email.isImportant === "boolean"
      ? email.isImportant
      : labels.includes("IMPORTANT");

  return {
    ...email,

    id: email.id || email.messageId || "",

    threadId: email.threadId || email.id || email.messageId || "",

    sender:
      email.from?.name || email.from?.email || email.sender || "Unknown Sender",

    senderEmail:
      email.from?.email ||
      email.senderEmail ||
      (typeof email.from === "string" ? email.from : ""),

    unread: !isRead,
    starred: isStarred,
    important: isImportant,

    isRead,
    isStarred,
    isImportant,

    time: email.date ? new Date(email.date).toLocaleString() : email.time || "",

    timestamp,

    body: rawBody,

    bodyText:
      email.bodyText ||
      email.body?.text ||
      (typeof email.body === "string" ? email.body : ""),

    bodyHtml: email.bodyHtml || email.body?.html || "",

    attachments: Array.isArray(email.attachments) ? email.attachments : [],

    labels,
  };
};

/* =========================================================
MERGE EMAIL RECORD

An incoming record with an EMPTY body (list API, socket
update, etc.) must never wipe a body that was already loaded.
========================================================= */

const mergeEmailRecord = (existing, incoming) => {
  if (!existing) {
    return incoming;
  }

  const merged = {
    ...existing,
    ...incoming,

    labels: Array.isArray(incoming.labels)
      ? normalizeLabels(incoming.labels)
      : existing.labels || [],
  };

  BODY_FIELDS.forEach((field) => {
    const value = incoming[field];
    const incomingIsEmpty = typeof value !== "string" || !value.trim();

    if (incomingIsEmpty && existing[field]) {
      merged[field] = existing[field];
    }
  });

  if (!incoming.attachments?.length && existing.attachments?.length) {
    merged.attachments = existing.attachments;
  }

  return merged;
};

const upsertEmailsIntoMap = (prevMap, emailsArray = []) => {
  if (!emailsArray.length) {
    return prevMap;
  }

  const next = { ...prevMap };

  emailsArray.forEach((email) => {
    if (!email?.id) return;
    next[email.id] = mergeEmailRecord(next[email.id], email);
  });

  return next;
};

/* =========================================================
REMOVE DUPLICATES
========================================================= */

const removeDuplicates = (emails = []) => {
  const map = new Map();

  emails.forEach((email) => {
    if (!email?.id) return;
    map.set(email.id, mergeEmailRecord(map.get(email.id), email));
  });

  return Array.from(map.values());
};

/* =========================================================
SORT THREAD MESSAGES
========================================================= */

const sortThreadMessages = (messages = []) =>
  [...messages].sort((a, b) => getEmailTimestamp(a) - getEmailTimestamp(b));

/* =========================================================
GROUP EMAILS BY THREAD
========================================================= */

const groupEmailsByThread = (emails = []) => {
  const threadMap = new Map();

  emails.forEach((email) => {
    const threadKey = email.threadId || email.id;

    if (!threadKey) return;

    const existing = threadMap.get(threadKey);

    if (!existing) {
      threadMap.set(threadKey, {
        ...email,
        threadCount: 1,
        threadEmails: [email],
        unread: Boolean(email.unread),
      });
      return;
    }

    const allThreadEmails = sortThreadMessages([
      ...existing.threadEmails,
      email,
    ]);

    const latestEmail = allThreadEmails[allThreadEmails.length - 1];

    threadMap.set(threadKey, {
      ...latestEmail,
      threadCount: allThreadEmails.length,
      threadEmails: allThreadEmails,
      unread: allThreadEmails.some((item) => item.unread),
    });
  });

  return Array.from(threadMap.values()).sort(
    (a, b) => getEmailTimestamp(b) - getEmailTimestamp(a),
  );
};

/* =========================================================
EXTRACT THREAD MESSAGES
========================================================= */

const extractThreadMessages = (response) => {
  const data = response?.data || {};

  if (Array.isArray(data.messages)) return data.messages;
  if (Array.isArray(data.thread)) return data.thread;
  if (Array.isArray(data.thread?.messages)) return data.thread.messages;
  if (Array.isArray(data.email?.messages)) return data.email.messages;

  return [];
};

/* =========================================================
EMAILS PROVIDER (inner)
========================================================= */

function EmailsProviderInner({ children }) {
  const { showToast } = useToast();

  /* Delegated mailbox: access hatne par apni inbox par wapas jaane ke liye */
  const { refreshShared } = useMailbox();

  /* ========================================
     NORMALIZED EMAIL STORE
  ======================================== */

  const [emailsById, setEmailsById] = useState({});

  /* ========================================
     PER-VIEW CACHE
  ======================================== */

  const [viewCache, setViewCache] = useState({});

  /* ========================================
     CURRENT VIEW
  ======================================== */

  const [currentView, setCurrentView] = useState("inbox");

  /* ========================================
     REFS
  ======================================== */

  const isLoadingMoreRef = useRef(false);
  const latestThreadRequestRef = useRef(0);
  const selectTokenRef = useRef(0);
  const activeEmailIdRef = useRef(null);
  const activeThreadIdRef = useRef(null);
  const activeThreadRef = useRef([]);
  const loadEmailThreadRef = useRef(null);
  const threadRefreshTimerRef = useRef(null);
  const emailsByIdRef = useRef({});
  const viewCacheRef = useRef({});
  const currentViewRef = useRef("inbox");

  useEffect(() => {
    emailsByIdRef.current = emailsById;
  }, [emailsById]);

  useEffect(() => {
    viewCacheRef.current = viewCache;
  }, [viewCache]);

  useEffect(() => {
    currentViewRef.current = currentView;
  }, [currentView]);

  /* ========================================
     CURRENT VIEW DATA
  ======================================== */

  const currentViewData = viewCache[currentView] || {
    ids: [],
    nextPageToken: null,
    resultSizeEstimate: 0,
    loaded: false,
  };

  const rawViewEmails = useMemo(
    () => currentViewData.ids.map((id) => emailsById[id]).filter(Boolean),
    [currentViewData.ids, emailsById],
  );

  const viewEmails = useMemo(
    () => groupEmailsByThread(rawViewEmails),
    [rawViewEmails],
  );

  /* ========================================
     ACTIVE EMAIL
  ======================================== */

  const [activeEmailId, setActiveEmailId] = useState(null);

  /* ========================================
     THREAD STATE
  ======================================== */

  const [activeThread, setActiveThread] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState(null);

  /*
    true ONLY after the full thread for the
    currently selected email has finished
    loading (success or failure).
  */
  const [isThreadReady, setIsThreadReady] = useState(false);

  useEffect(() => {
    activeEmailIdRef.current = activeEmailId;
  }, [activeEmailId]);

  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);

  useEffect(() => {
    activeThreadRef.current = activeThread;
  }, [activeThread]);

  /* ========================================
     GENERAL STATE
  ======================================== */

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  /* ========================================
     API REQUEST HELPER

     FormData body ke liye Content-Type khud set nahi karna:
     browser multipart boundary ke saath apne aap lagata hai.

     Delegated mode me "X-Acting-As" header owner ki id ke saath jaata hai,
     backend ka actingAs middleware usi se owner ki mailbox serve karta hai.
  ======================================== */

  const apiRequest = useCallback(async (endpoint, options = {}) => {
    const headers = { ...options.headers };

    const isFormData =
      typeof FormData !== "undefined" && options.body instanceof FormData;

    if (options.body && !isFormData) {
      headers["Content-Type"] = "application/json";
    }

    /* FIX: MailboxContext se owner id (key: collabry_acting_as) */
    const actingOwnerId = getActingOwnerId();

    if (actingOwnerId) {
      headers["X-Acting-As"] = actingOwnerId;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      credentials: "include",
      headers,
    });

    const contentType = response.headers.get("content-type") || "";

    let data = null;

    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = text ? { message: text } : null;
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.error?.message ||
          data?.error ||
          "Request failed",
      );
    }

    return data;
  }, []);

  /* ========================================
     SYNC EMAIL MEMBERSHIP
  ======================================== */

  const syncEmailMembershipToViews = useCallback((email) => {
    if (!email?.id) return;

    setViewCache((previous) => {
      let changed = false;
      const next = { ...previous };

      for (const viewKey of Object.keys(next)) {
        const cache = next[viewKey];

        if (!cache?.loaded) continue;

        const shouldBeIn = emailMatchesView(email, viewKey);
        const currentlyIn = cache.ids.includes(email.id);

        if (shouldBeIn && !currentlyIn) {
          next[viewKey] = { ...cache, ids: [...cache.ids, email.id] };
          changed = true;
        } else if (!shouldBeIn && currentlyIn) {
          next[viewKey] = {
            ...cache,
            ids: cache.ids.filter((id) => id !== email.id),
          };
          changed = true;
        }
      }

      return changed ? next : previous;
    });
  }, []);

  /* ========================================
     FETCH VIEW EMAILS
  ======================================== */

  const fetchViewEmails = useCallback(
    async (view, options = {}) => {
      const isSilent = Boolean(options.silent);
      const isPagination = Boolean(options.pageToken);

      try {
        if (isPagination) {
          setLoadingMore(true);
        } else if (!isSilent) {
          setLoading(true);
          setError(null);
        }

        const filters = getViewFilters(view);
        const params = new URLSearchParams();

        const requestedMax = Number(options.maxResults || DEFAULT_MAX_RESULTS);

        const safeMaxResults = Math.min(
          Math.max(
            Number.isFinite(requestedMax)
              ? Math.floor(requestedMax)
              : DEFAULT_MAX_RESULTS,
            1,
          ),
          MAX_RESULTS_LIMIT,
        );

        params.set("maxResults", String(safeMaxResults));

        if (options.pageToken) params.set("pageToken", options.pageToken);
        if (filters.labelIds) params.set("labelIds", filters.labelIds);
        if (filters.query) params.set("query", filters.query);

        const queryString = params.toString();
        const endpoint = `/api/emails${queryString ? `?${queryString}` : ""}`;

        const response = await apiRequest(endpoint);

        const rawEmails = Array.isArray(response?.data?.emails)
          ? response.data.emails
          : [];

        const resultEmails = rawEmails
          .map(normalizeEmail)
          .filter((email) => email.id);

        setEmailsById((previous) =>
          upsertEmailsIntoMap(previous, resultEmails),
        );

        const newIds = resultEmails.map((email) => email.id);

        setViewCache((previous) => {
          const existing = previous[view] || {
            ids: [],
            nextPageToken: null,
            resultSizeEstimate: 0,
            loaded: false,
          };

          const mergedIds = isPagination
            ? Array.from(new Set([...existing.ids, ...newIds]))
            : newIds;

          return {
            ...previous,
            [view]: {
              ids: mergedIds,
              nextPageToken: response?.data?.nextPageToken || null,
              resultSizeEstimate: response?.data?.resultSizeEstimate || 0,
              loaded: true,
            },
          };
        });

        return resultEmails;
      } catch (requestError) {
        console.error(`Failed to load "${view}" emails:`, requestError);

        if (!isSilent) {
          setError(requestError.message);
        }

        throw requestError;
      } finally {
        if (isPagination) {
          setLoadingMore(false);
        }

        if (!isSilent && !isPagination) {
          setLoading(false);
        }
      }
    },
    [apiRequest],
  );

  /* ========================================
     CLEAR ACTIVE EMAIL
  ======================================== */

  const clearActiveEmail = useCallback(() => {
    latestThreadRequestRef.current += 1;
    selectTokenRef.current += 1;

    /* Pending realtime thread-refresh bhi cancel karo */
    if (threadRefreshTimerRef.current) {
      clearTimeout(threadRefreshTimerRef.current);
      threadRefreshTimerRef.current = null;
    }

    setActiveEmailId(null);
    setActiveThread([]);
    setActiveThreadId(null);
    setThreadError(null);
    setThreadLoading(false);
    setIsThreadReady(false);
  }, []);

  /* ========================================
     CHANGE VIEW
  ======================================== */

  const changeView = useCallback(
    async (view = "inbox") => {
      const normalizedView = view || "inbox";

      setCurrentView(normalizedView);
      clearActiveEmail();

      const cached = viewCacheRef.current[normalizedView];

      if (cached?.loaded) return;

      try {
        await fetchViewEmails(normalizedView, {
          maxResults: DEFAULT_MAX_RESULTS,
        });
      } catch (changeViewError) {
        console.error(`Failed to load ${normalizedView}:`, changeViewError);
      }
    },
    [fetchViewEmails, clearActiveEmail],
  );

  /* ========================================
     LOAD MORE EMAILS
  ======================================== */

  const loadMoreEmails = useCallback(async () => {
    const nextPageToken = currentViewData.nextPageToken;

    if (!nextPageToken) return [];
    if (isLoadingMoreRef.current) return [];

    isLoadingMoreRef.current = true;

    try {
      return await fetchViewEmails(currentView, {
        maxResults: DEFAULT_MAX_RESULTS,
        pageToken: nextPageToken,
      });
    } finally {
      isLoadingMoreRef.current = false;
    }
  }, [currentView, currentViewData.nextPageToken, fetchViewEmails]);

  const hasMoreEmails = Boolean(currentViewData.nextPageToken);

  /* ========================================
     LOAD SINGLE EMAIL
  ======================================== */

  const loadEmailById = useCallback(
    async (emailId) => {
      if (!emailId) {
        throw new Error("Email ID is required");
      }

      const response = await apiRequest(
        `/api/emails/${encodeURIComponent(emailId)}`,
      );

      const rawEmail = response?.data?.email;

      if (!rawEmail) {
        throw new Error("Email not found");
      }

      const fullEmail = normalizeEmail(rawEmail);

      setEmailsById((previous) => upsertEmailsIntoMap(previous, [fullEmail]));

      syncEmailMembershipToViews(fullEmail);

      return fullEmail;
    },
    [apiRequest, syncEmailMembershipToViews],
  );

  /* ========================================
     LOAD EMAIL THREAD
  ======================================== */

  const loadEmailThread = useCallback(
    async (emailId, options = {}) => {
      const silent = Boolean(options.silent);

      const requestId = latestThreadRequestRef.current + 1;
      latestThreadRequestRef.current = requestId;

      try {
        if (!emailId) {
          if (latestThreadRequestRef.current === requestId) {
            setActiveThread([]);
            setActiveThreadId(null);
          }

          return [];
        }

        if (!silent) {
          setThreadLoading(true);
          setThreadError(null);
        }

        const response = await apiRequest(
          `/api/emails/${encodeURIComponent(emailId)}/thread`,
        );

        const messages = extractThreadMessages(response);

        const normalizedThread = messages
          .map(normalizeEmail)
          .filter((email) => email.id);

        const uniqueThread = removeDuplicates(normalizedThread);
        const sortedThread = sortThreadMessages(uniqueThread);

        const threadId =
          response?.data?.threadId ||
          response?.data?.id ||
          sortedThread[0]?.threadId ||
          null;

        if (latestThreadRequestRef.current === requestId) {
          setActiveThread(sortedThread);
          setActiveThreadId(threadId);

          if (sortedThread.length > 0) {
            const selectedExists = sortedThread.some(
              (item) => item.id === emailId,
            );

            if (!selectedExists) {
              setActiveEmailId(
                sortedThread[sortedThread.length - 1]?.id || null,
              );
            }
          }
        }

        if (sortedThread.length > 0) {
          setEmailsById((previous) =>
            upsertEmailsIntoMap(previous, sortedThread),
          );

          sortedThread.forEach((email) => syncEmailMembershipToViews(email));
        }

        return sortedThread;
      } catch (requestError) {
        console.error("Failed to load email thread:", requestError);

        if (latestThreadRequestRef.current === requestId && !silent) {
          setThreadError(requestError.message);
          setActiveThread([]);
          setActiveThreadId(null);
        }

        throw requestError;
      } finally {
        if (latestThreadRequestRef.current === requestId && !silent) {
          setThreadLoading(false);
        }
      }
    },
    [apiRequest, syncEmailMembershipToViews],
  );

  /* Realtime (socket) effect ko hamesha latest loadEmailThread chahiye */
  useEffect(() => {
    loadEmailThreadRef.current = loadEmailThread;
  }, [loadEmailThread]);

  /* ========================================
     SELECT EMAIL
  ======================================== */

  const selectEmail = useCallback(
    async (emailId) => {
      if (!emailId) {
        clearActiveEmail();
        return null;
      }

      const token = ++selectTokenRef.current;

      latestThreadRequestRef.current += 1;

      setActiveEmailId(emailId);
      setActiveThread([]);
      setActiveThreadId(null);
      setThreadError(null);
      setThreadLoading(true);
      setIsThreadReady(false);

      try {
        const thread = await loadEmailThread(emailId);

        const selectedFromThread = thread.find((email) => email.id === emailId);

        if (selectedFromThread) {
          return selectedFromThread;
        }

        return await loadEmailById(emailId);
      } catch (requestError) {
        console.error("Failed to select email:", requestError);
        return null;
      } finally {
        // Only the latest click is allowed to mark the thread ready
        if (selectTokenRef.current === token) {
          setThreadLoading(false);
          setIsThreadReady(true);
        }
      }
    },
    [loadEmailThread, loadEmailById, clearActiveEmail],
  );

  /* ========================================
     ACTIVE EMAIL
  ======================================== */

  const activeEmail = useMemo(() => {
    if (!activeEmailId) return null;

    const threadEmail = activeThread.find(
      (email) => email.id === activeEmailId,
    );

    if (threadEmail) return threadEmail;

    return emailsById[activeEmailId] || null;
  }, [emailsById, activeThread, activeEmailId]);

  /* ========================================
     ACTIVE THREAD EMAIL
  ======================================== */

  const activeThreadEmail = useMemo(() => {
    if (!activeEmailId) return null;

    return (
      activeThread.find((email) => email.id === activeEmailId) ||
      activeEmail ||
      null
    );
  }, [activeThread, activeEmailId, activeEmail]);

  /* ========================================
     APPLY PATCH
  ======================================== */

  const patchEmail = useCallback(
    (emailId, patch) => {
      const existing = emailsByIdRef.current[emailId];

      const updated = existing
        ? { ...existing, ...patch }
        : { id: emailId, ...patch };

      setEmailsById((previous) => ({
        ...previous,
        [emailId]: mergeEmailRecord(previous[emailId], updated),
      }));

      setActiveThread((previous) =>
        previous.map((email) =>
          email.id === emailId ? { ...email, ...patch } : email,
        ),
      );

      syncEmailMembershipToViews(updated);

      return updated;
    },
    [syncEmailMembershipToViews],
  );

  /* ========================================
     GENERIC PATCH ACTION
     (read / unread / star / unstar / archive / inbox)
  ======================================== */

  const runPatchAction = useCallback(
    async (emailId, action, buildPatch, successMessage, failMessage) => {
      try {
        await apiRequest(
          `/api/emails/${encodeURIComponent(emailId)}/${action}`,
          { method: "PATCH" },
        );

        const existing = emailsByIdRef.current[emailId];

        patchEmail(emailId, buildPatch(existing));

        showToast(successMessage, "success", 3000);
      } catch (actionError) {
        showToast(`❌ ${actionError?.message || failMessage}`, "error", 5000);

        throw actionError;
      }
    },
    [apiRequest, patchEmail, showToast],
  );

  const markAsRead = useCallback(
    (emailId) =>
      runPatchAction(
        emailId,
        "read",
        (existing) => ({
          unread: false,
          isRead: true,
          labels: removeLabel(existing?.labels, "UNREAD"),
        }),
        "Email marked as read.",
        "Failed to mark email as read.",
      ),
    [runPatchAction],
  );

  const markAsUnread = useCallback(
    (emailId) =>
      runPatchAction(
        emailId,
        "unread",
        (existing) => ({
          unread: true,
          isRead: false,
          labels: addLabel(existing?.labels, "UNREAD"),
        }),
        "Email marked as unread.",
        "Failed to mark email as unread.",
      ),
    [runPatchAction],
  );

  const starEmail = useCallback(
    (emailId) =>
      runPatchAction(
        emailId,
        "star",
        (existing) => ({
          starred: true,
          isStarred: true,
          labels: addLabel(existing?.labels, "STARRED"),
        }),
        "Email starred successfully.",
        "Failed to star email.",
      ),
    [runPatchAction],
  );

  const unstarEmail = useCallback(
    (emailId) =>
      runPatchAction(
        emailId,
        "unstar",
        (existing) => ({
          starred: false,
          isStarred: false,
          labels: removeLabel(existing?.labels, "STARRED"),
        }),
        "Email unstarred successfully.",
        "Failed to unstar email.",
      ),
    [runPatchAction],
  );

  const archiveEmail = useCallback(
    (emailId) =>
      runPatchAction(
        emailId,
        "archive",
        (existing) => ({
          labels: removeLabel(existing?.labels, "INBOX"),
        }),
        "Email archived successfully.",
        "Failed to archive email.",
      ),
    [runPatchAction],
  );

  const moveToInbox = useCallback(
    (emailId) =>
      runPatchAction(
        emailId,
        "inbox",
        (existing) => ({
          labels: addLabel(existing?.labels, "INBOX"),
        }),
        "Email moved to inbox successfully.",
        "Failed to move email to inbox.",
      ),
    [runPatchAction],
  );

  /* ========================================
     TRASH EMAIL
  ======================================== */

  const trashEmail = useCallback(
    async (emailId) => {
      try {
        await apiRequest(`/api/emails/${encodeURIComponent(emailId)}/trash`, {
          method: "PATCH",
        });

        const existing = emailsByIdRef.current[emailId];

        patchEmail(emailId, {
          labels: normalizeLabels([
            ...removeLabel(existing?.labels, "INBOX"),
            "TRASH",
          ]),
        });

        if (activeEmailIdRef.current === emailId) {
          clearActiveEmail();
        }

        showToast("Email moved to trash successfully.", "success", 3000);
      } catch (trashError) {
        showToast(
          `❌ ${trashError?.message || "Failed to move email to trash."}`,
          "error",
          5000,
        );

        throw trashError;
      }
    },
    [apiRequest, patchEmail, clearActiveEmail, showToast],
  );

  /* ========================================
     SEND EMAIL
     attachments (File[]) ho to multipart/form-data,
     warna pehle jaisa JSON.
  ======================================== */

  const sendEmail = useCallback(
    async (emailData = {}) => {
      try {
        const { attachments = [], ...fields } = emailData;

        const result = await apiRequest("/api/emails/send", {
          method: "POST",
          body: attachments.length
            ? buildFormData(fields, attachments)
            : JSON.stringify(fields),
        });

        if (viewCacheRef.current.sent?.loaded) {
          fetchViewEmails("sent", { silent: true }).catch((refreshError) => {
            console.error(
              "Failed to refresh Sent after sending:",
              refreshError,
            );
          });
        }

        showToast("Email sent successfully.", "success", 3000);

        return result;
      } catch (sendError) {
        showToast(
          `❌ ${sendError?.message || "Failed to send email."}`,
          "error",
          5000,
        );

        throw sendError;
      }
    },
    [apiRequest, fetchViewEmails, showToast],
  );

  /* ========================================
     REPLY EMAIL
  ======================================== */

  const replyToEmail = useCallback(
    async (emailId, replyData = {}) => {
      if (!emailId) {
        const missingIdError = new Error("Email ID is required");

        showToast(`❌ ${missingIdError.message}`, "error", 5000);

        throw missingIdError;
      }

      try {
        const {
          text = "",
          html = "",
          replyAll = false,
          attachments = [],
        } = replyData;

        const fields = {
          text,
          html,
          replyAll: Boolean(replyAll),
        };

        const response = await apiRequest(
          `/api/emails/${encodeURIComponent(emailId)}/reply`,
          {
            method: "POST",
            body: attachments.length
              ? buildFormData(fields, attachments)
              : JSON.stringify(fields),
          },
        );

        /*
          Silent refresh: the thread updates in the
          background without flashing the full-screen
          loader. A failure here must not look like
          the reply itself failed.
        */
        try {
          await loadEmailThread(emailId, { silent: true });
        } catch (refreshError) {
          console.error("Failed to refresh thread after reply:", refreshError);
        }

        if (viewCacheRef.current.sent?.loaded) {
          fetchViewEmails("sent", { silent: true }).catch((refreshError) => {
            console.error(
              "Failed to refresh Sent after replying:",
              refreshError,
            );
          });
        }

        showToast("Reply sent successfully.", "success", 3000);

        return response;
      } catch (replyError) {
        showToast(
          `❌ ${replyError?.message || "Failed to send reply."}`,
          "error",
          5000,
        );

        throw replyError;
      }
    },
    [apiRequest, loadEmailThread, fetchViewEmails, showToast],
  );

  /* ========================================
     UNREAD COUNT
  ======================================== */

  const unreadCount = useMemo(() => {
    const inboxCache = viewCache.inbox;

    if (!inboxCache?.loaded) return 0;

    return inboxCache.ids.reduce((count, id) => {
      const email = emailsById[id];
      return email && !email.isRead ? count + 1 : count;
    }, 0);
  }, [viewCache.inbox, emailsById]);

  /* ========================================
     INITIAL LOAD
  ======================================== */

  useEffect(() => {
    fetchViewEmails("inbox", { maxResults: DEFAULT_MAX_RESULTS }).catch(
      (initialLoadError) => {
        console.error("Initial email load failed:", initialLoadError);
      },
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ========================================
     REALTIME GMAIL UPDATES

     Socket har mailbox me banta hai (apni ya delegated).
     attachMailboxRoomSync server ko batata hai ki ye socket kiski
     mailbox me hai:
       - apni mailbox     -> socket apne room (user:<id>) me rehta hai
       - delegated mailbox -> server is socket ko owner ke room me bhejta hai
                              (delegation + read permission check ke baad),
                              isliye owner ke naye / sent mail live aate hain
  ======================================== */

  useEffect(() => {
    /* Token ke saath authenticated socket (Render se seedha) */
    const socket = createAuthedSocket();

    /*
      Sahi mailbox ke room me rakho (connect / reconnect par bhi).
      Access hatne par refreshShared apni inbox par wapas le jaata hai.
    */
    const detachMailboxSync = attachMailboxRoomSync(socket, refreshShared);

    /*
      Open thread ko silently dobara fetch karo.

      Socket event sync se aata hai jo sirf metadata save karta hai
      (body nahi). Naye message ki body thread API se aati hai
      (backend usse Gmail se fetch karke save kar leta hai).
    */
    const scheduleActiveThreadRefresh = () => {
      if (threadRefreshTimerRef.current) {
        clearTimeout(threadRefreshTimerRef.current);
      }

      threadRefreshTimerRef.current = setTimeout(() => {
        threadRefreshTimerRef.current = null;

        const emailId = activeEmailIdRef.current;

        if (!emailId) return;

        loadEmailThreadRef.current?.(emailId, { silent: true }).catch(
          (refreshError) => {
            console.error(
              "Failed to refresh thread after realtime update:",
              refreshError,
            );
          },
        );
      }, THREAD_REFRESH_DELAY_MS);
    };

    const upsertRealtimeEmail = (payload) => {
      if (!payload?.id) return;

      const normalized = normalizeEmail(payload);

      setEmailsById((previous) => upsertEmailsIntoMap(previous, [normalized]));

      syncEmailMembershipToViews(normalized);

      const belongsToActiveThread =
        Boolean(normalized.threadId) &&
        activeThreadIdRef.current === normalized.threadId;

      if (belongsToActiveThread) {
        const existingInThread = activeThreadRef.current.find(
          (email) => email.id === normalized.id,
        );

        /*
          Is message ki body abhi kahin nahi hai
          (naya message, aur socket payload me body nahi)
          => thread refresh karwao.
        */
        const needsBody =
          !hasEmailBody(normalized) &&
          !(existingInThread && hasEmailBody(existingInThread));

        if (needsBody) {
          scheduleActiveThreadRefresh();
        }
      }

      setActiveThread((previous) => {
        const exists = previous.some((email) => email.id === normalized.id);

        if (!exists) {
          if (belongsToActiveThread) {
            /*
              Bina body wala naya message thread me mat jodo:
              "No message content available." flash hota hai.
              Refresh ke baad poora message body ke saath aayega.
            */
            if (!hasEmailBody(normalized)) {
              return previous;
            }

            return sortThreadMessages([...previous, normalized]);
          }

          return previous;
        }

        return previous.map((email) =>
          email.id === normalized.id
            ? mergeEmailRecord(email, normalized)
            : email,
        );
      });
    };

    const handleDeleted = (payload) => {
      const deletedId = payload?.id;

      if (!deletedId) return;

      setEmailsById((previous) => {
        if (!(deletedId in previous)) return previous;

        const next = { ...previous };
        delete next[deletedId];

        return next;
      });

      setViewCache((previous) => {
        let changed = false;
        const next = { ...previous };

        for (const viewKey of Object.keys(next)) {
          if (next[viewKey].ids.includes(deletedId)) {
            next[viewKey] = {
              ...next[viewKey],
              ids: next[viewKey].ids.filter((id) => id !== deletedId),
            };

            changed = true;
          }
        }

        return changed ? next : previous;
      });

      setActiveThread((previous) =>
        previous.filter((email) => email.id !== deletedId),
      );

      if (String(activeEmailIdRef.current) === String(deletedId)) {
        clearActiveEmail();
      }
    };

    socket.on("connect", () => {
      console.log("[SOCKET] Connected:", socket.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("[SOCKET] Disconnected:", reason);
    });

    socket.on("connect_error", (socketError) => {
      console.error(
        "[SOCKET] Connection error:",
        socketError?.message || socketError,
      );
    });

    socket.on("gmail:email-updated", upsertRealtimeEmail);
    socket.on("gmail:email-deleted", handleDeleted);

    socket.on("gmail:full-sync-complete", () => {
      console.log("[SOCKET] Gmail full sync completed");
    });

    socket.on("gmail:sync-complete", () => {
      console.log("[SOCKET] Gmail incremental sync completed");
    });

    return () => {
      if (threadRefreshTimerRef.current) {
        clearTimeout(threadRefreshTimerRef.current);
        threadRefreshTimerRef.current = null;
      }

      detachMailboxSync();

      socket.off("gmail:email-updated", upsertRealtimeEmail);
      socket.off("gmail:email-deleted", handleDeleted);
      socket.disconnect();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearActiveEmail, syncEmailMembershipToViews, refreshShared]);

  /* ========================================
     CONTEXT VALUE
  ======================================== */

  const value = {
    /* EMAIL DATA */
    viewEmails,
    emails: viewEmails,

    /* CURRENT VIEW */
    currentView,
    changeView,

    /* ACTIVE EMAIL */
    activeEmailId,
    activeEmail,
    activeThreadEmail,

    /* THREAD DATA */
    activeThread,
    activeThreadId,
    threadLoading,
    threadError,
    isThreadReady,

    /* GENERAL STATE */
    loading,
    loadingMore,
    error,
    nextPageToken: currentViewData.nextPageToken,
    hasMoreEmails,
    resultSizeEstimate: currentViewData.resultSizeEstimate,

    /* LOAD FUNCTIONS */
    loadMoreEmails,
    loadEmailById,
    loadEmailThread,
    selectEmail,
    clearActiveEmail,

    /* EMAIL ACTIONS */
    markAsRead,
    markAsUnread,
    starEmail,
    unstarEmail,
    archiveEmail,
    moveToInbox,
    trashEmail,
    sendEmail,
    replyToEmail,

    unreadCount,
  };

  return (
    <EmailsContext.Provider value={value}>{children}</EmailsContext.Provider>
  );
}

/* =========================================================
EMAILS PROVIDER (public)

key = kaun si mailbox khuli hai (apni ya kisi owner ki).
Mailbox badalte hi poora provider remount hota hai, isliye
purani mailbox ka emailsById / viewCache / active thread
naye mailbox me leak nahi hota, aur initial inbox load
dobara chalta hai (is baar X-Acting-As header ke saath).
========================================================= */

export function EmailsProvider({ children }) {
  /* FIX: MailboxContext se subscribe (ActingAsContext ki jagah) */
  const { acting } = useMailbox();

  const mailboxKey = acting?.ownerId || "self";

  return <EmailsProviderInner key={mailboxKey}>{children}</EmailsProviderInner>;
}

/* =========================================================
CUSTOM HOOK
========================================================= */

export function useEmails() {
  const context = useContext(EmailsContext);

  if (!context) {
    throw new Error("useEmails must be used inside EmailsProvider");
  }

  return context;
}