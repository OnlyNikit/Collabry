import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";

import api from "../services/api";
import { useToast } from "./ToastContext";
import { useMailbox } from "./MailboxContext";

/* =========================================================
   CONTEXT
========================================================= */

const LabelsContext = createContext(null);

/* =========================================================
   INNER PROVIDER
========================================================= */

function LabelsProviderInner({ children }) {
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { showToast } = useToast();

  /* =======================================================
     FETCH ALL LABELS
  ======================================================= */

  const fetchLabels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get("/labels");

      const fetchedLabels = response.data?.labels || [];

      setLabels(fetchedLabels);

      return fetchedLabels;
    } catch (err) {
      console.error("Fetch labels error:", err);

      const message = err.response?.data?.message || "Failed to fetch labels.";

      setError(message);

      showToast(`❌ ${message}`, "error", 5000);

      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  /* =======================================================
     LOAD LABELS ON START
  ======================================================= */

  useEffect(() => {
    fetchLabels().catch((err) => {
      console.error("Initial labels load failed:", err.message);
    });
  }, [fetchLabels]);

  /* =======================================================
     CREATE LABEL
  ======================================================= */

  const createLabel = useCallback(
    async (data) => {
      const name = data.name?.trim();

      if (!name) {
        const message = "Label name is required.";

        showToast(`❌ ${message}`, "error", 5000);

        throw new Error(message);
      }

      try {
        setError(null);

        const response = await api.post("/labels", {
          name,
          description: data.description?.trim() || "",
          color: data.color || "pink",
          icon: data.icon || "🏷️",
        });

        const newLabel = response.data?.label;

        if (!newLabel) {
          throw new Error("Label was not returned by server.");
        }

        setLabels((previous) => [...previous, newLabel]);

        showToast("Label created successfully.", "success", 3000);

        return newLabel;
      } catch (err) {
        console.error("Create label error:", err);

        const message =
          err.response?.data?.message ||
          err.message ||
          "Failed to create label.";

        setError(message);

        showToast(`❌ ${message}`, "error", 5000);

        throw new Error(message);
      }
    },
    [showToast],
  );

  /* =======================================================
     UPDATE LABEL
  ======================================================= */

  const updateLabel = useCallback(
    async (labelId, updates) => {
      if (!labelId) {
        const message = "Label ID is required.";

        showToast(`❌ ${message}`, "error", 5000);

        throw new Error(message);
      }

      try {
        setError(null);

        const response = await api.patch(`/labels/${labelId}`, updates);

        const updatedLabel = response.data?.label;

        if (!updatedLabel) {
          throw new Error("Updated label was not returned by server.");
        }

        setLabels((previous) =>
          previous.map((label) =>
            String(label._id) === String(labelId) ? updatedLabel : label,
          ),
        );

        showToast("Label updated successfully.", "success", 3000);

        return updatedLabel;
      } catch (err) {
        console.error("Update label error:", err);

        const message =
          err.response?.data?.message ||
          err.message ||
          "Failed to update label.";

        setError(message);

        showToast(`❌ ${message}`, "error", 5000);

        throw new Error(message);
      }
    },
    [showToast],
  );

  /* =======================================================
     DELETE LABEL
  ======================================================= */

  const deleteLabel = useCallback(
    async (labelId) => {
      if (!labelId) {
        const message = "Label ID is required.";

        showToast(`❌ ${message}`, "error", 5000);

        throw new Error(message);
      }

      try {
        setError(null);

        await api.delete(`/labels/${labelId}`);

        setLabels((previous) =>
          previous.filter((label) => String(label._id) !== String(labelId)),
        );

        showToast("Label deleted successfully.", "success", 3000);

        return true;
      } catch (err) {
        console.error("Delete label error:", err);

        const message =
          err.response?.data?.message ||
          err.message ||
          "Failed to delete label.";

        setError(message);

        showToast(`❌ ${message}`, "error", 5000);

        throw new Error(message);
      }
    },
    [showToast],
  );

  /* =======================================================
     GET SINGLE LABEL
  ======================================================= */

  const getLabel = useCallback(
    (labelId) =>
      labels.find((label) => String(label._id) === String(labelId)),
    [labels],
  );

  /* =======================================================
     CHECK LABEL EXISTS
  ======================================================= */

  const labelExists = useCallback(
    (name, excludeId = null) => {
      if (!name?.trim()) {
        return false;
      }

      return labels.some(
        (label) =>
          label.name?.trim().toLowerCase() === name.trim().toLowerCase() &&
          String(label._id) !== String(excludeId),
      );
    },
    [labels],
  );

  /* =======================================================
     CONTEXT VALUE
  ======================================================= */

  const value = {
    labels,
    loading,
    error,

    fetchLabels,

    createLabel,
    updateLabel,
    deleteLabel,

    getLabel,
    labelExists,
  };

  return (
    <LabelsContext.Provider value={value}>{children}</LabelsContext.Provider>
  );
}

/* =========================================================
   PUBLIC PROVIDER

   Mailbox badalte hi inner provider remount hota hai:
   purane owner ke labels clear ho jaate hain aur naye owner ke
   labels dobara fetch hote hain (X-Acting-As header ke saath).
========================================================= */

export function LabelsProvider({ children }) {
  const { mailboxKey } = useMailbox();

  return (
    <LabelsProviderInner key={mailboxKey}>{children}</LabelsProviderInner>
  );
}

/* =========================================================
   HOOK
========================================================= */

export function useLabels() {
  const context = useContext(LabelsContext);

  if (!context) {
    throw new Error("useLabels must be used inside LabelsProvider");
  }

  return context;
}