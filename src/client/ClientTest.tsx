import { useViewer } from "@/viewer/hooks/useViewer";
import "../App.css";
import { Viewer } from "@/viewer/Viewer";
import { ViewerProvider } from "@/viewer/ViewerProvider";
import { DTOPolygon } from "@/viewerapi/dto/DTOPolygon";
import { DTOComposite } from "@/viewerapi/dto/DTOComposite";
import { generateUUID } from "three/src/math/MathUtils.js";

export function ClientTest() {
  return (
    <ViewerProvider>
      <Wrapper />
    </ViewerProvider>
  );
}

function Wrapper() {
  const { actions } = useViewer();

  const randomHex = () =>
    Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padEnd(6, "0");

  const createBox = (point: number[]) => {
    const blc = { x: point[0] - 0.5, y: point[1], z: point[2] + 0.5 };
    const brc = { x: point[0] + 0.5, y: point[1], z: point[2] + 0.5 };
    const tlc = {
      x: point[0] - 0.5,
      y: point[1] + 1,
      z: point[2] + 0.5,
    };
    const trc = {
      x: point[0] + 0.5,
      y: point[1] + 1,
      z: point[2] + 0.5,
    };

    const blf = { x: point[0] - 0.5, y: point[1], z: point[2] - 0.5 };
    const brf = { x: point[0] + 0.5, y: point[1], z: point[2] - 0.5 };
    const tlf = {
      x: point[0] - 0.5,
      y: point[1] + 1,
      z: point[2] - 0.5,
    };
    const trf = {
      x: point[0] + 0.5,
      y: point[1] + 1,
      z: point[2] - 0.5,
    };

    const bottom = new DTOPolygon(
      generateUUID(),
      [blc, blf, brf, brc],
      randomHex()
    );

    const top = new DTOPolygon(
      generateUUID(),
      [tlc, trc, trf, tlf],
      randomHex()
    );

    const left = new DTOPolygon(
      generateUUID(),
      [blc, tlc, tlf, blf],
      randomHex()
    );

    const right = new DTOPolygon(
      generateUUID(),
      [brc, brf, trf, trc],
      randomHex()
    );

    const front = new DTOPolygon(
      generateUUID(),
      [blc, brc, trc, tlc],
      randomHex()
    );

    const back = new DTOPolygon(
      generateUUID(),
      [blf, tlf, trf, brf],
      randomHex()
    );

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
      <button
        onClick={() => {
          actions.SelectPoints(1, (pts) => {
            const box = createBox(pts);
            actions.AddEntity(box);
          });
        }}
      >
        Create Box
      </button>
      <Viewer></Viewer>
    </div>
  );
}
