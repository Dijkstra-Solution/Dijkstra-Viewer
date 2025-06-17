import { BufferGeometry, Vector3 } from "three";

export type EventType = (typeof Events)[keyof typeof Events];

export const Events = {
  EntitySelected: "EntitySelected",
  SceneClicked: "SceneClicked",
  SceneUpdated: "SceneUpdated",
  StatusMessage: "StatusMessage",
  ViewChanged: "ViewChanged",
  ViewerLoaded: "ViewerLoaded",
  ViewDeleted: "ViewDeleted",
  ViewResized: "ViewResized",
  ViewCreated: "ViewCreated",
} as const;

export type ViewType = "top" | "parallel" | "perspective";

export type EventPayloads = {
  [Events.EntitySelected]: { guid: string };
  [Events.SceneClicked]: { point: Vector3 }; //TODO
  [Events.SceneUpdated]: { geometry: BufferGeometry };
  [Events.StatusMessage]: { message: string };
  [Events.ViewChanged]: { view: ViewType };
  [Events.ViewerLoaded]: { viewer: string };
  [Events.ViewDeleted]: { view: ViewType };
  [Events.ViewResized]: { view: ViewType };
  [Events.ViewCreated]: { view: ViewType };
};
