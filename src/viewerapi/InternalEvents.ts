import { SelectionMode } from "./EventTypes";

export const InternalEvents = {
  SelectionModeChanged: "SelectionModeChanged",
} as const;

export type InternalEventType =
  (typeof InternalEvents)[keyof typeof InternalEvents];

export type InternalEventPayloads = {
  [InternalEvents.SelectionModeChanged]: { mode: SelectionMode };
};
