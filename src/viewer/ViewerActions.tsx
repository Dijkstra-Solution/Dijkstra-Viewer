import { DTOEntity } from "@/viewerapi/dto/DTOEntity";

function unbound() {
  throw new Error("Not bound to viewer!");
}

export const viewerActions = {
  SelectPoints: unbound as (
    count: number,
    callback: (points: number[], normals: number[]) => void
  ) => void,

  AddEntity: unbound as (entity: DTOEntity) => void,
  RemoveEntity: unbound as (guid: string) => void,
  ClearEntities: unbound as () => void,
};

export type ViewerActions = typeof viewerActions;
