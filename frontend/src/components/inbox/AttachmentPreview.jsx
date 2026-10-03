import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";

import "./AttachmentPreview.css";

const API_URL = import.meta.env.VITE_API_URL;

/* Itni chhoti images ka thumbnail apne aap load hoga */
const THUMBNAIL_MAX_BYTES = 2 * 1024 * 1024;

const ICONS = {
  pdf: "📄",
  image: "🖼️",
  video: "🎬",
  audio: "🎵",
  doc: "📝",
  sheet: "📊",
  archive: "🗜️",
  default: "📎",
};

/* Sirf ye types in-page preview mein khulenge, baaki sirf download */
const PREVIEWABLE_KINDS = ["image", "pdf", "video", "audio"];

/* ========================================
   HELPERS
======================================== */

function formatSize(size) {
  if (typeof size === "string") return size;

  const bytes = Number(size) || 0;

  if (bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getKind(mimeType = "", name = "") {
  const mime = String(mimeType).toLowerCase();
  const fileName = String(name).toLowerCase();

  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "application/pdf" || fileName.endsWith(".pdf")) return "pdf";
  if (/\.(xls|xlsx|csv)$/.test(fileName)) return "sheet";
  if (/\.(doc|docx|txt|rtf)$/.test(fileName)) return "doc";
  if (/\.(zip|rar|7z|tar|gz)$/.test(fileName)) return "archive";

  return "default";
}

/* Backend ke fields (filename, mimeType, attachmentId) aur
   purane mock fields (name, type, id) dono chalenge */
function normalizeAttachment(file = {}, index = 0) {
  const name = file.filename || file.name || "attachment";
  const mimeType = file.mimeType || file.type || "";

  return {
    key: file.attachmentId || file.id || `${name}-${index}`,
    attachmentId: file.attachmentId || "",
    name,
    mimeType,
    rawSize: Number(file.size) || 0,
    sizeLabel: formatSize(file.size),
    kind: getKind(mimeType, name),
  };
}

async function fetchAttachmentBlob(messageId, attachmentId) {
  const response = await fetch(
    `${API_URL}/api/emails/${encodeURIComponent(
      messageId,
    )}/attachments/${encodeURIComponent(attachmentId)}`,
    { credentials: "include" },
  );

  if (!response.ok) {
    let message = `Failed to load attachment (${response.status})`;

    try {
      const data = await response.json();
      message = data?.message || message;
    } catch {
      /* JSON nahi tha */
    }

    throw new Error(message);
  }

  return response.blob();
}

function triggerDownload(url, fileName) {
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();
  link.remove();
}

/* ========================================
   PREVIEW MODAL
======================================== */

function PreviewModal({ file, url, onClose, onDownload }) {
  useEffect(() => {
    function handleKey(event) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKey);

    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return createPortal(
    <div className="clb-attachment-modal" onClick={onClose} role="dialog">
      <div
        className="clb-attachment-modal__panel"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="clb-attachment-modal__header">
          <span className="clb-attachment-modal__title" title={file.name}>
            {file.name}
          </span>

          <div className="clb-attachment-modal__actions">
            <button
              type="button"
              className="clb-attachment-modal__btn"
              onClick={onDownload}
            >
              ⬇ Download
            </button>

            <button
              type="button"
              className="clb-attachment-modal__btn"
              onClick={onClose}
              aria-label="Close preview"
            >
              ✕
            </button>
          </div>
        </header>

        <div className="clb-attachment-modal__body">
          {file.kind === "image" && <img src={url} alt={file.name} />}

          {file.kind === "pdf" && (
            <iframe src={url} title={file.name} className="clb-attachment-modal__frame" />
          )}

          {file.kind === "video" && <video src={url} controls autoPlay />}

          {file.kind === "audio" && <audio src={url} controls autoPlay />}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ========================================
   SINGLE ATTACHMENT CHIP
======================================== */

function AttachmentChip({ messageId, file }) {
  const [blobUrl, setBlobUrl] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const blobUrlRef = useRef("");

  const canFetch = Boolean(messageId && file.attachmentId);
  const canPreview = PREVIEWABLE_KINDS.includes(file.kind);

  /* Ek baar fetch karke blob URL cache kar lete hain */
  async function ensureBlobUrl() {
    if (blobUrlRef.current) return blobUrlRef.current;

    const blob = await fetchAttachmentBlob(messageId, file.attachmentId);

    const url = URL.createObjectURL(blob);

    blobUrlRef.current = url;
    setBlobUrl(url);

    return url;
  }

  /* Chhoti images ka thumbnail */
  useEffect(() => {
    let cancelled = false;

    if (
      file.kind !== "image" ||
      !canFetch ||
      (file.rawSize && file.rawSize > THUMBNAIL_MAX_BYTES)
    ) {
      return undefined;
    }

    ensureBlobUrl().catch((error) => {
      if (!cancelled) {
        console.error("Thumbnail load failed:", error);
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageId, file.attachmentId]);

  /* Unmount par memory free */
  useEffect(
    () => () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = "";
      }
    },
    [],
  );

  function reportMissingIds() {
    console.error("Attachment cannot be fetched, missing ids:", {
      messageId,
      attachmentId: file.attachmentId,
      file,
    });

    toast.error(
      !messageId
        ? "messageId EmailPreview se pass nahi hua."
        : "Is attachment ki attachmentId missing hai.",
    );
  }

  async function handleDownload() {
    if (isBusy) return;

    if (!canFetch) {
      reportMissingIds();
      return;
    }

    try {
      setIsBusy(true);

      const url = await ensureBlobUrl();

      triggerDownload(url, file.name);
    } catch (error) {
      console.error("Attachment download failed:", error);

      toast.error(error.message || "Failed to download attachment.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleOpen() {
    if (isBusy) return;

    if (!canFetch) {
      reportMissingIds();
      return;
    }

    if (!canPreview) {
      handleDownload();
      return;
    }

    try {
      setIsBusy(true);

      await ensureBlobUrl();

      setIsPreviewOpen(true);
    } catch (error) {
      console.error("Attachment preview failed:", error);

      toast.error(error.message || "Failed to open attachment.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <>
      <div className="clb-attachment-chip">
        <button
          type="button"
          className="clb-attachment-chip__main"
          onClick={handleOpen}
          disabled={isBusy}
          title={canPreview ? "Click to preview" : "Click to download"}
        >
          {file.kind === "image" && blobUrl ? (
            <img
              className="clb-attachment-chip__thumb"
              src={blobUrl}
              alt=""
            />
          ) : (
            <span className="clb-attachment-chip__icon" aria-hidden="true">
              {ICONS[file.kind] || ICONS.default}
            </span>
          )}

          <span className="clb-attachment-chip__body">
            <span className="clb-attachment-chip__name">{file.name}</span>

            <span className="clb-attachment-chip__size">
              {isBusy ? "Loading..." : file.sizeLabel}
            </span>
          </span>
        </button>

        <button
          type="button"
          className="clb-attachment-chip__download"
          onClick={handleDownload}
          disabled={isBusy}
          aria-label={`Download ${file.name}`}
          title="Download"
        >
          ⬇
        </button>
      </div>

      {isPreviewOpen && blobUrl && (
        <PreviewModal
          file={file}
          url={blobUrl}
          onClose={() => setIsPreviewOpen(false)}
          onDownload={handleDownload}
        />
      )}
    </>
  );
}

/* ========================================
   ATTACHMENT PREVIEW

   Props:
   - attachments: [{ filename, mimeType, size, attachmentId }]
   - messageId: jis email ke attachments hain uski Gmail message id
======================================== */

function AttachmentPreview({ attachments, messageId }) {
  if (!attachments?.length) return null;

  const files = attachments.map(normalizeAttachment);

  return (
    <div className="clb-attachments">
      <p className="clb-attachments__label">
        {files.length} attachment{files.length > 1 ? "s" : ""}
      </p>

      <div className="clb-attachments__list">
        {files.map((file) => (
          <AttachmentChip key={file.key} messageId={messageId} file={file} />
        ))}
      </div>
    </div>
  );
}

export default AttachmentPreview;