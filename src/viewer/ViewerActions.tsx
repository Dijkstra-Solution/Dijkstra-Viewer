import { DTOEntity } from "@/viewerapi/dto/DTOEntity";

function unbound() {
  throw new Error("Not bound to viewer!");
}

export type CustomViewSettings = {
  position: number[],
  target: number[],
  up: number[],
  useOrthographicCamera?: boolean,
  constraints?: {
    azimuthRotateSpeed?: number,
    polarRotateSpeed?: number,
    truckSpeed?: number,
    dollySpeed?: number,
    draggingSmoothTime?: number,
    smoothTime?: number
  }
};

export const viewerActions = {
  SelectPoints: unbound as (
    count: number,
    callback: (pts: number[]) => void
  ) => void,
  AddEntity: unbound as (entity: DTOEntity) => void,
  RemoveEntity: unbound as (guid: string) => void,
  ClearEntities: unbound as () => void,
  SetView: unbound as (viewId: string, animate?: boolean) => void,
  CreateView: unbound as (
    viewOrId: string,
    displayName?: string,
    settings?: CustomViewSettings
  ) => void,
  DeleteView: unbound as (viewId: string) => void,
};

export type ViewerActions = typeof viewerActions;
