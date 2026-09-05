
import { useMemo, useState } from "react";

import { useTracker } from "../../context/TrackerContext";

import TrackerStats from "../../components/tracker/TrackerStats";
import TrackerFilters from "../../components/tracker/TrackerFilter";
import TrackerList from "../../components/tracker/TrackerList";
import TrackerForm from "../../components/tracker/TrackerForm";

import "./Tracker.css";

function Tracker() {
  const {
    trackers,
    addTracker,
    updateTracker,
    deleteTracker,
  } = useTracker();

  const [isFormOpen, setFormOpen] = useState(false);

  const [editingTracker, setEditingTracker] = useState(null);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");

  const [priorityFilter, setPriorityFilter] = useState("all");

  /* FILTERED TRACKERS */

  const filteredTrackers = useMemo(() => {
    return trackers.filter((tracker) => {
      const searchableText = [
        tracker.brandName || "",
        tracker.contactName || "",
        tracker.email || "",
        tracker.collaborationTitle || "",
        tracker.notes || "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchableText.includes(
        search.trim().toLowerCase(),
      );

      const matchesStatus =
        statusFilter === "all" ||
        tracker.status === statusFilter;

      const matchesPriority =
        priorityFilter === "all" ||
        tracker.priority === priorityFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority
      );
    });
  }, [
    trackers,
    search,
    statusFilter,
    priorityFilter,
  ]);

  /* ==========================================
     CREATE
  ========================================== */

  function handleCreate() {
    setEditingTracker(null);

    setFormOpen(true);
  }

  /* ==========================================
     EDIT
  ========================================== */

  function handleEdit(tracker) {
    setEditingTracker(tracker);

    setFormOpen(true);
  }

  /* ==========================================
     CLOSE FORM
  ========================================== */

  function handleCloseForm() {
    setFormOpen(false);

    setEditingTracker(null);
  }

  /* ==========================================
     SAVE
  ========================================== */

  async function handleSave(data) {
    try {
      if (editingTracker) {
        await updateTracker(
          editingTracker.id,
          data,
        );
      } else {
        await addTracker(data);
      }

      setFormOpen(false);

      setEditingTracker(null);
    } catch (error) {
      console.error(
        "Failed to save tracker:",
        error,
      );
    }
  }

  /* ==========================================
     STATUS CHANGE
  ========================================== */

  async function handleStatusChange(
    id,
    status,
  ) {
    try {
      await updateTracker(id, {
        status,
      });
    } catch (error) {
      console.error(
        "Failed to update tracker status:",
        error,
      );
    }
  }

  /* ==========================================
     DELETE

     Confirmation is handled by
     DeleteTrackerModal inside TrackerList.

     NO window.confirm() here.
  ========================================== */

  async function handleDelete(tracker) {
    if (!tracker?.id) {
      return;
    }

    try {
      await deleteTracker(tracker.id);
    } catch (error) {
      console.error(
        "Failed to delete tracker:",
        error,
      );

      throw error;
    }
  }

  return (
    <div className="clb-tracker-page">

      {/* ======================================
          HEADER
      ====================================== */}

      <header className="clb-tracker-page__header">
        <div>
          <span className="clb-tracker-page__eyebrow">
            COLLABORATION CRM
          </span>

          <h1>
            Tracker
          </h1>

          <p>
            Track collaborations,
            conversations, payments,
            and follow-ups.
          </p>
        </div>

        <button
          type="button"
          className="clb-btn clb-btn--primary"
          onClick={handleCreate}
        >
          + Create Tracker
        </button>
      </header>


      {/* ======================================
          STATS
      ====================================== */}

      <TrackerStats
        trackers={trackers}
      />


      {/* ======================================
          FILTERS
      ====================================== */}

      <TrackerFilters
        search={search}
        onSearchChange={setSearch}
        status={statusFilter}
        onStatusChange={setStatusFilter}
        priority={priorityFilter}
        onPriorityChange={setPriorityFilter}
      />


      {/* ======================================
          TRACKER LIST

          Delete modal is managed inside
          TrackerList.
      ====================================== */}

      <TrackerList
        trackers={filteredTrackers}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
      />


      {/* ======================================
          CREATE / EDIT FORM
      ====================================== */}

      <TrackerForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSave={handleSave}
        initialValues={
          editingTracker || {}
        }
        isEditMode={
          Boolean(editingTracker)
        }
      />

    </div>
  );
}

export default Tracker;

