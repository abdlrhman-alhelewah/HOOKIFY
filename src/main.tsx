import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Suppress benign development-only Vite HMR WebSocket connection errors from triggering browser/platform error overlays
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason?.message || String(event.reason || "");
    if (
      reason.includes("WebSocket") ||
      reason.includes("websocket") ||
      reason.includes("vite") ||
      reason.includes("HMR") ||
      reason.includes("connection failed")
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });

  window.addEventListener("error", (event) => {
    const message = event.message || "";
    if (
      message.includes("WebSocket") ||
      message.includes("websocket") ||
      message.includes("vite") ||
      message.includes("HMR") ||
      message.includes("connection failed")
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
