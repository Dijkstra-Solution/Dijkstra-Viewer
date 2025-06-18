import "./App.css";
import { useViewer } from "./viewer/hooks/useViewer";
import { Viewer } from "./viewer/Viewer";
import { ViewerProvider } from "./viewer/ViewerProvider";
import { DTOComposite } from "./viewerapi/dto/DTOComposite";
import { DTOPolygon } from "./viewerapi/dto/DTOPolygon";
import { Events } from "./viewerapi/Events";

function Wrapper() {
  const { actions } = useViewer();

  return (
    <>
      <Viewer
        eventHandlers={{
          [Events.EntitySelected]: (payload) => {
            console.log("Yey" + payload.guid);
          },
        }}
      ></Viewer>
    </>
  );
}

function App() {
  return (
    <>
      <ViewerProvider>
        <Wrapper />
      </ViewerProvider>
    </>
  );
}

export default App;
