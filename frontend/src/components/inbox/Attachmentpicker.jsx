import { useRef } from "react";

import "./Attachmentpicker.css";

/* Backend limits ke saath match rakho (uploadMiddleware.js) */
const MAX_FILES = 10;
const MAX_FILE_BYTES = 20 * 1024 * 1024; // per file
const MAX_TOTAL_BYTES = 20 * 1024 * 1024; // total (Gmail limit 25MB, base64 overhead ke liye 20MB safe)

const formatSize = (bytes = 0) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getIcon = (file) => {
  const type = file.type || "";
  const name = (file.name || "").toLowerCase();

  if (type.startsWith("image/")) return "🖼️";
  if (type.startsWith("video/")) return "🎬";
  if (type.startsWith("audio/")) return "🎵";
  if (type === "application/pdf" || name.endsWith(".pdf")) return "📄";
  if (/\.(xls|xlsx|csv)$/.test(name)) return "📊";
  if (/\.(doc|docx|txt)$/.test(name)) return "📝";
  if (/\.(zip|rar|7z)$/.test(name)) return "🗜️";

  return "📎";
};

const isSameFile = (a, b) =>
  a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

/**
 * Props:
 * - files: File[]
 * - onChange: (files: File[]) => void
 * - onError: (message: string) => void   (optional)
 * - disabled: boolean
 */
function AttachmentPicker({
  files = [],
  onChange,
  onError,
  disabled = false,
}) {
  const inputRef = useRef(null);

  function handlePick(event) {
    const picked = Array.from(event.target.files || []);

    // same file dobara select ho sake
    event.target.value = "";

    if (!picked.length) return;

    const merged = [...files];
    const rejected = [];

    for (const file of picked) {
      if (merged.some((item) => isSameFile(item, file))) {
        continue;
      }

      if (file.size > MAX_FILE_BYTES) {
        rejected.push(`${file.name} (20 MB se bada hai)`);
        continue;
      }

      merged.push(file);
    }

    if (merged.length > MAX_FILES) {
      onError?.(`Aap maximum ${MAX_FILES} files attach kar sakte ho.`);
      return;
    }

    const total = merged.reduce((sum, file) => sum + file.size, 0);

    if (total > MAX_TOTAL_BYTES) {
      onError?.("Total attachments 20 MB se zyada nahi ho sakte.");
      return;
    }

    if (rejected.length) {
      onError?.(`Ye files add nahi hui: ${rejected.join(", ")}`);
    }

    onChange?.(merged);
  }

  function removeAt(index) {
    onChange?.(files.filter((_, itemIndex) => itemIndex !== index));
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  return (
    <div className="clb-attach-picker">
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
        onChange={handlePick}
        disabled={disabled}
      />

      <div className="clb-attach-picker__bar">
        <button
          type="button"
          className="clb-attach-picker__btn"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || files.length >= MAX_FILES}
        >
          <span aria-hidden="true">📎</span> Attach files
        </button>

        {files.length > 0 && (
          <span className="clb-attach-picker__summary">
            {files.length} file{files.length > 1 ? "s" : ""} ·{" "}
            {formatSize(totalSize)}
          </span>
        )}
      </div>

      {files.length > 0 && (
        <ul className="clb-attach-picker__list">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${file.lastModified}`}
              className="clb-attach-picker__item"
            >
              <span className="clb-attach-picker__icon" aria-hidden="true">
                {getIcon(file)}
              </span>

              <span className="clb-attach-picker__name" title={file.name}>
                {file.name}
              </span>

              <span className="clb-attach-picker__size">
                {formatSize(file.size)}
              </span>

              <button
                type="button"
                className="clb-attach-picker__remove"
                onClick={() => removeAt(index)}
                disabled={disabled}
                aria-label={`Remove ${file.name}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AttachmentPicker;