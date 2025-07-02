import { createRoot } from "react-dom/client";
import "./index.css";
import { ClientTest } from "./client/ClientTest.tsx";
import { ViewerProvider } from "./viewer/ViewerProvider.tsx";

createRoot(document.getElementById("root")!).render(
  <>
    <ViewerProvider>
      <ClientTest />
    </ViewerProvider>
  </>
);
