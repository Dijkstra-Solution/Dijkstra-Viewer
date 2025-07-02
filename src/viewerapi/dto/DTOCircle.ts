import {
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Vector3,
} from "three";
import { DTOEntity } from "./DTOEntity";
import { HexToRGBNormalized } from "@/viewer/utils/colorUtil";

export class DTOCircle extends DTOEntity {
  readonly type = "circle";
  position: { x: number; y: number; z: number };
  normal: { x: number; y: number; z: number };
  radius: number;
  color?: string;
  constructor(
    guid: string,
    position: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
    normal: { x: number; y: number; z: number } = { x: 0, y: 1, z: 0 },
    radius: number = 1,
    color?: string
  ) {
    super(guid);
    this.position = position;
    this.normal = normal;
    this.radius = radius;
    this.color = color;
  }

  protected buildGeometry(): BufferGeometry {
    //TODO . apply LOD here
    const dir = new Vector3(
      this.normal.x,
      this.normal.y,
      this.normal.z
    ).normalize();
    const geometry = new CircleGeometry(this.radius, 32)
      .lookAt(dir)
      .translate(this.position.x, this.position.y, this.position.z);

    const vertexCount = geometry.attributes.position.count;
    const color: Float32Array = new Float32Array(vertexCount * 3);
    const rgb = HexToRGBNormalized(this.color ?? "000000");
    for (let i = 0; i < vertexCount; i++) {
      color[i * 3] = rgb.r;
      color[i * 3 + 1] = rgb.g;
      color[i * 3 + 2] = rgb.b;
    }
    const colorAttribute = new BufferAttribute(color, 3);
    geometry.setAttribute("color", colorAttribute);
    return geometry;
  }
}
