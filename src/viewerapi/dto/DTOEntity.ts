import { ReactNode } from "react";
import { BufferGeometry } from "three";

export abstract class DTOEntity {
  readonly guid: string;
  abstract readonly type: string;

  #rev = 0;
  #cachedGeometry?: BufferGeometry;

  constructor(guid: string) {
    this.guid = guid;
  }
  abstract render(): ReactNode;
  geometry(rev: number): BufferGeometry {
    if (rev != this.#rev) {
      this.#rev = rev;
      this.#cachedGeometry = this.buildGeometry();
    }
    return this.#cachedGeometry!;
  }
  protected abstract buildGeometry(): BufferGeometry;
}
