import "./App.css";
import { useEventEmitter } from "./viewer/hooks/useEventEmitter";
import { Viewer } from "./viewer/Viewer";
import { ViewerProvider } from "./viewer/ViewerProvider";
import { Events } from "./viewerapi/Events";

function showMessage() {
  alert("Hello");
}

function App() {
  const { on, off, fire } = useEventEmitter();
  on(Events.SceneUpdated, showMessage);
  return (
    <>
      <ViewerProvider>
        <Viewer client={null}></Viewer>
      </ViewerProvider>
    </>
  );
}

export default App;
