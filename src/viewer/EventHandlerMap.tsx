import { EventPayloads, EventType } from "@/viewerapi/Events";

export type EventHandlerMap = {
  [K in EventType]?: (payload: EventPayloads[K]) => void;
};
