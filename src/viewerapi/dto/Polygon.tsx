import { HexToRGBNormalized } from "@/viewer/utils/colorUtil";
import { useMemo } from "react";
import { Vector3 } from "three";
import { Earcut } from "three/src/extras/Earcut.js";

export interface PolygonProps {
  type: "polygon";
  guid: string;
  points: { x: number; y: number; z: number }[];
  color?: string;
}

export function PolygonFactory(
  props: Omit<PolygonProps, "type">
): PolygonProps {
  return {
    type: "polygon",
    ...props,
  };
}

export function Polygon({ guid, points, color }: PolygonProps) {
  console.log(`Polygon ${guid} recalculated`);
  const { r, g, b } = useMemo(
    () => HexToRGBNormalized(color ?? "000000"),
    [color]
  );

  const colors = useMemo(
    () => new Float32Array(points.map(() => [r, g, b]).flat()),
    [points, r, g, b]
  );
  const positions = useMemo(
    () => new Float32Array(points.map((p) => [p.x, p.y, p.z]).flat()),
    [points]
  );
  const indices = useMemo(() => {
    const v0 = new Vector3(points[0].x, points[0].y, points[0].z);
    const v1 = new Vector3(points[1].x, points[1].y, points[1].z);
    const v2 = new Vector3(points[2].x, points[2].y, points[2].z);
    const e1 = new Vector3().subVectors(v1, v0);
    const e2 = new Vector3().subVectors(v2, v0);
    const normal = new Vector3().crossVectors(e1, e2).normalize();
    const axisX = e1.clone().normalize();
    const axisY = new Vector3().crossVectors(normal, axisX).normalize();

    const projected = points
      .map((point) => {
        const v = new Vector3(point.x, point.y, point.z).sub(v0);
        return [v.dot(axisX), v.dot(axisY)];
      })
      .flat();

    return Earcut.triangulate(projected, [], 2);
  }, [points]);

  return (
    <bufferGeometry setIndex={indices} key={guid}>
      <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      <bufferAttribute attach="attributes-color" args={[colors, 3]} />
    </bufferGeometry>
  );
}
