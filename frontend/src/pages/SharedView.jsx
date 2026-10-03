import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";

import "./SharedView.css";

const COLUMNS = {
  tracker: [
    ["brandName", "Brand"],
    ["collaborationTitle", "Title"],
    ["status", "Status"],
    ["priority", "Priority"],
    ["followUpDate", "Follow-up"],
    ["deadline", "Deadline"],
    ["proposedAmount", "Amount"],
    ["paymentStatus", "Payment"],
    ["notes", "Notes"],
  ],
  collaboration: [
    ["brandName", "Brand"],
    ["title", "Title"],
    ["status", "Status"],
    ["editor", "Editor"],
    ["platform", "Platform"],
    ["priority", "Priority"],
    ["deadline", "Deadline"],
    ["amount", "Amount"],
    ["paymentStatus", "Payment"],
  ],
};

const PAGE_TITLES = {
  tracker: "Brand Trackers",
  collaboration: "Collaborations",
};

const DATE_FIELDS = ["followUpDate", "deadline"];
const AMOUNT_FIELDS = ["amount", "proposedAmount"];

const CURRENCY_SYMBOLS = {
  INR: "₹",
  USD: "$",
  EUR: "€",
};

function prettify(value) {
  return String(value)
    .replaceAll("_", " ")
    .replace(/^\w/, (char) => char.toUpperCase());
}

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function renderCell(key, value, item) {
  const isEmpty = value === null || value === undefined || value === "";

  if (AMOUNT_FIELDS.includes(key)) {
    const symbol = CURRENCY_SYMBOLS[item.currency] || "₹";

    return (
      <strong className="clb-shared__amount">
        {symbol}
        {Number(value || 0).toLocaleString("en-IN")}
      </strong>
    );
  }

  if (isEmpty) {
    return <span className="clb-shared__empty-cell">—</span>;
  }

  if (DATE_FIELDS.includes(key)) {
    return formatDate(value);
  }

  if (key === "status") {
    return (
      <span className="clb-shared__badge clb-shared__badge--status">
        {prettify(value)}
      </span>
    );
  }

  if (key === "priority") {
    return (
      <span
        className={`clb-shared__badge clb-shared__badge--priority-${value}`}
      >
        {prettify(value)}
      </span>
    );
  }

  if (key === "paymentStatus") {
    return (
      <span className={`clb-shared__badge clb-shared__badge--payment-${value}`}>
        {prettify(value)}
      </span>
    );
  }

  if (key === "brandName") {
    return <strong className="clb-shared__brand">{value}</strong>;
  }

  if (key === "notes") {
    return <span className="clb-shared__notes">{value}</span>;
  }

  return String(value);
}

function SharedView() {
  const { token } = useParams();

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const RAW_API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

  const API_BASE = RAW_API_URL.replace(/\/+$/, "").endsWith("/api")
    ? RAW_API_URL.replace(/\/+$/, "")
    : `${RAW_API_URL.replace(/\/+$/, "")}/api`;

  const loadData = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/shared/${token}`);
      setData(res.data.data);
      setError("");
      setLastUpdated(new Date());
    } catch (err) {
      setData(null);
      setError(
        err.response?.data?.message || "Unable to load this shared page",
      );
    }
  }, [token]);

  useEffect(() => {
    const socket = io(`${import.meta.env.VITE_SOCKET_URL}/shared`);

    socket.on("connect", () => {
      socket.emit("join", token, (response) => {
        if (!response?.ok) {
          setData(null);
          setError("This link is invalid or has been disabled");
          return;
        }

        setIsLive(true);
        loadData();
      });
    });

    socket.on("disconnect", () => setIsLive(false));

    socket.on("share:refresh", loadData);

    socket.on("share:revoked", () => {
      setData(null);
      setIsLive(false);
      setError("This link is no longer active");
    });

    // socket na chale to bhi pehli baar data aa jaye
    loadData();

    return () => {
      socket.disconnect();
    };
  }, [token, loadData]);

  /* ERROR */

  if (error) {
    return (
      <div className="clb-shared">
        <div className="clb-shared__state">
          <span className="clb-shared__state-icon">🔒</span>
          <h2>Link unavailable</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  /* LOADING */

  if (!data) {
    return (
      <div className="clb-shared">
        <div className="clb-shared__state">
          <span className="clb-shared__spinner" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const columns = COLUMNS[data.type];

  return (
    <div className="clb-shared">
      <div className="clb-shared__container">
        {/* HEADER */}

        <header className="clb-shared__header">
          <div>
            <span className="clb-shared__logo">Collabry</span>

            <h1>{PAGE_TITLES[data.type]}</h1>

            <p>
              {data.items.length}{" "}
              {data.items.length === 1 ? "entry" : "entries"} · Read only
              {lastUpdated &&
                ` · Updated ${lastUpdated.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`}
            </p>
          </div>

          <span
            className={`clb-shared__live ${
              isLive ? "clb-shared__live--on" : ""
            }`}
          >
            <span className="clb-shared__live-dot" />
            {isLive ? "Live" : "Connecting..."}
          </span>
        </header>

        {/* TABLE / CARDS */}

        {data.items.length === 0 ? (
          <div className="clb-shared__state">
            <span className="clb-shared__state-icon">📭</span>
            <h2>No entries yet</h2>
            <p>New entries will appear here automatically.</p>
          </div>
        ) : (
          <div className="clb-shared__table-wrap">
            <table className="clb-shared__table">
              <thead>
                <tr>
                  {columns.map(([key, label]) => (
                    <th key={key}>{label}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {data.items.map((item) => (
                  <tr key={item._id}>
                    {columns.map(([key, label]) => (
                      <td key={key} data-label={label}>
                        {renderCell(key, item[key], item)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <footer className="clb-shared__footer">
          Shared via Collabry · This page updates automatically
        </footer>
      </div>
    </div>
  );
}

export default SharedView;
