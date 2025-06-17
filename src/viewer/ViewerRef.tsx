import { EventPayloads } from "@/viewerapi/Events";
import { ViewerActions } from "./ViewerActions";

export type ViewerRef = {
  on: <T extends keyof EventPayloads>(
    event: T,
    callback: (payload: EventPayloads[T]) => void
  ) => void;
  off: <T extends keyof EventPayloads>(
    event: T,
    callback: (payload: EventPayloads[T]) => void
  ) => void;
  fire: <T extends keyof EventPayloads>(
    event: T,
    payload: EventPayloads[T]
  ) => void;
  actions: ViewerActions;
};
