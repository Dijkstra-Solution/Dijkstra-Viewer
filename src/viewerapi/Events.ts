import { BufferGeometry, Vector3 } from "three";

export type EventType = (typeof Events)[keyof typeof Events];

export const Events = {
  EntitySelected: "EntitySelected",
  SceneClicked: "SceneClicked",
  SceneUpdated: "SceneUpdated",
  StatusMessage: "StatusMessage",

  ViewCreated: "ViewCreated",
  ViewRemoved: "ViewRemoved",
} as const;

export type EventPayloads = {
  [Events.EntitySelected]: { guid: string };
  [Events.SceneClicked]: { point: Vector3 }; //TODO
  [Events.SceneUpdated]: { geometry: BufferGeometry };
  [Events.StatusMessage]: { message: string };

  [Events.ViewCreated]: { viewId: string };
  [Events.ViewRemoved]: { viewId: string };
};
