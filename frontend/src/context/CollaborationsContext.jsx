import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

import {
  getCollaborations as getCollaborationsService,
  createCollaboration as createCollaborationService,
  updateCollaboration as updateCollaborationService,
  deleteCollaboration as deleteCollaborationService,
} from "../services/collaborationService";

import { useToast } from "./ToastContext";

/* =========================================================
   CONTEXT
========================================================= */

const CollaborationsContext =
  createContext(null);

/* =========================================================
   PROVIDER
========================================================= */

export function CollaborationProvider({
  children,
}) {
  const [
    collaborations,
    setCollaborations,
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

  /* =======================================================
     FETCH COLLABORATIONS
  ======================================================= */

  const fetchCollaborations =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError(null);

          const data =
            await getCollaborationsService();

          setCollaborations(
            Array.isArray(data)
              ? data
              : []
          );

          return data;
        } catch (error) {
          console.error(
            "Failed to fetch collaborations:",
            error
          );

          const message =
            error?.response
              ?.data
              ?.message ||
            error?.message ||
            "Failed to load collaborations";

          setError(
            message
          );

          showToast(
            `❌ ${message}`,
            "error",
            5000
          );

          throw error;
        } finally {
          setLoading(
            false
          );
        }
      },
      [showToast]
    );

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    fetchCollaborations()
      .catch(() => {
        /*
          Error already stored
          in context state and
          shown through toast.
        */
      });
  }, [
    fetchCollaborations,
  ]);

  /* =======================================================
     CREATE
  ======================================================= */

  const createCollaboration =
    useCallback(
      async (data) => {
        try {
          const collaboration =
            await createCollaborationService(
              data
            );

          setCollaborations(
            (previous) => [
              collaboration,
              ...previous,
            ]
          );

          showToast(
            "Collaboration created successfully.",
            "success",
            3000
          );

          return collaboration;
        } catch (error) {
          console.error(
            "Failed to create collaboration:",
            error
          );

          const message =
            error?.response
              ?.data
              ?.message ||
            error?.message ||
            "Failed to create collaboration";

          setError(
            message
          );

          showToast(
            `❌ ${message}`,
            "error",
            5000
          );

          throw error;
        }
      },
      [showToast]
    );

  /* =======================================================
     UPDATE
  ======================================================= */

  const updateCollaboration =
    useCallback(
      async (
        id,
        updates
      ) => {
        try {
          const updatedCollaboration =
            await updateCollaborationService(
              id,
              updates
            );

          setCollaborations(
            (previous) =>
              previous.map(
                (collaboration) => {
                  const collaborationId =
                    collaboration._id ||
                    collaboration.id;

                  if (
                    String(
                      collaborationId
                    ) ===
                    String(id)
                  ) {
                    return updatedCollaboration;
                  }

                  return collaboration;
                }
              )
          );

          showToast(
            "Collaboration updated successfully.",
            "success",
            3000
          );

          return updatedCollaboration;
        } catch (error) {
          console.error(
            "Failed to update collaboration:",
            error
          );

          const message =
            error?.response
              ?.data
              ?.message ||
            error?.message ||
            "Failed to update collaboration";

          setError(
            message
          );

          showToast(
            `❌ ${message}`,
            "error",
            5000
          );

          throw error;
        }
      },
      [showToast]
    );

  /* =======================================================
     DELETE
  ======================================================= */

  const deleteCollaboration =
    useCallback(
      async (id) => {
        try {
          await deleteCollaborationService(
            id
          );

          setCollaborations(
            (previous) =>
              previous.filter(
                (
                  collaboration
                ) => {
                  const collaborationId =
                    collaboration._id ||
                    collaboration.id;

                  return (
                    String(
                      collaborationId
                    ) !==
                    String(id)
                  );
                }
              )
          );

          showToast(
            "Collaboration deleted successfully.",
            "success",
            3000
          );

          return true;
        } catch (error) {
          console.error(
            "Failed to delete collaboration:",
            error
          );

          const message =
            error?.response
              ?.data
              ?.message ||
            error?.message ||
            "Failed to delete collaboration";

          setError(
            message
          );

          showToast(
            `❌ ${message}`,
            "error",
            5000
          );

          throw error;
        }
      },
      [showToast]
    );

  /* =======================================================
     CONTEXT VALUE
  ======================================================= */

  const value = {
    collaborations,

    loading,

    error,

    fetchCollaborations,

    createCollaboration,

    updateCollaboration,

    deleteCollaboration,
  };

  return (
    <CollaborationsContext.Provider
      value={value}
    >
      {children}
    </CollaborationsContext.Provider>
  );
}

/* =========================================================
   CUSTOM HOOK
========================================================= */

export function useCollaboration() {
  const context =
    useContext(
      CollaborationsContext
    );

  if (!context) {
    throw new Error(
      "useCollaboration must be used within CollaborationProvider"
    );
  }

  return context;
}

export default
  CollaborationsContext;