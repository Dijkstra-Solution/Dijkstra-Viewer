import { BufferGeometry } from "three";

export abstract class DTOEntity {
  readonly guid: string;
  abstract readonly type: string;

  #rev = 0;
  #builtRev = -1;
  #cachedGeometry?: BufferGeometry;

  constructor(guid: string) {
    this.guid = guid;
  }

  invalidate() {
    this.#rev++;
  }
  //TODO - use functional tracking
  geometry(): BufferGeometry {
    if (this.#rev != this.#builtRev) {
      console.log("Recalculated", this.guid);
      this.#builtRev = this.#rev;
      this.#cachedGeometry = this.buildGeometry();
    }
    return this.#cachedGeometry!;
  }
  protected abstract buildGeometry(): BufferGeometry;
}
