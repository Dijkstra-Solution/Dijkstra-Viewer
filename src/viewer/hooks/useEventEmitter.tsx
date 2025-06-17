import { EventPayloads, EventType } from "@/viewerapi/Events";
import { useCallback, useRef } from "react";

type EventCallback<T> = (payload: T) => void;

export function useEventEmitter() {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  const listeners = useRef(new Map<EventType, Set<Function>>()); //TODO - find safer solution

  const on = useCallback(
    <T extends EventType>(
      event: T,
      callback: EventCallback<EventPayloads[T]>
    ) => {
      if (!listeners.current.has(event))
        listeners.current.set(event, new Set());
      listeners.current.get(event)!.add(callback);
    },
    []
  );
  const off = useCallback(
    <T extends EventType>(
      event: T,
      callback: EventCallback<EventPayloads[T]>
    ) => {
      listeners.current.get(event)?.delete(callback);
    },
    []
  );
  const fire = useCallback(
    <T extends EventType>(event: T, payload: EventPayloads[T]) => {
      listeners.current
        .get(event)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ?.forEach((callback) => (callback as EventCallback<any>)(payload)); //TODO - find safer solution
    },
    []
  );

  return { on, off, fire };
}
