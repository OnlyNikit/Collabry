import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

import { AuthProvider } from "./context/AuthContext";
(function () {
  const origFetch = window.fetch;
  window.fetch = function (...args) {
    const url = args[0]?.url || args[0];
    if (
      typeof url === "string" &&
      url.includes("/labels") &&
      !url.includes("/api/labels")
    ) {
      console.trace("🚨 BAD FETCH TO /labels:", url);
    }
    return origFetch.apply(this, args);
  };

  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    if (
      typeof url === "string" &&
      url.includes("/labels") &&
      !url.includes("/api/labels")
    ) {
      console.trace("🚨 BAD XHR TO /labels:", url);
    }
    return origOpen.call(this, method, url, ...rest);
  };
})();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);
