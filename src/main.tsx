import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

window.addEventListener("vite:preloadError", () => {
  const last = Number(sessionStorage.getItem("chunk-reload-at") || 0);
  if (Date.now() - last > 10000) {
    sessionStorage.setItem("chunk-reload-at", String(Date.now()));
    window.location.reload();
  }
});
