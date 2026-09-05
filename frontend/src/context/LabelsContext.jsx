import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";

import api from "../services/api";
// import axios  from "axios";

/* =========================================================
   CONTEXT
========================================================= */

const LabelsContext =
  createContext(null);

/* =========================================================
   PROVIDER
========================================================= */

export function LabelsProvider({
  children,
}) {
  const [
    labels,
    setLabels,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState(null);

  /* =======================================================
     FETCH ALL LABELS
  ======================================================= */

  const fetchLabels =
    useCallback(
      async () => {
        try {
          setLoading(true);

          setError(null);

          const response =
            await api.get(
              "/labels"
            );

          const fetchedLabels =
            response.data?.labels ||
            [];

          setLabels(
            fetchedLabels
          );

          return fetchedLabels;
        } catch (err) {
          console.error(
            "Fetch labels error:",
            err
          );

          const message =
            err.response?.data
              ?.message ||
            "Failed to fetch labels.";

          setError(
            message
          );

          throw new Error(
            message
          );
        } finally {
          setLoading(false);
        }
      },
      []
    );

  /* =======================================================
     LOAD LABELS ON START
  ======================================================= */

  useEffect(() => {
    fetchLabels().catch(
      (err) => {
        console.error(
          "Initial labels load failed:",
          err.message
        );
      }
    );
  }, [
    fetchLabels,
  ]);

  /* =======================================================
     CREATE LABEL
  ======================================================= */

  const createLabel =
    useCallback(
      async (data) => {
        const name =
          data.name?.trim();

        if (!name) {
          throw new Error(
            "Label name is required."
          );
        }

        try {
          setError(null);

          const response =
            await api.post(
              "/labels",
              {
                name,

                description:
                  data.description?.trim() ||
                  "",

                color:
                  data.color ||
                  "pink",

                icon:
                  data.icon ||
                  "🏷️",
              }
            );

          const newLabel =
            response.data?.label;

          if (!newLabel) {
            throw new Error(
              "Label was not returned by server."
            );
          }

          setLabels(
            (previous) => [
              ...previous,
              newLabel,
            ]
          );

          return newLabel;
        } catch (err) {
          console.error(
            "Create label error:",
            err
          );

          const message =
            err.response?.data
              ?.message ||
            err.message ||
            "Failed to create label.";

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
     UPDATE LABEL
  ======================================================= */

  const updateLabel =
    useCallback(
      async (
        labelId,
        updates
      ) => {
        if (!labelId) {
          throw new Error(
            "Label ID is required."
          );
        }

        try {
          setError(null);

          const response =
            await api.patch(
              `/labels/${labelId}`,
              updates
            );

          const updatedLabel =
            response.data?.label;

          if (!updatedLabel) {
            throw new Error(
              "Updated label was not returned by server."
            );
          }

          setLabels(
            (previous) =>
              previous.map(
                (label) =>
                  String(
                    label._id
                  ) ===
                  String(
                    labelId
                  )
                    ? updatedLabel
                    : label
              )
          );

          return updatedLabel;
        } catch (err) {
          console.error(
            "Update label error:",
            err
          );

          const message =
            err.response?.data
              ?.message ||
            err.message ||
            "Failed to update label.";

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
     DELETE LABEL
  ======================================================= */

  const deleteLabel =
    useCallback(
      async (
        labelId
      ) => {
        if (!labelId) {
          throw new Error(
            "Label ID is required."
          );
        }

        try {
          setError(null);

          await api.delete(
            `/labels/${labelId}`
          );

          setLabels(
            (previous) =>
              previous.filter(
                (label) =>
                  String(
                    label._id
                  ) !==
                  String(
                    labelId
                  )
              )
          );

          return true;
        } catch (err) {
          console.error(
            "Delete label error:",
            err
          );

          const message =
            err.response?.data
              ?.message ||
            err.message ||
            "Failed to delete label.";

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
     GET SINGLE LABEL

     Local lookup.
  ======================================================= */

  const getLabel =
    useCallback(
      (
        labelId
      ) => {
        return labels.find(
          (label) =>
            String(
              label._id
            ) ===
            String(
              labelId
            )
        );
      },
      [
        labels,
      ]
    );

  /* =======================================================
     CHECK LABEL EXISTS

     Local check only.

     Backend remains the final authority.
  ======================================================= */

  const labelExists =
    useCallback(
      (
        name,
        excludeId = null
      ) => {
        if (
          !name?.trim()
        ) {
          return false;
        }

        return labels.some(
          (label) =>
            label.name
              ?.trim()
              .toLowerCase() ===
              name
                .trim()
                .toLowerCase() &&
            String(
              label._id
            ) !==
              String(
                excludeId
              )
        );
      },
      [
        labels,
      ]
    );

  /* =======================================================
     CONTEXT VALUE
  ======================================================= */

  const value = {
    /* DATA */

    labels,

    loading,

    error,

    /* FETCH */

    fetchLabels,

    /* CRUD */

    createLabel,

    updateLabel,

    deleteLabel,

    /* HELPERS */

    getLabel,

    labelExists,
  };

  return (
    <LabelsContext.Provider
      value={
        value
      }
    >
      {children}
    </LabelsContext.Provider>
  );
}

/* =========================================================
   HOOK
========================================================= */

export function useLabels() {
  const context =
    useContext(
      LabelsContext
    );

  if (!context) {
    throw new Error(
      "useLabels must be used inside LabelsProvider"
    );
  }

  return context;
}