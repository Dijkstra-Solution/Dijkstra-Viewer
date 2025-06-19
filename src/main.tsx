import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
// import App from "./App.tsx";
import { ClientTest } from "./client/ClientTest.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClientTest />
  </StrictMode>
);
