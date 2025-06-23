import { BufferGeometry } from "three";
import { ViewType } from "./EventTypes";

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

export type EventType = (typeof Events)[keyof typeof Events];

export type EventPayloads = {
  [Events.EntitySelected]: { guid?: string };
  [Events.SceneClicked]: {
    guid?: string;
    point: { x: number; y: number; z: number };
    normal: { x: number; y: number; z: number };
  };
  [Events.SceneUpdated]: { geometry: BufferGeometry };
  [Events.StatusMessage]: { message: string };
  [Events.ViewChanged]: { view: ViewType };
  [Events.ViewerLoaded]: { viewer: string };
  [Events.ViewDeleted]: { view: ViewType };
  [Events.ViewResized]: { view: ViewType };
  [Events.ViewCreated]: { view: ViewType };
};
