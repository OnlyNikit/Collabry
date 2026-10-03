import { useEffect, useRef, useState } from "react";
import {
  Link2,
  Copy,
  Check,
  Link2Off,
  RefreshCw,
  Globe,
} from "lucide-react";

import api from "../../services/api"; // apna axios instance (path adjust karo)

import "./SharedButton.css";

function ShareButton({ type }) {
  const wrapRef = useRef(null);

  const [token, setToken] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");

  const shareUrl = token ? `${window.location.origin}/shared/${token}` : "";

  /* current status */

  useEffect(() => {
    let active = true;

    api
      .get(`/share/${type}`)
      .then((res) => {
        if (active) {
          setToken(res.data.data.token || null);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [type]);

  /* outside click + Escape */

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  /* actions */

  async function handleCreate() {
    try {
      setIsBusy(true);
      setError("");

      const res = await api.post(`/share/${type}`);

      setToken(res.data.data.token);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create link");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      window.prompt("Copy this link:", shareUrl);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleReset() {
    const confirmed = window.confirm(
      "Create a new link? The old link will stop working.",
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsBusy(true);
      setError("");

      const res = await api.patch(`/share/${type}/regenerate`);

      setToken(res.data.data.token);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to reset link");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleStop() {
    const confirmed = window.confirm(
      "Stop sharing? The existing link will stop working.",
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsBusy(true);
      setError("");

      await api.delete(`/share/${type}`);

      setToken(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to stop sharing");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="clb-share" ref={wrapRef}>
      {/* TRIGGER */}

      <button
        type="button"
        className={`clb-share__trigger ${
          token ? "clb-share__trigger--on" : ""
        }`}
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label="Share"
      >
        <Link2 size={16} />

        <span className="clb-share__label">Share</span>

        {token && <span className="clb-share__dot" aria-hidden="true" />}
      </button>

      {isOpen && (
        <>
          {/* mobile par dim overlay (desktop par hidden) */}
          <div
            className="clb-share__backdrop"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div className="clb-share__popover" role="dialog" aria-label="Share">
            <div className="clb-share__head">
              <span className="clb-share__head-icon">
                <Globe size={18} />
              </span>

              <div>
                <h4>Share live view</h4>

                <p>
                  Anyone with the link can view a read-only table that updates
                  automatically.
                </p>
              </div>
            </div>

            {!token ? (
              <button
                type="button"
                className="clb-share__cta"
                onClick={handleCreate}
                disabled={isBusy}
              >
                {isBusy ? "Creating..." : "Create share link"}
              </button>
            ) : (
              <>
                <div className="clb-share__field">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    onFocus={(event) => event.target.select()}
                    aria-label="Share link"
                  />

                  <button
                    type="button"
                    className={`clb-share__copy ${
                      copied ? "clb-share__copy--done" : ""
                    }`}
                    onClick={handleCopy}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}

                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>

                <div className="clb-share__links">
                  <button type="button" onClick={handleReset} disabled={isBusy}>
                    <RefreshCw size={14} />
                    Reset link
                  </button>

                  <button
                    type="button"
                    className="clb-share__links-danger"
                    onClick={handleStop}
                    disabled={isBusy}
                  >
                    <Link2Off size={14} />
                    Stop sharing
                  </button>
                </div>
              </>
            )}

            {error && <p className="clb-share__error">{error}</p>}
          </div>
        </>
      )}
    </div>
  );
}

export default ShareButton;