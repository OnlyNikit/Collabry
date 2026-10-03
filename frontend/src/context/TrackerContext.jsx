import {
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";

import {
  getTrackers,
  createTracker,
  updateTracker,
  deleteTracker,
} from "../services/trackerService";

import { useToast } from "./ToastContext";

const TrackerContext =
  createContext(null);

/* =========================================================
   PROVIDER
========================================================= */

export function TrackerProvider({
  children,
}) {
  const [
    trackers,
    setTrackers,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState(null);

  const { showToast } =
    useToast();

  /* =====================================================
     LOAD TRACKERS
  ===================================================== */

  async function loadTrackers() {
    try {
      setLoading(true);
      setError(null);

      const data =
        await getTrackers();

      setTrackers(
        data
      );
    } catch (err) {
      console.error(
        "Failed to load trackers:",
        err
      );

      const message =
        err?.response
          ?.data
          ?.message ||
        err?.message ||
        "Failed to load trackers";

      setError(
        message
      );

      showToast(
        `❌ ${message}`,
        "error",
        5000
      );
    } finally {
      setLoading(false);
    }
  }

  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(
    () => {
      loadTrackers();
    },
    []
  );

  /* =====================================================
     CREATE
  ===================================================== */

  async function addTracker(
    data
  ) {
    try {
      const newTracker =
        await createTracker(
          data
        );

      setTrackers(
        (currentTrackers) => [
          newTracker,
          ...currentTrackers,
        ]
      );

      showToast(
        "Tracker created successfully.",
        "success",
        3000
      );

      return newTracker;
    } catch (err) {
      console.error(
        "Failed to create tracker:",
        err
      );

      const message =
        err?.response
          ?.data
          ?.message ||
        err?.message ||
        "Failed to create tracker";

      setError(
        message
      );

      showToast(
        `❌ ${message}`,
        "error",
        5000
      );

      throw err;
    }
  }

  /* =====================================================
     UPDATE
  ===================================================== */

  async function updateTrackerById(
    id,
    updates
  ) {
    try {
      const updatedTracker =
        await updateTracker(
          id,
          updates
        );

      setTrackers(
        (currentTrackers) =>
          currentTrackers.map(
            (tracker) =>
              tracker.id === id
                ? updatedTracker
                : tracker
          )
      );

      showToast(
        "Tracker updated successfully.",
        "success",
        3000
      );

      return updatedTracker;
    } catch (err) {
      console.error(
        "Failed to update tracker:",
        err
      );

      const message =
        err?.response
          ?.data
          ?.message ||
        err?.message ||
        "Failed to update tracker";

      setError(
        message
      );

      showToast(
        `❌ ${message}`,
        "error",
        5000
      );

      throw err;
    }
  }

  /* =====================================================
     DELETE
  ===================================================== */

  async function deleteTrackerById(
    id
  ) {
    try {
      await deleteTracker(
        id
      );

      setTrackers(
        (currentTrackers) =>
          currentTrackers.filter(
            (tracker) =>
              tracker.id !== id
          )
      );

      showToast(
        "Tracker deleted successfully.",
        "success",
        3000
      );
    } catch (err) {
      console.error(
        "Failed to delete tracker:",
        err
      );

      const message =
        err?.response
          ?.data
          ?.message ||
        err?.message ||
        "Failed to delete tracker";

      setError(
        message
      );

      showToast(
        `❌ ${message}`,
        "error",
        5000
      );

      throw err;
    }
  }

  /* =====================================================
     PROVIDER
  ===================================================== */

  return (
    <TrackerContext.Provider
      value={{
        trackers,

        loading,

        error,

        loadTrackers,

        addTracker,

        updateTracker:
          updateTrackerById,

        deleteTracker:
          deleteTrackerById,
      }}
    >
      {children}
    </TrackerContext.Provider>
  );
}

/* =========================================================
   HOOK
========================================================= */

export function useTracker() {
  const context =
    useContext(
      TrackerContext
    );

  if (!context) {
    throw new Error(
      "useTracker must be used inside TrackerProvider"
    );
  }

  return context;
}