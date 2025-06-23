import { useViewer } from "@/viewer/hooks/useViewer";
import "../App.css";
import { Viewer } from "@/viewer/Viewer";
import { ViewerProvider } from "@/viewer/ViewerProvider";
import { DTOPolygon } from "@/viewerapi/dto/DTOPolygon";
import { DTOComposite } from "@/viewerapi/dto/DTOComposite";
import { generateUUID } from "three/src/math/MathUtils.js";
import { Events } from "@/viewerapi/Events";
import { useState } from "react";

export function ClientTest() {
  return (
    <ViewerProvider>
      <Wrapper />
    </ViewerProvider>
  );
}

function Wrapper() {
  const { actions } = useViewer();
  const [hoverOn, setHoverOn] = useState(true);

  const randomHex = () =>
    Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padEnd(6, "0");

  const createBox = (point: { x: number; y: number; z: number }) => {
    const blc = { x: point.x - 0.5, y: point.y, z: point.z + 0.5 };
    const brc = { x: point.x + 0.5, y: point.y, z: point.z + 0.5 };
    const tlc = {
      x: point.x - 0.5,
      y: point.y + 1,
      z: point.z + 0.5,
    };
    const trc = {
      x: point.x + 0.5,
      y: point.y + 1,
      z: point.z + 0.5,
    };

    const blf = { x: point.x - 0.5, y: point.y, z: point.z - 0.5 };
    const brf = { x: point.x + 0.5, y: point.y, z: point.z - 0.5 };
    const tlf = {
      x: point.x - 0.5,
      y: point.y + 1,
      z: point.z - 0.5,
    };
    const trf = {
      x: point.x + 0.5,
      y: point.y + 1,
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
    return composite;
  };

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
            actions.SelectPoints(1, (surfacePoints) => {
              console.log(surfacePoints);
              const box = createBox(surfacePoints[0].point);
              actions.AddEntity(box);
            });
          }}
        >
          Create Box
        </button>
        <button
          style={{ backgroundColor: hoverOn ? "green" : "red" }}
          onClick={() => {
            setHoverOn((old) => !old);
          }}
        >
          Toggle Hover
        </button>
      </div>

      <Viewer
        eventHandlers={{
          [Events.StatusMessage]: (payload) => {
            console.log(payload.message);
          },
        }}
        features={{
          hover: { enabled: hoverOn, color: 0xff6600 },
          selection: { enabled: true, color: 0x00ff00 },
        }}
      ></Viewer>
    </div>
  );
}
