import { ReactNode } from "react";
import { DTOEntity } from "./DTOEntity";
import { Line } from "@react-three/drei";
import { BufferGeometry, Vector3 } from "three/webgpu";
import { LineGeometry } from "three/examples/jsm/Addons.js";

export class DTOLine extends DTOEntity {
  readonly type: string = "line";
  start: { x: number; y: number; z: number };
  end: { x: number; y: number; z: number };
  color?: string;
  width?: number;

  constructor(
    guid: string,
    start: { x: number; y: number; z: number },
    end: { x: number; y: number; z: number },
    color?: string,
    width?: number
  ) {
    super(guid);
    this.start = start;
    this.end = end;
    this.color = color;
    this.width = width;
  }

  buildGeometry(): BufferGeometry {
    return new LineGeometry().setFromPoints([
      new Vector3(this.start.x, this.start.y, this.start.z),
      new Vector3(this.end.x, this.end.y, this.end.z),
    ]) as BufferGeometry;
  }

  //TODO - obsolete
  render(): ReactNode {
    const points = [
      this.start.x,
      this.start.y,
      this.start.z,
      this.end.x,
      this.end.y,
      this.end.z,
    ];
    return (
      <Line
        points={points}
        color={this.color ?? "white"}
        linewidth={this.width ?? 1}
      />
    );
  }
}
