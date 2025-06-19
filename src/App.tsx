import "./App.css";
import { useEffect, useState } from "react";
import { ViewerProvider } from "./viewer/ViewerProvider";
import { Viewer } from "./viewer/Viewer";
import { useViewer } from "./viewer/hooks/useViewer";
import { BaseView, ViewSettings } from "./viewer/views/BaseView";


// Egyszerű egyedi nézet, amit a kliens könnyen létrehozhat
class CustomClientView extends BaseView {
  readonly viewId: string = "client-view";
  readonly displayName: string = "Egyedi nézet";

  getViewSettings(): ViewSettings {
    return {
      position: [0, 3, 10], // Szemből nézzük
      target: [0, 0, 0],
      up: [0, 1, 0],
      constraints:{
        smoothTime: 1
      }
    };
  }
}

// App komponens a gombokkal és nézetváltással
function AppContent() {
  const { viewManager } = useViewer();
  const [, setCurrentView] = useState("perspective");

  useEffect(() => {
    // Regisztráljuk az egyedi nézetet
    viewManager.registerView(new CustomClientView());
    console.log("asd")
  }, [viewManager]);

  // Nézet váltása
  const switchView = (viewId: string) => {
    viewManager.setView(viewId, false); // animált váltás
    setCurrentView(viewId);
  };

  return (
    <div style={{ height: "calc(100vh - 40px)" }}>
        <button 
          onClick={() => switchView("perspective")}
        >
          Perspektíva nézet
        </button>
        <button 
          onClick={() => switchView("top")}
        >
          Felülnézet
        </button>
        <button 
          onClick={() => switchView("client-view")}
        >
          Egyedi nézet
        </button>

        <Viewer style={{ width: '100%', height: '100%' }} initialView="perspective" />
    </div>
  );
}

function App() {
  return (
    <ViewerProvider>
      <AppContent />
    </ViewerProvider>
  );
}

export default App;
