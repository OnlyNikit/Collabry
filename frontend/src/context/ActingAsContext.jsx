import { createContext, useContext, useState, useCallback } from "react";

/* =========================================================
   ACTING AS (delegation)

   Delegate jab kisi owner ki mailbox kholta hai to yahan
   { ownerId, name, email } save hota hai.

   EmailContext / axios ye ownerId "X-Acting-As" header me bhejte hain,
   backend ka actingAs middleware usi se owner ki mailbox serve karta hai.
========================================================= */

const STORAGE_KEY = "clb_acting_as";

const ActingAsContext = createContext(null);

const readStored = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;

    return parsed?.ownerId ? parsed : null;
  } catch {
    return null;
  }
};

/*
  Hook ke bina bhi chalta hai (apiRequest / axios interceptor
  component ke bahar hote hain).
*/
export const getActingAsId = () => readStored()?.ownerId || null;

export function ActingAsProvider({ children }) {
  const [actingAs, setActingAs] = useState(readStored);

  /* owner = { ownerId, name, email } */
  const startActingAs = useCallback((owner) => {
    if (!owner?.ownerId) return;

    const value = {
      ownerId: String(owner.ownerId),
      name: owner.name || "",
      email: owner.email || "",
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    setActingAs(value);
  }, []);

  const stopActingAs = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setActingAs(null);
  }, []);

  const value = {
    actingAs,
    isActingAs: Boolean(actingAs),
    startActingAs,
    stopActingAs,
  };

  return (
    <ActingAsContext.Provider value={value}>
      {children}
    </ActingAsContext.Provider>
  );
}

export function useActingAs() {
  const context = useContext(ActingAsContext);

  if (!context) {
    throw new Error("useActingAs must be used inside ActingAsProvider");
  }

  return context;
}

export default ActingAsContext;