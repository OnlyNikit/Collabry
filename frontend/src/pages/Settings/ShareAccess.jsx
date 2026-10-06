import { useCallback, useEffect, useState } from "react";

import api from "../../services/api";
import { useMailbox } from "../../context/MailboxContext";

import "./ShareAccess.css";

const PRESETS = {
  viewer: "Viewer (read only)",
  assistant: "Assistant (read, reply, label)",
  full: "Full (also send, archive, trash)",
};

const PRESET_NAMES = {
  viewer: "Viewer",
  assistant: "Assistant",
  full: "Full access",
  custom: "Custom",
};

const errMsg = (err) => err.response?.data?.message || "Something went wrong";

function initialOf(text) {
  return (text || "?").trim().charAt(0).toUpperCase();
}

function ShareAccess() {
  const { refreshShared } = useMailbox();

  const [given, setGiven] = useState([]);
  const [received, setReceived] = useState([]);

  const [email, setEmail] = useState("");
  const [preset, setPreset] = useState("viewer");
  const [expiresAt, setExpiresAt] = useState("");

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState({ id: null, items: [] });

  const load = useCallback(async () => {
    try {
      const [g, r] = await Promise.all([
        api.get("/delegations/given"),
        api.get("/delegations/received"),
      ]);

      setGiven(g.data);
      setReceived(r.data);
    } catch (err) {
      setError(errMsg(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Run an action, then refresh this tab and the header's accounts list
  async function run(action) {
    setError("");
    setBusy(true);

    try {
      await action();
      await load();
      await refreshShared();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  function handleInvite(event) {
    event.preventDefault();

    run(async () => {
      await api.post("/delegations", {
        email,
        preset,
        expiresAt: expiresAt || undefined,
      });

      setEmail("");
      setExpiresAt("");
    });
  }

  function handleRevoke(delegation) {
    const who = delegation.delegate?.name || delegation.inviteEmail;

    if (!window.confirm(`Remove ${who}'s access to your inbox?`)) return;

    run(() => api.delete(`/delegations/${delegation._id}`));
  }

  function handleLeave(delegation) {
    if (
      !window.confirm(
        `Leave ${delegation.owner.name}'s inbox? You will lose access.`,
      )
    )
      return;

    run(() => api.delete(`/delegations/${delegation._id}`));
  }

  async function toggleLogs(id) {
    if (logs.id === id) {
      setLogs({ id: null, items: [] });
      return;
    }

    try {
      const { data } = await api.get(`/delegations/${id}/logs`);
      setLogs({ id, items: data });
    } catch (err) {
      setError(errMsg(err));
    }
  }

  const pendingInvites = received.filter((d) => d.status === "pending");
  const activeShared = received.filter((d) => d.status === "active");

  return (
    <div className="clb-access">
      {/* HEADER */}

      <div className="clb-access__head">
        <h2>Share access</h2>

        <p className="clb-access__lead">
          Let someone manage your inbox from their own Collabry account. Their
          replies go out from your Gmail address, and the receiver will not see
          their name. You can revoke access at any time.
        </p>
      </div>

      {error && (
        <p className="clb-access__alert" role="alert">
          <span>{error}</span>

          <button
            type="button"
            className="clb-access__alert-close"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </p>
      )}

      {/* INVITE */}

      <section className="clb-access__section">
        <h3 className="clb-access__section-title">Invite someone</h3>

        <div className="clb-access__panel">
          <form className="clb-access__form" onSubmit={handleInvite}>
            <div className="clb-access__field clb-access__field--full">
              <label htmlFor="share-email">Email address</label>

              <input
                id="share-email"
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="clb-access__field">
              <label htmlFor="share-preset">Access level</label>

              <select
                id="share-preset"
                value={preset}
                onChange={(e) => setPreset(e.target.value)}
              >
                {Object.entries(PRESETS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="clb-access__field">
              <label htmlFor="share-expiry">Expires on (optional)</label>

              <input
                id="share-expiry"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>

            <div className="clb-access__form-foot">
              <p className="clb-access__note">
                They need a Collabry account with this email to accept the
                invite.
              </p>

              <button
                type="submit"
                className="clb-btn clb-btn--primary"
                disabled={busy}
              >
                {busy ? "Sending..." : "Send invite"}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* PEOPLE WITH ACCESS */}

      <section className="clb-access__section">
        <h3 className="clb-access__section-title">
          People with access to my inbox
          <span className="clb-access__count">{given.length}</span>
        </h3>

        {given.length === 0 ? (
          <p className="clb-access__empty">
            You haven&rsquo;t shared your inbox with anyone yet.
          </p>
        ) : (
          <ul className="clb-access__list">
            {given.map((d) => {
              const name = d.delegate?.name || d.inviteEmail;

              return (
                <li key={d._id} className="clb-access__row">
                  <div className="clb-access__row-top">
                    <span className="clb-access__avatar" aria-hidden="true">
                      {initialOf(name)}
                    </span>

                    <div className="clb-access__who">
                      <strong>{name}</strong>
                      <span>{d.inviteEmail}</span>
                    </div>

                    <div className="clb-access__badges">
                      <span
                        className={`clb-access__badge clb-access__badge--${d.status}`}
                      >
                        {d.status}
                      </span>

                      <span className="clb-access__badge clb-access__badge--preset">
                        {PRESET_NAMES[d.preset] || d.preset}
                      </span>
                    </div>
                  </div>

                  <div className="clb-access__controls">
                    <select
                      aria-label={`Access level for ${name}`}
                      value={d.preset === "custom" ? "" : d.preset}
                      disabled={busy}
                      onChange={(e) =>
                        run(() =>
                          api.patch(`/delegations/${d._id}/permissions`, {
                            preset: e.target.value,
                          }),
                        )
                      }
                    >
                      {d.preset === "custom" && (
                        <option value="" disabled>
                          Custom
                        </option>
                      )}

                      {Object.entries(PRESETS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      className="clb-btn clb-btn--ghost clb-access__btn-sm"
                      onClick={() => toggleLogs(d._id)}
                    >
                      {logs.id === d._id ? "Hide activity" : "Activity log"}
                    </button>

                    <button
                      type="button"
                      className="clb-btn clb-btn--ghost clb-access__btn-sm clb-access__btn-danger"
                      disabled={busy}
                      onClick={() => handleRevoke(d)}
                    >
                      Revoke
                    </button>
                  </div>

                  {logs.id === d._id && (
                    <ul className="clb-access__logs">
                      {logs.items.length === 0 && (
                        <li className="clb-access__logs-empty">
                          No activity yet.
                        </li>
                      )}

                      {logs.items.map((log) => (
                        <li key={log._id}>
                          <span className="clb-access__log-time">
                            {new Date(log.createdAt).toLocaleString()}
                          </span>

                          <span className="clb-access__log-action">
                            {log.action}
                          </span>

                          <span className="clb-access__log-path">
                            {log.method} {log.path}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* INVITES I RECEIVED */}

      <section className="clb-access__section">
        <h3 className="clb-access__section-title">
          Invites for me
          <span className="clb-access__count">{pendingInvites.length}</span>
        </h3>

        {pendingInvites.length === 0 ? (
          <p className="clb-access__empty">No pending invites.</p>
        ) : (
          <ul className="clb-access__list">
            {pendingInvites.map((d) => (
              <li key={d._id} className="clb-access__row">
                <div className="clb-access__row-top">
                  <span className="clb-access__avatar" aria-hidden="true">
                    {initialOf(d.owner.name)}
                  </span>

                  <div className="clb-access__invite-text">
                    <strong>{d.owner.name}</strong>{" "}
                    <span>({d.owner.email}) invited you with</span>{" "}
                    <span className="clb-access__badge clb-access__badge--preset">
                      {PRESET_NAMES[d.preset] || d.preset}
                    </span>{" "}
                    <span>access.</span>
                  </div>

                  <div className="clb-access__invite-actions">
                    <button
                      type="button"
                      className="clb-btn clb-btn--primary clb-access__btn-sm"
                      disabled={busy}
                      onClick={() =>
                        run(() => api.patch(`/delegations/${d._id}/accept`))
                      }
                    >
                      Accept
                    </button>

                    <button
                      type="button"
                      className="clb-btn clb-btn--ghost clb-access__btn-sm"
                      disabled={busy}
                      onClick={() =>
                        run(() => api.patch(`/delegations/${d._id}/decline`))
                      }
                    >
                      Decline
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* INBOXES SHARED WITH ME */}

      {activeShared.length > 0 && (
        <section className="clb-access__section">
          <h3 className="clb-access__section-title">
            Inboxes shared with me
            <span className="clb-access__count">{activeShared.length}</span>
          </h3>

          <ul className="clb-access__list">
            {activeShared.map((d) => (
              <li key={d._id} className="clb-access__row">
                <div className="clb-access__row-top">
                  <span className="clb-access__avatar" aria-hidden="true">
                    {initialOf(d.owner.name)}
                  </span>

                  <div className="clb-access__who">
                    <strong>{d.owner.name}</strong>
                    <span>{d.owner.email}</span>
                  </div>

                  <div className="clb-access__badges">
                    <span className="clb-access__badge clb-access__badge--preset">
                      {PRESET_NAMES[d.preset] || d.preset}
                    </span>

                    <button
                      type="button"
                      className="clb-btn clb-btn--ghost clb-access__btn-sm clb-access__btn-danger"
                      disabled={busy}
                      onClick={() => handleLeave(d)}
                    >
                      Leave
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <p className="clb-access__hint">
            To open a shared inbox, click your profile in the top right and pick
            it from Accounts.
          </p>
        </section>
      )}
    </div>
  );
}

export default ShareAccess;