export enum SelectionMode {
  DEFAULT = 0,
  POINT = 1,
  EDGE = 2,
  FACE = 3,
}
export type ViewType = "top" | "parallel" | "perspective";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EventCallback<T = any> = (payload: T) => void;
export type EventHandlerMap = Record<string, EventCallback>;
