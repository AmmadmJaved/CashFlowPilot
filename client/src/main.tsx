import { createRoot } from "react-dom/client";
import App from "./App";
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

createRoot(document.getElementById("root")!).render(<App />);
