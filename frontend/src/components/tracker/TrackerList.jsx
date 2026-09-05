import { useState } from "react";

import TrackerCard from "./TrackerCard";
import DeleteTrackerModal from "../common/DeleteModal";

import "./TrackerList.css";

function TrackerList({
  trackers,
  onEdit,
  onDelete,
  onStatusChange,
}) {
  const [trackerToDelete, setTrackerToDelete] = useState(null);

  function handleDeleteClick(tracker) {
    setTrackerToDelete(tracker);
  }

  function handleCloseDeleteModal() {
    setTrackerToDelete(null);
  }

  function handleConfirmDelete() {
    if (!trackerToDelete) {
      return;
    }

    onDelete(trackerToDelete);

    setTrackerToDelete(null);
  }

  if (!trackers.length) {
    return (
      <div className="clb-tracker-list__empty">
        <span>📭</span>

        <h3>No trackers found</h3>

        <p>
          Try changing your filters or create a new tracker.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="clb-tracker-list">
        {trackers.map((tracker) => (
          <TrackerCard
            key={tracker.id}
            tracker={tracker}
            onEdit={onEdit}
            onDelete={handleDeleteClick}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>

      <DeleteTrackerModal
        isOpen={Boolean(trackerToDelete)}
        tracker={trackerToDelete}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}

export default TrackerList;