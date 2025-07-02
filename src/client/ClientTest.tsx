import "../App.css";
import { Viewer } from "@/viewer/Viewer";
import { DTOPolygon } from "@/viewerapi/dto/DTOPolygon";
import { DTOComposite } from "@/viewerapi/dto/DTOComposite";
import { generateUUID } from "three/src/math/MathUtils.js";
import { useCallback, useState } from "react";
import { useEffect } from "react";
// import { useViews } from "@/viewer/hooks/useViews";
import { useDijkstraViewerStore } from "@/store/dijkstraViewerStore";
import { useViewStore } from "@/store/viewStore";

export function ClientTest() {
  const { Attributes, SetAttribute, Actions, on, Views } =
    useDijkstraViewerStore();
  const { currentViewId } = useViewStore();

  const [shiftHeld, setShiftHeld] = useState(false);
  const [controlHeld, setControlHeld] = useState(false);

  const [selectedGuids, setSelectedGuids] = useState<string[]>([]);

  function upHandler({ key }) {
    if (key === "Shift") {
      setShiftHeld(false);
    }
    if (key === "Control") {
      setControlHeld(false);
    }
  }

  const downHandler = useCallback(
    ({ key }) => {
      if (key === "Shift") {
        setShiftHeld(true);
      }
      if (key === "Control") {
        setControlHeld(true);
      }
      if (key === "Delete") {
        selectedGuids.forEach((guid) => Actions.RemoveEntity(guid));
      }
    },
    [Actions, selectedGuids]
  );

  useEffect(() => {
    Attributes.Hover.Enabled = true;
    Attributes.Selection.Enabled = true;
    Attributes.Viewer.BackgroundColor = 0x242424;

    on("StatusMessageChanged", ({ message }) => {
      console.log(message);
    });

    on("SelectionChanged", (payload) => {
      setSelectedGuids(payload.guids);
    });
    //eslint-disable-next-line
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", downHandler);
    window.addEventListener("keyup", upHandler);
    return () => {
      window.removeEventListener("keydown", downHandler);
      window.removeEventListener("keyup", upHandler);
    };
  }, [downHandler]);

  useEffect(() => {
    Actions.CreateView("client-view", "Egyedi nézet", {
      position: [0, 3, 10],
      target: [0, 0, 0],
      up: [0, 1, 0],
    });
  }, [Actions]);

  useEffect(() => {
    Attributes.Selection.Multiple = shiftHeld;
  }, [shiftHeld, Attributes.Selection]);

  useEffect(() => {
    Attributes.Selection.Remove = controlHeld;
  }, [controlHeld, Attributes.Selection]);

  const randomHex = () =>
    Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padEnd(6, "0");

  const createBox = (point: { x: number; y: number; z: number }) => {
    const blc = { x: point.x - 0.5, y: point.y - 0.5, z: point.z + 0.5 };
    const brc = { x: point.x + 0.5, y: point.y - 0.5, z: point.z + 0.5 };
    const tlc = {
      x: point.x - 0.5,
      y: point.y + 0.5,
      z: point.z + 0.5,
    };
    const trc = {
      x: point.x + 0.5,
      y: point.y + 0.5,
      z: point.z + 0.5,
    };

    const blf = { x: point.x - 0.5, y: point.y - 0.5, z: point.z - 0.5 };
    const brf = { x: point.x + 0.5, y: point.y - 0.5, z: point.z - 0.5 };
    const tlf = {
      x: point.x - 0.5,
      y: point.y + 0.5,
      z: point.z - 0.5,
    };
    const trf = {
      x: point.x + 0.5,
      y: point.y + 0.5,
      z: point.z - 0.5,
    };

    const col = randomHex();
    const bottom = new DTOPolygon(generateUUID(), [blc, blf, brf, brc], col);
    const top = new DTOPolygon(generateUUID(), [tlc, trc, trf, tlf], col);
    const left = new DTOPolygon(generateUUID(), [blc, tlc, tlf, blf], col);
    const right = new DTOPolygon(generateUUID(), [brc, brf, trf, trc], col);
    const front = new DTOPolygon(generateUUID(), [blc, brc, trc, tlc], col);
    const back = new DTOPolygon(generateUUID(), [blf, tlf, trf, brf], col);

    const composite = new DTOComposite(generateUUID());
    composite.children.push(bottom, top, left, right, front, back);
    console.log(Views);
    return composite;
  };

  useEffect(() => {
    console.log(Views);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100%",
      }}
    >
      <div>
        <button
          onClick={() => {
            Actions.SelectPoints(1, (surfacePoints) => {
              console.log(surfacePoints[0]);
              const box = createBox({
                x: Math.round(
                  surfacePoints[0].point.x + surfacePoints[0].normal.x / 2
                ),
                y: Math.round(
                  surfacePoints[0].point.y + surfacePoints[0].normal.y / 2
                ),
                z: Math.round(
                  surfacePoints[0].point.z + surfacePoints[0].normal.z / 2
                ),
              });
              Actions.AddEntity(box);
            });
          }}
        >
          Create Box
        </button>
        <button
          style={{
            backgroundColor: Attributes.Hover.Enabled ? "green" : "red",
          }}
          onClick={() => {
            SetAttribute("Hover", { Enabled: !Attributes.Hover.Enabled });
            console.log(Views);
          }}
        >
          Toggle Hover
        </button>
        {Array.from(Views.values()).map((view) => (
          <div key={view.viewId}>
            <button onClick={() => Actions.SetView(view.viewId)}>
              {view.displayName}
            </button>
            <button onClick={() => Actions.DeleteView(view.viewId)}>
              Delete
            </button>
          </div>
        ))}
        <label>{currentViewId}</label>
      </div>

      <Viewer initialView={"perspective"}></Viewer>
    </div>
  );
}
