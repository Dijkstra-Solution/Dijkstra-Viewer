import { AEntity } from "./AEntity";
import { BufferGeometry } from "three";
abstract class APrimitive extends AEntity {
  constructor(guid: string) {
    super(guid);
  }

  Geometry: BufferGeometry | null = null;
  StartIndex: number = 0;
}

export { APrimitive };
