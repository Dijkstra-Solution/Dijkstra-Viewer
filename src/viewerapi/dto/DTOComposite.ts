import { BufferGeometry } from "three/webgpu";
import { DTOEntity } from "./DTOEntity";
import { BufferGeometryUtils } from "three/examples/jsm/Addons.js";

export class DTOComposite extends DTOEntity {
  readonly type: string = "composite";

  children: DTOEntity[] = [];
  constructor(guid: string) {
    super(guid);
  }

  protected buildGeometry(): BufferGeometry {
    return BufferGeometryUtils.mergeGeometries(
      this.children.map((c) => c.geometry())
    );
  }
}
