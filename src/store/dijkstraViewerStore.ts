import { Edge, Face, SurfacePoint } from "@/viewer";
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
  eventListeners: Record<keyof ViewerEventMap, Set<Function>>; //TODO  hide and find safer method

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
  //TODO - implementation for methods
  //#region Entity Management
  addEntity: (entity: DTOEntity) => void;
  removeEntity: (guid: string) => void;
  clearEntities: () => void;
  //#endregion

  //#region Selection
  selectPoints: (
    count: number,
    callback: (data: SurfacePoint[]) => void
  ) => () => void;
  selectEdges: (count: number, callback: (data: Edge[]) => void) => () => void;
  selectFaces: (count: number, callback: (data: Face[]) => void) => () => void;
  //#endregion

  //#region View Management
  createView: (
    viewId: string,
    displayName?: string,
    settings?: object //TODO
  ) => boolean;
  deleteView: (viewId: string) => void;
  setView: (viewId: string, animate?: boolean) => boolean;
  resetView: (viewId: string, animate?: boolean) => void;
  resetAllViews: () => void;
  //#endregion
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
      console.log("added", entity);
    },
    removeEntity(guid) {
      console.log("removed", guid);
    },
    clearEntities() {
      console.log("clearing");
    },

    selectPoints(count, callback) {
      return () => {
        console.log("selected", count, "points");
        callback([]);
      };
    },
    selectEdges(count, callback) {
      return () => {
        console.log("selected", count, "edges");
        callback([]);
      };
    },
    selectFaces(count, callback) {
      return () => {
        console.log("selected", count, "faces");
        callback([]);
      };
    },

    createView(viewId, displayName, settings) {
      console.log("created view", viewId);
      return true;
    },
    deleteView(viewId) {
      console.log("deleted view", viewId);
    },
    setView(viewId, animate) {
      console.log("set view", viewId);
      return true;
    },
    resetView(viewId, animate) {
      console.log("reset view", viewId);
    },
    resetAllViews() {
      console.log("reset all views");
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
