import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { OidcProvider } from "./AuthProvider";
import "./index.css";
import { initThemeMode } from "./lib/themeMode";

initThemeMode();

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/+$/, "");

if (apiBaseUrl) {
  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === "string" && input.startsWith("/api")) {
      return originalFetch(`${apiBaseUrl}${input}`, init);
    }

    if (input instanceof Request) {
      const parsedUrl = new URL(input.url, window.location.origin);
      if (parsedUrl.pathname.startsWith("/api")) {
        const rewrittenUrl = `${apiBaseUrl}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
        const rewrittenRequest = new Request(rewrittenUrl, input);
        return originalFetch(rewrittenRequest, init);
      }
    }

    return originalFetch(input, init);
  };
}


// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered successfully');
    } catch (error) {
      console.log('SW registration failed');
    }
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <OidcProvider>
    <App />
  </OidcProvider>
);
