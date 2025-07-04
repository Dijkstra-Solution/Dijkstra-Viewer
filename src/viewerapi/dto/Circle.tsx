import { HexToRGBNormalized } from "@/viewer/utils/colorUtil";
import { useMemo } from "react";

export interface CircleProps {
  type: "circle";
  guid: string;
  position: { x: number; y: number; z: number };
  normal: { x: number; y: number; z: number };
  radius: number;
  color?: string;
}
export function CircleFactory(props: Omit<CircleProps, "type">): CircleProps {
  return {
    type: "circle",
    ...props,
  };
}
export function Circle({ guid, position, normal, radius, color }: CircleProps) {
  console.log(`Circle ${guid} recalculated`);
  const { r, g, b } = useMemo(
    () => HexToRGBNormalized(color ?? "000000"),
    [color]
  );

  return (
    <circleGeometry
      args={[radius, 32]}
      lookAt={normal}
      translate={position}
      key={guid}
    >
      <bufferAttribute
        attach="attributes-color"
        args={[new Float32Array([r, g, b]), 3]}
      ></bufferAttribute>
    </circleGeometry>
  );
}
