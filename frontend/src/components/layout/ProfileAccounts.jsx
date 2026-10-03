import { Check } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { useMailbox } from "../../context/MailboxContext";

import "./ProfileAccount.css";

const PRESET_LABELS = {
  viewer: "Viewer",
  assistant: "Assistant",
  full: "Full access",
  custom: "Custom",
};

function Avatar({ name }) {
  return (
    <span className="clb-accounts__avatar">
      {(name || "?").charAt(0).toUpperCase()}
    </span>
  );
}

function ProfileAccounts({ onDone }) {
  const { user } = useAuth();
  const { acting, sharedMailboxes, switchTo } = useMailbox();

  function openOwnInbox() {
    if (!acting) return onDone?.();
    switchTo(null);
  }

  function openSharedInbox(delegation) {
    if (acting?.ownerId === delegation.owner._id) return onDone?.();

    switchTo({
      ownerId: delegation.owner._id,
      ownerName: delegation.owner.name,
      permissions: delegation.permissions,
    });
  }

  return (
    <div className="clb-accounts">
      <span className="clb-accounts__title">Accounts</span>

      {/* Own mailbox */}
      <button
        type="button"
        className="clb-accounts__item"
        onClick={openOwnInbox}
      >
        <Avatar name={user?.name} />

        <span className="clb-accounts__text">
          <strong>{user?.name || "My inbox"}</strong>
          <small>{user?.email || "My inbox"}</small>
        </span>

        {!acting && <Check size={16} />}
      </button>

      {/* Mailboxes shared with me */}
      {sharedMailboxes.map((delegation) => (
        <button
          key={delegation._id}
          type="button"
          className="clb-accounts__item"
          onClick={() => openSharedInbox(delegation)}
        >
          <Avatar name={delegation.owner.name} />

          <span className="clb-accounts__text">
            <strong>{delegation.owner.name}</strong>
            <small>
              {delegation.owner.email} ·{" "}
              {PRESET_LABELS[delegation.preset] || "Shared"}
            </small>
          </span>

          {acting?.ownerId === delegation.owner._id && <Check size={16} />}
        </button>
      ))}

      {sharedMailboxes.length === 0 && (
        <p className="clb-accounts__hint">
          No shared inboxes yet. Ask someone to invite you, or share yours from
          Settings.
        </p>
      )}
    </div>
  );
}

export default ProfileAccounts;