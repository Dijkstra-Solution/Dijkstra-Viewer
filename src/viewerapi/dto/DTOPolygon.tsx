import { ReactNode } from "react";
import { DTOEntity } from "./DTOEntity";
import { Shape, ShapeGeometry } from "three";
import { BufferGeometry } from "three/webgpu";

export class DTOPolygon extends DTOEntity {
  readonly type: string = "polygon";
  points: { x: number; y: number; z: number }[];
  color?: string;
  constructor(
    guid: string,
    points: { x: number; y: number; z: number }[],
    color?: string
  ) {
    super(guid);
    this.points = points;
    this.color = color;
  }

  render(): ReactNode {
    const shape = new Shape();
    shape.moveTo(this.points[0].x, this.points[0].y);
    this.points.splice(1).forEach((p) => shape.lineTo(p.x, p.y));
    shape.closePath();

    const geometry = new ShapeGeometry(shape);

    return <mesh geometry={geometry}></mesh>;
  }

  buildGeometry(): BufferGeometry {
    const shape = new Shape();
    shape.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      shape.lineTo(this.points[i].x, this.points[i].y);
    }
    shape.closePath();
    const geometry = new ShapeGeometry(shape) as BufferGeometry;
    geometry.setAttribute("color", new THREE.Float32BufferAttribute([1, 1, 1], 3));

    return geometry;
  }
}
//TODO - add optional texture and UV mapping
//TODO - add parameter handles
