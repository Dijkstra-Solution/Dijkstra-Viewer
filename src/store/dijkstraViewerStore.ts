import { Edge, Face, SurfacePoint } from "@/viewer";
import { DTOEntity } from "@/viewerapi";
import { BufferGeometry } from "three";
import { create } from "zustand";

type ViewerEventMap = {
  SelectionChanged: { guids: string[] };
  SceneClicked: {
    guid?: string | undefined;
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
  Actions: {
    //TODO - implementation for methods
    //#region Entity Management
    AddEntity: (entity: DTOEntity) => void;
    RemoveEntity: (guid: string) => void;
    ClearEntities: () => void;
    //#endregion

    //#region Selection
    SelectPoints: (
      count: number,
      callback: (data: SurfacePoint[]) => void
    ) => () => void;
    SelectEdges: (
      count: number,
      callback: (data: Edge[]) => void
    ) => () => void;
    SelectFaces: (
      count: number,
      callback: (data: Face[]) => void
    ) => () => void;
    //#endregion

    //#region View Management
    CreateView: (
      viewId: string,
      displayName?: string,
      settings?: object //TODO
    ) => boolean;
    DeleteView: (viewId: string) => void;
    SetView: (viewId: string, animate?: boolean) => boolean;
    ResetView: (viewId: string, animate?: boolean) => void;
    ResetAllViews: () => void;
    //#endregion
  };
};

type Views = {
  //TODO - viewStore
  Views: [];
};

interface Attributes {
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
  Viewer: {
    BackgroundColor: number;
  };
}

type DijkstraViewerStore = ViewerEventHandler &
  ViewerActions &
  Views & { Attributes: Attributes } & {
    SetAttribute<G extends keyof Attributes>(
      group: G,
      path: Partial<Attributes[G]>
    ): void;
  } & {
    entities: Map<string, DTOEntity>;
  };

export const useDijkstraViewerStore = create<DijkstraViewerStore>(
  (set, get) => ({
    entities: new Map<string, DTOEntity>(),

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
    Actions: {
      //#region Entity Management
      AddEntity(entity) {
        set((state) => ({
          entities: state.entities.has(entity.guid)
            ? state.entities
            : new Map([...state.entities, [entity.guid, entity]]),
        }));
      },
      RemoveEntity(guid) {
        console.log("removing", guid);
        set((state) => ({
          entities: state.entities.has(guid)
            ? new Map([...state.entities].filter(([g]) => g !== guid))
            : state.entities,
        }));
        console.log("removed", guid);
      },
      ClearEntities() {
        console.log("clearing");
      },
      //#endregion

      //#region Selection
      SelectPoints: (count, callback) => {
        get().fire("StatusMessageChanged", {
          message: `Pick ${count} points!`,
        });

        const surfacePoints: SurfacePoint[] = [];

        const clickHandler = ({
          guid,
          point,
          normal,
        }: {
          guid: string;
          point: { x: number; y: number; z: number };
          normal: { x: number; y: number; z: number };
        }) => {
          surfacePoints.push({ guid, point, normal });
          if (surfacePoints.length == count) {
            cleanup();
            callback(surfacePoints);
          }
        };
        const cleanup = () => {
          get().off("SceneClicked", clickHandler);
        };
        get().on("SceneClicked", clickHandler);
        return cleanup;
      },
      SelectEdges(count, callback) {
        return () => {
          console.log("selected", count, "edges");
          callback([]);
        };
      },
      SelectFaces(count, callback) {
        return () => {
          console.log("selected", count, "faces");
          callback([]);
        };
      },
      //#endregion

      //#region View Management
      CreateView(viewId, displayName, settings) {
        console.log("created view", viewId);
        return true;
      },
      DeleteView(viewId) {
        console.log("deleted view", viewId);
      },
      SetView(viewId, animate) {
        console.log("set view", viewId);
        return true;
      },
      ResetView(viewId, animate) {
        console.log("reset view", viewId);
      },
      ResetAllViews() {
        console.log("reset all views");
      },
      //#endregion
    },
    //#endregion

    //TODO - merge with Adrián
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
      Viewer: {
        BackgroundColor: 0xffffff,
      },
    },

    SetAttribute: (group, patch) =>
      set((state) => ({
        Attributes: {
          ...state.Attributes,
          [group]: {
            ...state.Attributes[group],
            ...patch,
          },
        },
      })),
  })
);
