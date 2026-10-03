import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../services/api"; // your existing Axios instance (baseURL = /api)
import { useAuth } from "./AuthContext";

const KEY = "collabry_acting_as";

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

// Module-level so even the very first requests on page load carry the header
let current = load();

/*
  Sirf wahi paths jo delegated mailbox ke hain (backend actingAs map ke
  mounts: /api/emails, /api/email-labels, /api/labels).
  Tracker / collaborations / share jaisi requests par header nahi jaata,
  warna backend me default-deny se 403 aa sakta hai.
*/
const MAILBOX_PATHS = ["/emails", "/email-labels", "/labels"];

const isMailboxRequest = (url = "") =>
  MAILBOX_PATHS.some(
    (path) =>
      url === path ||
      url.startsWith(`${path}/`) ||
      url.startsWith(`${path}?`),
  );

/*
  Axios (api) ke liye interceptor.
  NOTE: EmailContext fetch() use karta hai, wahan getActingOwnerId() se
  header manually lagta hai.
*/
api.interceptors.request.use((config) => {
  if (current?.ownerId && isMailboxRequest(config.url)) {
    config.headers["X-Acting-As"] = current.ownerId;
  }

  return config;
});

/* fetch() based code (EmailContext) ke liye: abhi kis owner ke inbox mein hain */
export const getActingOwnerId = () => current?.ownerId || null;

const MailboxContext = createContext(null);

export function MailboxProvider({ children }) {
  const { user } = useAuth();
  const userId = user?._id || user?.id || user?.email || null;

  const [acting, setActing] = useState(current);
  const [sharedMailboxes, setSharedMailboxes] = useState([]);

  /* "me" ya delegated owner ka id.
     Ye badalte hi EmailsProvider / LabelsProvider remount hokar refetch karte hain. */
  const mailboxKey = acting?.ownerId || "me";

  function persist(value) {
    current = value; // interceptor aur fetch() ke liye turant

    if (value) localStorage.setItem(KEY, JSON.stringify(value));
    else localStorage.removeItem(KEY);

    setActing(value);
  }

  /* Switch mailbox. value = { ownerId, ownerName, permissions } or null (own inbox).
     Reload nahi hota: mailboxKey badalne se mailbox ka data khud refetch hota hai. */
  const switchTo = useCallback((value) => {
    persist(value);
  }, []);

  /* Call on logout so the next login never starts in someone else's mailbox */
  const clearActing = useCallback(() => persist(null), []);

  /* Load mailboxes shared with me, and keep the stored permissions in sync */
  const refreshShared = useCallback(async () => {
    try {
      const { data } = await api.get("/delegations/received");

      const active = data.filter(
        (d) =>
          d.status === "active" &&
          (!d.expiresAt || new Date(d.expiresAt) > new Date()),
      );

      setSharedMailboxes(active);

      if (current) {
        const match = active.find((d) => d.owner._id === current.ownerId);

        if (!match) {
          // Access revoked or expired: go back to own inbox (no reload)
          persist(null);
        } else if (match.permissions.join() !== current.permissions.join()) {
          persist({ ...current, permissions: match.permissions });
        }
      }
    } catch (error) {
      console.error("[MAILBOX] Failed to load shared mailboxes:", error);
    }
  }, []);

  useEffect(() => {
    if (userId) refreshShared();
    else setSharedMailboxes([]);
  }, [userId, refreshShared]);

  const can = useCallback(
    (permission) => !acting || acting.permissions.includes(permission),
    [acting],
  );

  const value = useMemo(
    () => ({
      acting,
      mailboxKey,
      isDelegated: !!acting,
      sharedMailboxes,
      switchTo,
      clearActing,
      refreshShared,
      can,
    }),
    [
      acting,
      mailboxKey,
      sharedMailboxes,
      switchTo,
      clearActing,
      refreshShared,
      can,
    ],
  );

  return (
    <MailboxContext.Provider value={value}>{children}</MailboxContext.Provider>
  );
}

export const useMailbox = () => useContext(MailboxContext);