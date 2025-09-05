import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { OidcProvider } from "./AuthProvider";
import "./index.css";

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
