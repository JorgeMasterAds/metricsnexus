import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Skip React entirely if fast smartlink redirect already handled
if (!(window as any).__SMARTLINK_FAST_REDIRECT) {
  createRoot(document.getElementById("root")!).render(<App />);
}
