  import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    useCallback,
    useRef,
  } from "react";

  const EmailsContext = createContext(null);

  const API_URL = import.meta.env.VITE_API_URL || "";

  /* =========================================================
    CONSTANTS
  ========================================================= */

  const DEFAULT_MAX_RESULTS = 100;
  const MAX_RESULTS_LIMIT = 100;
  const POLLING_INTERVAL = 30000;

  /* =========================================================
    VIEW FILTERS (used for the actual Gmail API query)
  ========================================================= */

  const getViewFilters = (view = "inbox") => {
    switch (view) {
      case "unread":
        return {
          labelIds: "INBOX",
          query: "is:unread",
        };

      case "starred":
        return {
          labelIds: "STARRED",
        };

      case "sent":
        return {
          labelIds: "SENT",
        };

      case "drafts":
        return {
          labelIds: "DRAFT",
        };

      case "trash":
        return {
          labelIds: "TRASH",
        };

      case "inbox":
      default:
        return {
          labelIds: "INBOX",
        };
    }
  };

  /* =========================================================
    VIEW MATCHER (used client-side, against the cached pool)

    FIX: previously every view switch wiped allEmails and
    re-fetched from the network. Now allEmails accumulates
    everything we've ever fetched (merged by id), and we
    derive the emails for whichever view is currently active
    by filtering that shared pool with this function. This is
    what lets Inbox/Unread/Sent/etc. show instantly on repeat
    visits without a network round-trip.
  ========================================================= */

  const matchesView = (email, view = "inbox") => {
    const labels = Array.isArray(email?.labels) ? email.labels : [];

    switch (view) {
      case "unread":
        return labels.includes("INBOX") && Boolean(email?.unread);

      case "starred":
        return labels.includes("STARRED");

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

      if (!Number.isNaN(value) && value > 0) {
        return value;
      }
    }

    if (email.timestamp) {
      const value = Number(email.timestamp);

      if (!Number.isNaN(value) && value > 0) {
        return value;
      }
    }

    if (email.date) {
      const value = new Date(email.date).getTime();

      if (!Number.isNaN(value)) {
        return value;
      }
    }

    return 0;
  };

  const normalizeLabels = (labels) => {
    if (!Array.isArray(labels)) {
      return [];
    }

    return [...new Set(labels.filter(Boolean))];
  };

  const addLabel = (labels = [], label) => {
    return normalizeLabels([...labels, label]);
  };

  const removeLabel = (labels = [], label) => {
    return normalizeLabels(labels.filter((item) => item !== label));
  };

  /* =========================================================
    EXTRACT EMAILS FROM API RESPONSE
  ========================================================= */

  const extractEmailsFromResponse = (response) => {
    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response?.data?.emails)) {
      return response.data.emails;
    }

    if (Array.isArray(response?.emails)) {
      return response.emails;
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    if (Array.isArray(response?.messages)) {
      return response.messages;
    }

    if (Array.isArray(response?.data?.messages)) {
      return response.data.messages;
    }

    return [];
  };

  /* =========================================================
    EXTRACT RESPONSE META
  ========================================================= */

  const getResponseData = (response) => {
    if (response?.data && !Array.isArray(response.data)) {
      return response.data;
    }

    return response || {};
  };

  /* =========================================================
    NORMALIZE EMAIL
  ========================================================= */

  const normalizeEmail = (email = {}) => {
    const rawBody =
      email.body?.html ||
      email.body?.text ||
      email.bodyHtml ||
      email.bodyText ||
      (typeof email.body === "string" ? email.body : "");

    const timestamp = getEmailTimestamp(email);

    const labels = normalizeLabels(email.labels || email.labelIds || []);

    const isRead =
      typeof email.isRead === "boolean"
        ? email.isRead
        : typeof email.unread === "boolean"
          ? !email.unread
          : !labels.includes("UNREAD");

    const isStarred =
      typeof email.isStarred === "boolean"
        ? email.isStarred
        : typeof email.starred === "boolean"
          ? email.starred
          : labels.includes("STARRED");

    const isImportant =
      typeof email.isImportant === "boolean"
        ? email.isImportant
        : typeof email.important === "boolean"
          ? email.important
          : labels.includes("IMPORTANT");

    const senderEmail =
      email.from?.email ||
      email.senderEmail ||
      (typeof email.from === "string" ? email.from : "");

    const sender =
      email.from?.name ||
      email.from?.email ||
      email.sender ||
      email.fromName ||
      senderEmail ||
      "Unknown Sender";

    const emailId = email.id || email.messageId || email.message?.id || "";

    const threadId = email.threadId || email.thread?.id || emailId;

    return {
      ...email,

      id: emailId,

      threadId,

      sender,

      senderEmail,

      unread: !isRead,

      starred: isStarred,

      important: isImportant,

      isRead,

      isStarred,

      isImportant,

      subject: email.subject || email.snippet || "(No Subject)",

      time: email.date
        ? new Date(email.date).toLocaleString()
        : email.time || "",

      timestamp,

      date: email.date || email.internalDate || null,

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
    REMOVE DUPLICATES
  ========================================================= */

  const removeDuplicates = (emails = []) => {
    const map = new Map();

    emails.forEach((email) => {
      if (!email?.id) {
        return;
      }

      const existing = map.get(email.id);

      map.set(email.id, { ...existing, ...email });
    });

    return Array.from(map.values());
  };

  /* =========================================================
    MERGE EMAILS
  ========================================================= */

  const mergeEmails = (previous = [], incoming = []) => {
    const map = new Map();

    previous.forEach((email) => {
      if (email?.id) {
        map.set(email.id, email);
      }
    });

    incoming.forEach((email) => {
      if (!email?.id) {
        return;
      }

      const existing = map.get(email.id);

      map.set(email.id, {
        ...existing,
        ...email,

        labels: Array.isArray(email.labels)
          ? normalizeLabels(email.labels)
          : existing?.labels || [],
      });
    });

    return Array.from(map.values());
  };

  /* =========================================================
    SYNC EMAILS
  ========================================================= */

  const syncEmails = (previous = [], incoming = []) => {
    return mergeEmails(previous, incoming).sort(
      (a, b) => getEmailTimestamp(b) - getEmailTimestamp(a),
    );
  };

  /* =========================================================
    SORT THREAD MESSAGES
  ========================================================= */

  const sortThreadMessages = (messages = []) => {
    return [...messages].sort(
      (a, b) => getEmailTimestamp(a) - getEmailTimestamp(b),
    );
  };

  /* =========================================================
    GROUP EMAILS BY THREAD
  ========================================================= */

  const groupEmailsByThread = (emails = []) => {
    const threadMap = new Map();

    emails.forEach((email) => {
      const threadKey = email.threadId || email.id;

      if (!threadKey) {
        return;
      }

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
    const data = response?.data || response || {};

    if (Array.isArray(data.messages)) {
      return data.messages;
    }

    if (Array.isArray(data.thread)) {
      return data.thread;
    }

    if (Array.isArray(data.thread?.messages)) {
      return data.thread.messages;
    }

    if (Array.isArray(data.email?.messages)) {
      return data.email.messages;
    }

    if (Array.isArray(response?.messages)) {
      return response.messages;
    }

    return [];
  };

  /* =========================================================
    EMAILS PROVIDER
  ========================================================= */

  export function EmailsProvider({ children }) {
    /* ========================================
      RAW EMAIL STATE
      One shared pool for every view — merged by id, never
      wiped on view switch. This is the cache.
    ======================================== */

    const [allEmails, setAllEmails] = useState([]);

    /* ========================================
      CURRENT VIEW
    ======================================== */

    const [currentView, setCurrentView] = useState("inbox");

    /* ========================================
      PER-VIEW CACHE BOOKKEEPING

      FIX: tracks which views have already been fetched at
      least once, and each view's own pagination token, so
      switching back to a previously-visited view doesn't
      trigger a blocking network fetch.
    ======================================== */

    const fetchedViewsRef = useRef(new Set());

    const [nextPageTokens, setNextPageTokens] = useState({});

    const [resultSizeEstimates, setResultSizeEstimates] = useState({});

    /* ========================================
      REFS
    ======================================== */

    const isPollingRef = useRef(false);

    const isLoadingMoreRef = useRef(false);

    const latestThreadRequestRef = useRef(0);

    /* ========================================
      GROUPED EMAILS (full pool, all views combined —
      Labels pages rely on this being unfiltered)
    ======================================== */

    const emails = useMemo(
      () => groupEmailsByThread(allEmails),
      [allEmails],
    );

    /* ========================================
      EMAILS FOR THE CURRENT VIEW ONLY

      FIX: this is what Inbox.jsx should render — the shared
      pool filtered down to whichever view (inbox/unread/
      sent/...) is currently active, computed client-side so
      no re-fetch is needed once the underlying data exists.
    ======================================== */

    const viewEmails = useMemo(
      () => emails.filter((email) => matchesView(email, currentView)),
      [emails, currentView],
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

    /* ========================================
      GENERAL STATE
    ======================================== */

    const [loading, setLoading] = useState(false);

    const [loadingMore, setLoadingMore] = useState(false);

    const [error, setError] = useState(null);

    /* ========================================
      API REQUEST HELPER
    ======================================== */

    const apiRequest = useCallback(async (endpoint, options = {}) => {
      const headers = {
        ...options.headers,
      };

      if (options.body) {
        headers["Content-Type"] = "application/json";
      }

      const url = `${API_URL}${endpoint}`;

      const response = await fetch(url, {
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
      LOAD EMAIL LIST

      FIX: options.view is now required by every caller
      (changeView / loadMoreEmails / the polling effect) so
      each view's own pageToken/resultSizeEstimate is tracked
      separately. And — the key fix — allEmails is ALWAYS
      merged, never replaced, so switching views no longer
      throws away what was already fetched for other views.
    ======================================== */

    const loadEmails = useCallback(
      async (options = {}) => {
        const view = options.view || "inbox";

        const isSilent = Boolean(options.silent);

        const isPagination = Boolean(options.pageToken);

        try {
          if (isPagination) {
            setLoadingMore(true);
          } else if (!isSilent) {
            setLoading(true);

            setError(null);
          }

          const params = new URLSearchParams();

          const requestedMax = Number(
            options.maxResults || DEFAULT_MAX_RESULTS,
          );

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

          if (options.pageToken) {
            params.set("pageToken", options.pageToken);
          }

          if (options.labelIds) {
            const labels = Array.isArray(options.labelIds)
              ? options.labelIds.join(",")
              : options.labelIds;

            params.set("labelIds", labels);
          }

          if (typeof options.query === "string" && options.query.trim()) {
            params.set("query", options.query.trim());
          }

          const queryString = params.toString();

          const endpoint = `/api/emails${queryString ? `?${queryString}` : ""}`;

          const response = await apiRequest(endpoint);

          const rawEmails = extractEmailsFromResponse(response);

          const resultEmails = rawEmails
            .map(normalizeEmail)
            .filter((email) => email.id);

          /*
            FIX: always merge into the shared pool, regardless of
            whether this was a fresh view load, a pagination
            request, or a silent background refresh. Nothing gets
            wiped, so previously-loaded views stay cached.
          */
          setAllEmails((previous) => syncEmails(previous, resultEmails));

          const responseData = getResponseData(response);

          setNextPageTokens((previous) => ({
            ...previous,
            [view]: responseData?.nextPageToken || response?.nextPageToken || null,
          }));

          setResultSizeEstimates((previous) => ({
            ...previous,
            [view]:
              responseData?.resultSizeEstimate ||
              response?.resultSizeEstimate ||
              resultEmails.length ||
              0,
          }));

          return resultEmails;
        } catch (requestError) {
          console.error("Failed to load emails:", requestError);

          if (!isSilent) {
            setError(requestError.message || "Failed to load emails");
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

      setActiveEmailId(null);

      setActiveThread([]);

      setActiveThreadId(null);

      setThreadError(null);

      setThreadLoading(false);
    }, []);

    /* ========================================
      CHANGE VIEW

      FIX: no longer wipes allEmails/nextPageToken. If this
      view was already fetched once this session, switch to
      it instantly from cache and refresh quietly in the
      background (silent: true — doesn't touch `loading`).
      Only views being visited for the very first time do a
      blocking fetch.
    ======================================== */

    const changeView = useCallback(
      async (view = "inbox") => {
        const normalizedView = view || "inbox";

        setCurrentView(normalizedView);

        clearActiveEmail();

        const filters = getViewFilters(normalizedView);

        const alreadyFetched = fetchedViewsRef.current.has(normalizedView);

        if (alreadyFetched) {
          loadEmails({
            view: normalizedView,

            maxResults: DEFAULT_MAX_RESULTS,

            ...filters,

            silent: true,
          }).catch((refreshError) => {
            console.error(
              `Background refresh failed for view "${normalizedView}":`,
              refreshError,
            );
          });

          return;
        }

        try {
          await loadEmails({
            view: normalizedView,

            maxResults: DEFAULT_MAX_RESULTS,

            ...filters,
          });

          fetchedViewsRef.current.add(normalizedView);
        } catch (changeViewError) {
          console.error("Failed to change email view:", changeViewError);
        }
      },
      [loadEmails, clearActiveEmail],
    );

    /* ========================================
      LOAD MORE EMAILS (pagination is per-view)
    ======================================== */

    const loadMoreEmails = useCallback(async () => {
      const tokenForView = nextPageTokens[currentView];

      if (!tokenForView) {
        return [];
      }

      if (isLoadingMoreRef.current) {
        return [];
      }

      isLoadingMoreRef.current = true;

      try {
        const filters = getViewFilters(currentView);

        return await loadEmails({
          view: currentView,

          maxResults: DEFAULT_MAX_RESULTS,

          pageToken: tokenForView,

          ...filters,
        });
      } finally {
        isLoadingMoreRef.current = false;
      }
    }, [nextPageTokens, currentView, loadEmails]);

    const hasMoreEmails = Boolean(nextPageTokens[currentView]);

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

        const rawEmail =
          response?.data?.email || response?.email || response?.data || null;

        if (!rawEmail || Array.isArray(rawEmail)) {
          throw new Error("Email not found");
        }

        const fullEmail = normalizeEmail(rawEmail);

        setAllEmails((previous) => syncEmails(previous, [fullEmail]));

        return fullEmail;
      },
      [apiRequest],
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

          const responseData = getResponseData(response);

          const threadId =
            responseData?.threadId ||
            responseData?.id ||
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
            setAllEmails((previous) => syncEmails(previous, sortedThread));
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
      [apiRequest],
    );

    /* ========================================
      SELECT EMAIL

      This is the function that actually fetches an email's
      full body/thread. Every page that lets the user open an
      email (Inbox, LabelDetail, ...) must call this — not just
      read an email object out of a locally-filtered list —
      otherwise the preview has no body to show.
    ======================================== */

    const selectEmail = useCallback(
      async (emailId) => {
        if (!emailId) {
          clearActiveEmail();

          return null;
        }

        setActiveEmailId(emailId);

        try {
          const thread = await loadEmailThread(emailId);

          const selectedFromThread = thread.find(
            (email) => email.id === emailId,
          );

          if (selectedFromThread) {
            return selectedFromThread;
          }

          return await loadEmailById(emailId);
        } catch (requestError) {
          console.error("Failed to select email:", requestError);

          return null;
        }
      },
      [loadEmailThread, loadEmailById, clearActiveEmail],
    );

    /* ========================================
      ACTIVE EMAIL
    ======================================== */

    const activeEmail = useMemo(() => {
      if (!activeEmailId) {
        return null;
      }

      const threadEmail = activeThread.find(
        (email) => email.id === activeEmailId,
      );

      if (threadEmail) {
        return threadEmail;
      }

      return allEmails.find((email) => email.id === activeEmailId) || null;
    }, [allEmails, activeThread, activeEmailId]);

    /* ========================================
      ACTIVE THREAD EMAIL
    ======================================== */

    const activeThreadEmail = useMemo(() => {
      if (!activeEmailId) {
        return null;
      }

      return (
        activeThread.find((email) => email.id === activeEmailId) ||
        activeEmail ||
        null
      );
    }, [activeThread, activeEmailId, activeEmail]);

    /* ========================================
      UPDATE LOCAL EMAIL
    ======================================== */

    const updateEmail = useCallback((emailId, updates = {}) => {
      if (!emailId) {
        return;
      }

      const applyUpdate = (email) => {
        if (email.id !== emailId) {
          return email;
        }

        return {
          ...email,
          ...updates,

          labels: Array.isArray(updates.labels)
            ? normalizeLabels(updates.labels)
            : email.labels,
        };
      };

      setAllEmails((previous) => previous.map(applyUpdate));

      setActiveThread((previous) => previous.map(applyUpdate));
    }, []);

    /* ========================================
      MARK AS READ
    ======================================== */

    const markAsRead = useCallback(
      async (emailId) => {
        await apiRequest(`/api/emails/${encodeURIComponent(emailId)}/read`, {
          method: "PATCH",
        });

        const applyRead = (email) =>
          email.id === emailId
            ? {
                ...email,

                unread: false,

                isRead: true,

                labels: removeLabel(email.labels, "UNREAD"),
              }
            : email;

        setAllEmails((previous) => previous.map(applyRead));

        setActiveThread((previous) => previous.map(applyRead));
      },
      [apiRequest],
    );

    /* ========================================
      MARK AS UNREAD
    ======================================== */

    const markAsUnread = useCallback(
      async (emailId) => {
        await apiRequest(`/api/emails/${encodeURIComponent(emailId)}/unread`, {
          method: "PATCH",
        });

        const applyUnread = (email) =>
          email.id === emailId
            ? {
                ...email,

                unread: true,

                isRead: false,

                labels: addLabel(email.labels, "UNREAD"),
              }
            : email;

        setAllEmails((previous) => previous.map(applyUnread));

        setActiveThread((previous) => previous.map(applyUnread));
      },
      [apiRequest],
    );

    /* ========================================
      STAR EMAIL
    ======================================== */

    const starEmail = useCallback(
      async (emailId) => {
        await apiRequest(`/api/emails/${encodeURIComponent(emailId)}/star`, {
          method: "PATCH",
        });

        const applyStar = (email) =>
          email.id === emailId
            ? {
                ...email,

                starred: true,

                isStarred: true,

                labels: addLabel(email.labels, "STARRED"),
              }
            : email;

        setAllEmails((previous) => previous.map(applyStar));

        setActiveThread((previous) => previous.map(applyStar));
      },
      [apiRequest],
    );

    /* ========================================
      UNSTAR EMAIL
    ======================================== */

    const unstarEmail = useCallback(
      async (emailId) => {
        await apiRequest(`/api/emails/${encodeURIComponent(emailId)}/unstar`, {
          method: "PATCH",
        });

        const applyUnstar = (email) =>
          email.id === emailId
            ? {
                ...email,

                starred: false,

                isStarred: false,

                labels: removeLabel(email.labels, "STARRED"),
              }
            : email;

        setAllEmails((previous) => previous.map(applyUnstar));

        setActiveThread((previous) => previous.map(applyUnstar));
      },
      [apiRequest],
    );

    /* ========================================
      ARCHIVE EMAIL
    ======================================== */

    const archiveEmail = useCallback(
      async (emailId) => {
        await apiRequest(`/api/emails/${encodeURIComponent(emailId)}/archive`, {
          method: "PATCH",
        });

        const applyArchive = (email) =>
          email.id === emailId
            ? {
                ...email,

                labels: removeLabel(email.labels, "INBOX"),
              }
            : email;

        setAllEmails((previous) => previous.map(applyArchive));

        setActiveThread((previous) => previous.map(applyArchive));
      },
      [apiRequest],
    );

    /* ========================================
      MOVE TO INBOX
    ======================================== */

    const moveToInbox = useCallback(
      async (emailId) => {
        await apiRequest(`/api/emails/${encodeURIComponent(emailId)}/inbox`, {
          method: "PATCH",
        });

        const applyMove = (email) =>
          email.id === emailId
            ? {
                ...email,

                labels: addLabel(email.labels, "INBOX"),
              }
            : email;

        setAllEmails((previous) => previous.map(applyMove));

        setActiveThread((previous) => previous.map(applyMove));
      },
      [apiRequest],
    );

    /* ========================================
      TRASH EMAIL
    ======================================== */

    const trashEmail = useCallback(
      async (emailId) => {
        await apiRequest(`/api/emails/${encodeURIComponent(emailId)}`, {
          method: "DELETE",
        });

        const applyTrash = (email) =>
          email.id === emailId
            ? {
                ...email,

                labels: normalizeLabels([
                  ...removeLabel(email.labels, "INBOX"),
                  "TRASH",
                ]),
              }
            : email;

        setAllEmails((previous) => previous.map(applyTrash));

        setActiveThread((previous) => previous.map(applyTrash));

        if (activeEmailId === emailId) {
          clearActiveEmail();
        }
      },
      [apiRequest, activeEmailId, clearActiveEmail],
    );

    /* ========================================
      SEND EMAIL
    ======================================== */

    const sendEmail = useCallback(
      async (emailData) => {
        return await apiRequest("/api/emails/send", {
          method: "POST",

          body: JSON.stringify(emailData),
        });
      },
      [apiRequest],
    );

    /* ========================================
      REPLY EMAIL
    ======================================== */

    const replyToEmail = useCallback(
      async (emailId, replyData = {}) => {
        if (!emailId) {
          throw new Error("Email ID is required");
        }

        const response = await apiRequest(
          `/api/emails/${encodeURIComponent(emailId)}/reply`,
          {
            method: "POST",

            body: JSON.stringify({
              text: replyData.text || replyData.body || "",

              html: replyData.html || "",

              replyAll: Boolean(replyData.replyAll),
            }),
          },
        );

        await loadEmailThread(emailId);

        return response;
      },
      [apiRequest, loadEmailThread],
    );

    /* ========================================
      DELETE LOCAL EMAIL
    ======================================== */

    const deleteEmail = useCallback(
      (emailId) => {
        setAllEmails((previous) => previous.filter((email) => email.id !== emailId));

        setActiveThread((previous) => previous.filter((email) => email.id !== emailId));

        if (activeEmailId === emailId) {
          clearActiveEmail();
        }
      },
      [activeEmailId, clearActiveEmail],
    );

    /* ========================================
      UNREAD COUNT (across the full pool)
    ======================================== */

    const unreadCount = useMemo(
      () => emails.filter((email) => email.unread).length,
      [emails],
    );

    /* ========================================
      KEEP A REF TO THE LATEST VIEW

      FIX: the polling effect below must NOT depend on
      currentView directly — that was the remaining bug. If it
      did, switching views would tear down and remount the
      effect every time, firing an extra non-silent (blocking)
      fetch on top of whatever changeView() already did. Using
      a ref lets the interval always read the latest view
      without re-triggering the effect.
    ======================================== */

    const currentViewRef = useRef(currentView);

    useEffect(() => {
      currentViewRef.current = currentView;
    }, [currentView]);

    /* ========================================
      INITIAL LOAD + POLLING

      FIX: this effect now runs once (mount only) — it does
      NOT re-run when currentView changes, so switching views
      no longer triggers a second, redundant blocking fetch on
      top of changeView()'s own fetch/cache logic. The interval
      always polls whatever view is current via currentViewRef.
    ======================================== */

    useEffect(() => {
      let intervalId;

      const fetchLatestEmails = async (silent = true) => {
        if (isPollingRef.current) {
          return;
        }

        if (document.visibilityState === "hidden") {
          return;
        }

        isPollingRef.current = true;

        try {
          const view = currentViewRef.current;

          const filters = getViewFilters(view);

          await loadEmails({
            view,

            maxResults: DEFAULT_MAX_RESULTS,

            ...filters,

            silent,
          });

          fetchedViewsRef.current.add(view);
        } catch (pollingError) {
          console.error("Failed to fetch latest emails:", pollingError);
        } finally {
          isPollingRef.current = false;
        }
      };

      fetchLatestEmails(false);

      intervalId = setInterval(() => {
        fetchLatestEmails(true);
      }, POLLING_INTERVAL);

      const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          fetchLatestEmails(true);
        }
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);

      return () => {
        clearInterval(intervalId);

        document.removeEventListener("visibilitychange", handleVisibilityChange);

        isPollingRef.current = false;
      };
      // Intentionally NOT depending on currentView — see comment above.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadEmails]);

    /* ========================================
      ACTIVE THREAD POLLING
    ======================================== */

    useEffect(() => {
      if (!activeEmailId) {
        return undefined;
      }

      const intervalId = setInterval(() => {
        if (document.visibilityState === "visible") {
          loadEmailThread(activeEmailId, { silent: true }).catch((error) => {
            console.error("Failed to refresh active thread:", error);
          });
        }
      }, 50000);

      return () => {
        clearInterval(intervalId);
      };
    }, [activeEmailId, loadEmailThread]);

    /* ========================================
      CONTEXT VALUE
    ======================================== */

    const value = {
      /* EMAIL DATA */

      emails,

      viewEmails,

      allEmails,

      setEmails: setAllEmails,

      setAllEmails,

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

      /* GENERAL STATE */

      loading,

      loadingMore,

      error,

      nextPageToken: nextPageTokens[currentView] || null,

      hasMoreEmails,

      resultSizeEstimate: resultSizeEstimates[currentView] || 0,

      /* LOAD FUNCTIONS */

      loadEmails,

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

      /* LOCAL HELPERS */

      updateEmail,

      deleteEmail,

      unreadCount,
    };

    return (
      <EmailsContext.Provider value={value}>{children}</EmailsContext.Provider>
    );
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