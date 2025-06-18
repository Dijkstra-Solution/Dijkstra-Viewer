import "./App.css";
import { useViewer } from "./viewer/hooks/useViewer";
import { Viewer } from "./viewer/Viewer";
import { ViewerProvider } from "./viewer/ViewerProvider";
import { DTOPolygon } from "./viewerapi/dto/DTOPolygon";
import { Events } from "./viewerapi/Events";

function Wrapper() {
  const { actions } = useViewer();
  return (
    <Viewer
      eventHandlers={{
        [Events.EntitySelected]: (payload) => {
          console.log("Yey" + payload.guid);
        },
        [Events.SceneClicked]: (payload) => {
          const point = payload.point;
          console.log(point);
          const polygon = new DTOPolygon(
            crypto.randomUUID(),
            [
              { x: point[0], y: point[1], z: point[2] },
              { x: point[0] + 1, y: point[1], z: point[2] },
              { x: point[0] + 1, y: point[1] + 1, z: point[2] },
              { x: point[0], y: point[1] + 1, z: point[2] },
            ],
            "red"
          );
          actions.AddEntity(polygon);
        },
      }}
    ></Viewer>
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
