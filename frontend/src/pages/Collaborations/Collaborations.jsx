import { useMemo, useState } from "react";

import { Plus } from "lucide-react";

import CollaborationStats from "../../components/collaborations/CollaborationStats";
import CollaborationFilters from "../../components/collaborations/CollaborationFilters";
import CollaborationList from "../../components/collaborations/CollaborationList";
import CollaborationForm from "../../components/collaborations/CollaborationForm";
import DeleteModal from "../../components/common/DeleteModal";
import ShareButton from "../../components/common/SharedButton";

import { useCollaboration } from "../../context/CollaborationsContext";

import "./Collaborations.css";

function Collaborations() {
  const {
    collaborations,
    loading,
    error,
    createCollaboration,
    updateCollaboration,
    deleteCollaboration,
  } = useCollaboration();

  /* FORM STATE */

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCollaboration, setEditingCollaboration] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  /* DELETE MODAL STATE */

  const [collaborationToDelete, setCollaborationToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  /* FILTER STATE */

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  /* FILTERED COLLABORATIONS */

  const filteredCollaborations = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return collaborations.filter((collaboration) => {
      const searchableText = [
        collaboration.brandName || "",
        collaboration.contactName || "",
        collaboration.title || "",
        collaboration.editor || "",
        collaboration.platform || "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !searchValue || searchableText.includes(searchValue);

      const matchesStatus =
        statusFilter === "all" || collaboration.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [collaborations, search, statusFilter]);

  /* CREATE FORM */

  function openCreateForm() {
    setEditingCollaboration(null);
    setIsFormOpen(true);
  }

  /* EDIT */

  function handleEdit(collaboration) {
    setEditingCollaboration(collaboration);
    setIsFormOpen(true);
  }

  /* CLOSE FORM */

  function closeForm() {
    if (isSaving) {
      return;
    }

    setEditingCollaboration(null);
    setIsFormOpen(false);
  }

  /* SAVE */

  async function handleSave(data) {
    try {
      setIsSaving(true);

      if (editingCollaboration) {
        const collaborationId =
          editingCollaboration._id || editingCollaboration.id;

        await updateCollaboration(collaborationId, data);
      } else {
        await createCollaboration(data);
      }

      setEditingCollaboration(null);
      setIsFormOpen(false);
    } catch (error) {
      window.alert(
        error?.response?.data?.message ||
          error.message ||
          "Failed to save collaboration",
      );
    } finally {
      setIsSaving(false);
    }
  }

  /* STATUS CHANGE */

  async function handleStatusChange(id, status) {
    try {
      await updateCollaboration(id, { status });
    } catch (error) {
      window.alert("Failed to update status");
    }
  }

  /* DELETE — open modal */

  function handleDelete(id) {
    const collaboration = collaborations.find(
      (item) => (item._id || item.id) === id,
    );

    setDeleteError(null);

    setCollaborationToDelete(collaboration || { _id: id, id });
  }

  /* DELETE — close modal */

  function closeDeleteModal() {
    if (isDeleting) {
      return;
    }

    setCollaborationToDelete(null);
    setDeleteError(null);
  }

  /* DELETE — confirm */

  async function confirmDelete() {
    if (!collaborationToDelete) {
      return;
    }

    const collaborationId =
      collaborationToDelete._id || collaborationToDelete.id;

    try {
      setIsDeleting(true);
      setDeleteError(null);

      await deleteCollaboration(collaborationId);

      setCollaborationToDelete(null);
    } catch (error) {
      setDeleteError(
        error?.response?.data?.message || "Failed to delete collaboration",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  /* RENDER */

  return (
    <div className="clb-collaborations-page">
      {/* HEADER */}

      <header className="clb-collaborations-page__header">
        <div className="clb-collaborations-page__intro">
          <span className="clb-collaborations-page__eyebrow">
            CONTENT PRODUCTION
          </span>

          <h1>Collaborations</h1>

          <p>
            Manage confirmed deals, content production, deadlines, and payments.
          </p>
        </div>

        <div className="clb-page-actions">
          <ShareButton type="collaboration" />

          <button
            type="button"
            className="clb-btn clb-btn--primary"
            onClick={openCreateForm}
          >
            <Plus size={18} />
            Create Collaboration
          </button>
        </div>
      </header>

      {/* LOADING */}

      {loading && (
        <div className="clb-collaborations-page__loading">
          Loading collaborations...
        </div>
      )}

      {/* ERROR */}

      {!loading && error && (
        <div className="clb-collaborations-page__error">{error}</div>
      )}

      {/* CONTENT */}

      {!loading && (
        <>
          <CollaborationStats collaborations={collaborations} />

          <CollaborationFilters
            search={search}
            onSearchChange={setSearch}
            status={statusFilter}
            onStatusChange={setStatusFilter}
          />

          <CollaborationList
            collaborations={filteredCollaborations}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
          />
        </>
      )}

      {/* FORM */}

      <CollaborationForm
        isOpen={isFormOpen}
        onClose={closeForm}
        onSave={handleSave}
        initialValues={editingCollaboration || {}}
        isEditMode={Boolean(editingCollaboration)}
        isSaving={isSaving}
      />

      {/* DELETE MODAL */}

      <DeleteModal
        isOpen={Boolean(collaborationToDelete)}
        tracker={collaborationToDelete}
        title="Delete Collaboration?"
        isDeleting={isDeleting}
        error={deleteError}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

export default Collaborations;
