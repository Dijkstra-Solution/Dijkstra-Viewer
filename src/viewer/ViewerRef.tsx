import { EventPayloads } from "@/viewerapi/Events";
import { ViewerActions } from "./ViewerActions";
import { BufferGeometry } from "three";
import { BaseView } from "./views/BaseView";
import { RefObject } from "react";
import { CameraControls } from "@react-three/drei";

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
  mergedGeometry: BufferGeometry;
  views: {
    getAllViews: () => BaseView[];
    getView: (viewId: string) => BaseView | undefined;
    getCurrentView: () => BaseView | undefined;
    // Internal API - not exposed to end users in documentation
    setCameraControlsRef: (ref: RefObject<CameraControls | null>) => void;
  }
};
