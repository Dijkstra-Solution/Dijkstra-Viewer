import { DTOEntity } from "@/viewerapi/dto/DTOEntity";

function unbound() {
  throw new Error("Not bound to viewer!");
}

export interface SurfacePoint {
  guid: string;
  point: { x: number; y: number; z: number };
  normal: { x: number; y: number; z: number };
}
export interface Edge {
  guid: string;
  start: { x: number; y: number; z: number };
  end: { x: number; y: number; z: number };
}
export interface Face {
  guid: string;
  outline: { x: number; y: number; z: number }[];
  holes: { x: number; y: number; z: number }[][];
  normal: { x: number; y: number; z: number };
}

export const viewerActions = {
  SelectPoints: unbound as (
    count: number,
    callback: (data: SurfacePoint[]) => void
  ) => void,

  SelectEdges: unbound as (
    count: number,
    callback: (data: Edge[]) => void
  ) => void,

  //TODO - interfaces for return values

  SelectFaces: unbound as (
    count: number,
    callback: (data: Face[]) => void
  ) => void,

  AddEntity: unbound as (entity: DTOEntity) => void,
  RemoveEntity: unbound as (guid: string) => void,
  ClearEntities: unbound as () => void,
};

export type ViewerActions = typeof viewerActions;
