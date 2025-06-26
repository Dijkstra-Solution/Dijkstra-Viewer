import { DTOEntity } from "@/viewerapi";
import { BufferGeometry } from "three";
import { create } from "zustand";

type ViewerEventMap = {
  SelectionChanged: { guids: string[] };
  SceneClicked: {
    guid: string | undefined;
    point: { x: number; y: number; z: number };
    normal: { x: number; y: number; z: number };
  };
  SceneUpdated: { geometry: BufferGeometry }; //TODO - is this even needed?
  StatusMessageChanged: { message: string };
  ViewChanged: { view: string };
  ViewerLoaded: { viewer: string };
  ViewDeleted: { view: string };
  ViewCreated: { view: string };
  ViewReset: { view: string };
};

type ViewerEventCallback<T extends keyof ViewerEventMap> = (
  payload: ViewerEventMap[T]
) => void;

interface ViewerEventHandler {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  eventListeners: Record<keyof ViewerEventMap, Set<Function>>; //TODO

  on: <K extends keyof ViewerEventMap>(
    event: K,
    callback: ViewerEventCallback<K>
  ) => () => void;

  off: <K extends keyof ViewerEventMap>(
    event: K,
    callback: ViewerEventCallback<K>
  ) => void;

  fire: <K extends keyof ViewerEventMap>(
    event: K,
    payload: ViewerEventMap[K]
  ) => void;
}

type ViewerActions = {
  addEntity: (entity: DTOEntity) => void;
};

type Views = {
  //TODO - viewStore
  Views: [];
};

interface Attributes {
  Attributes: {
    Hover: {
      Enabled: boolean;
      Color: number;
      Thickness: number;
    };
    Selection: {
      Enabled: boolean;
      Multiple: boolean;
      Remove: boolean;
      Color: number;
      Thickness: number;
    };
    Snapping: {
      Enabled: boolean;
      Tolerance: number;
    };
  };
}

type DijkstraViewerStore = ViewerEventHandler &
  ViewerActions &
  Views &
  Attributes;

export const useDijkstraViewerStore = create<DijkstraViewerStore>(
  (set, get) => ({
    //#region Event Management
    //TODO - make event sets null by default
    eventListeners: {
      SceneClicked: new Set<
        (payload: ViewerEventMap["SceneClicked"]) => void
      >(),
      SelectionChanged: new Set<
        (payload: ViewerEventMap["SelectionChanged"]) => void
      >(),
      SceneUpdated: new Set<
        (payload: ViewerEventMap["SceneUpdated"]) => void
      >(),
      StatusMessageChanged: new Set<
        (payload: ViewerEventMap["StatusMessageChanged"]) => void
      >(),
      ViewChanged: new Set<(payload: ViewerEventMap["ViewChanged"]) => void>(),
      ViewerLoaded: new Set<
        (payload: ViewerEventMap["ViewerLoaded"]) => void
      >(),
      ViewDeleted: new Set<(payload: ViewerEventMap["ViewDeleted"]) => void>(),
      ViewCreated: new Set<(payload: ViewerEventMap["ViewCreated"]) => void>(),
      ViewReset: new Set<(payload: ViewerEventMap["ViewReset"]) => void>(),
    },
    on(event, callback) {
      set((state) => {
        const listeners = { ...state.eventListeners };
        listeners[event].add(callback);
        return { eventListeners: listeners };
      });
      // return unsubscribe
      return () => get().off(event, callback);
    },

    off(event, callback) {
      set((state) => {
        const listeners = { ...state.eventListeners };
        listeners[event].delete(callback);
        return { eventListeners: listeners };
      });
    },

    fire(event, payload) {
      // iterate current snapshot of listeners
      get().eventListeners[event]?.forEach((cb) => {
        try {
          cb(payload);
        } catch (err) {
          console.error(`Error in ${event} handler`, err);
        }
      });
    },
    //#endregion

    //#region Actions
    addEntity(entity) {
      // your other action logic...
      console.log("added", entity);
    },
    //#endregion

    Views: [],

    Attributes: {
      Hover: {
        Enabled: false,
        Color: 0xffffff,
        Thickness: 3,
      },
      Selection: {
        Enabled: false,
        Multiple: false,
        Remove: false,
        Color: 0xffffff,
        Thickness: 3,
      },
      Snapping: {
        Enabled: false,
        Tolerance: 0.1,
      },
    },
  })
);
