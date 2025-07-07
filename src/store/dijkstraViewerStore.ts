import { createInteractionStore } from "./interactionStore";
import { DTOEntity } from "@/viewerapi";
import { BufferGeometry, Vector3 } from "three";
import { create } from "zustand";
import { createViewStore, ViewSettings, ViewStore } from "./viewStore"; // import view store

export interface SurfacePoint {
  guid: string;
  point: { x: number; y: number; z: number };
  normal: { x: number; y: number; z: number };
}
export interface Edge {
  guid: string;
  start: { x: number; y: number; z: number };
  end: { x: number; y: number; z: number };
}
export interface Face {
  guid: string;
  outline: { x: number; y: number; z: number }[];
  holes: { x: number; y: number; z: number }[][];
  normal: { x: number; y: number; z: number };
}

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
  Views: ViewStore["views"];
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
    GridHelper: boolean;
  };
}

export type DijkstraViewerStore = ViewerEventHandler &
  ViewerActions &
  Views & { Attributes: Attributes } & {
    SetAttribute<G extends keyof Attributes>(
      group: G,
      path: Partial<Attributes[G]>
    ): void;
  };

export interface InternalDijkstraViewerStore extends DijkstraViewerStore {
  _internal: {
    entities: Map<string, DTOEntity>;
    // getEntity: (guid: string) => DTOEntity | undefined;
    // getEntities: () => Map<string, DTOEntity>;

    getHoveredGUID: () => string | null;
    setHoveredGUID: (guid: string | null) => void;
    getHoverIndex: () => number;
    setHoverIndex: (index: number) => void;
    cycleHover: () => void;
    getSelectedGUIDs: () => Set<string>;
    setSelectedGUIDs: (guids: Set<string>) => void;
    getIntersectionPoint: () => { x: number; y: number; z: number } | null;
    setIntersectionPoint: (point: Vector3 | null) => void;
    getHoveredObjects: () => number[];
    setHoveredObjects: (objects: number[]) => void;

    updateViewPosition: (
      viewId: string,
      position: number[],
      target: number[],
      up?: number[]
    ) => void;
  };
}

export const createDijkstraViewerStore = () =>
  create<InternalDijkstraViewerStore>((set, get) => {
    const interactionStore = createInteractionStore();
    const viewStore = createViewStore();

    return {
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
        ViewChanged: new Set<
          (payload: ViewerEventMap["ViewChanged"]) => void
        >(),
        ViewerLoaded: new Set<
          (payload: ViewerEventMap["ViewerLoaded"]) => void
        >(),
        ViewDeleted: new Set<
          (payload: ViewerEventMap["ViewDeleted"]) => void
        >(),
        ViewCreated: new Set<
          (payload: ViewerEventMap["ViewCreated"]) => void
        >(),
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
          if (!get()._internal.entities.has(entity.guid)) {
            console.log("adding", entity.guid);
            set((state) => {
              const newEntities = new Map(state._internal.entities);
              newEntities.set(entity.guid, entity);
              return {
                ...state,
                _internal: {
                  ...state._internal,
                  entities: newEntities,
                },
              };
            });
          }
        },
        RemoveEntity(guid) {
          console.log("removing", guid);
          if (get()._internal.entities.has(guid)) {
            set((state) => {
              const newEntities = new Map(state._internal.entities);
              newEntities.delete(guid);
              return {
                ...state,
                _internal: {
                  ...state._internal,
                  entities: newEntities,
                },
              };
            });
            return;
          }
          console.log("removed", guid);
        },
        ClearEntities() {
          console.log("clearing");
          set((state) => ({
            ...state,
            _internal: {
              ...state._internal,
              entities: new Map<string, DTOEntity>(),
            },
          }));
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
        CreateView(viewId, displayName: string, settings: ViewSettings) {
          // Check if the view already exists in this store with the same properties
          const existingViews = get().Views;
          // console.log(typeof existingViews);
          const existingView = existingViews[viewId];

          // Only proceed if the view doesn't exist or has different properties
          if (
            !existingView ||
            existingView.displayName !== displayName ||
            JSON.stringify(existingView.settings) !== JSON.stringify(settings)
          ) {
            viewStore.getState().registerView({
              viewId,
              displayName,
              settings,
              defaultSettings: settings,
            });
            get().fire("ViewCreated", { view: viewId });

            // Update the Views array in this store by adding the new view instead of overwriting
            set((state) => {
              const newView = {
                viewId,
                displayName,
                settings,
                defaultSettings: settings,
              };
              // Check if view with this ID already exists
              // const existingView = state.Views.get(viewId);

              const updatedViews = new Map(state.Views);
              updatedViews.set(viewId, newView);
              return { Views: updatedViews };
            });
          }
          return true;
        },
        DeleteView(viewId) {
          // Prevent deletion of perspective and top view
          if (viewId === "perspective" || viewId === "top") {
            console.warn(
              `Cannot delete the ${viewId} view as it is required by the system.`
            );
            return;
          }

          viewStore.getState().unregisterView(viewId);
          get().fire("ViewDeleted", { view: viewId });

          // Update the Views array by filtering out the deleted view
          set((state) => {
            const updated = new Map(state.Views);
            updated.delete(viewId);
            return { Views: updated };
          });
        },
        SetView(viewId) {
          viewStore.getState().setCurrentView(viewId);
          get().fire("ViewChanged", { view: viewId });
          return true;
        },
        ResetView(viewId, animate) {
          viewStore.getState().resetView(viewId, animate);
        },
        ResetAllViews() {
          viewStore.getState().resetAllViews();
        },
        //#endregion
      },
      //#endregion
      //TODO - merge with Adrián
      Views: viewStore.getState().views,
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
          GridHelper: true,
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

      _internal: {
        entities: new Map<string, DTOEntity>(),
        getHoveredGUID: () => interactionStore.getState().hoveredGUID,
        getHoverIndex: () => interactionStore.getState().hoverIndex,
        getSelectedGUIDs: () => interactionStore.getState().selectedGUIDs,
        getHoveredObjects: () => interactionStore.getState().hoveredObjects,

        setHoveredGUID: (guid: string | null) => {
          interactionStore.getState().setHoveredGUID(guid);
          set((state) => ({
            ...state,
          }));
        },
        setHoverIndex: (index: number) =>
          interactionStore.getState().setHoverIndex(index),
        setSelectedGUIDs: (guids: Set<string>) =>
          interactionStore.getState().setSelectedGUIDs(guids),
        getIntersectionPoint: () =>
          interactionStore.getState().intersectionPoint,
        setIntersectionPoint: (point) =>
          interactionStore.getState().setIntersectionPoint(point),
        setHoveredObjects: (objects: number[]) =>
          interactionStore.getState().setHoveredObjects(objects),

        cycleHover: () => interactionStore.getState().cycleHover(),
        updateViewPosition: (
          viewId: string,
          position: number[],
          target: number[],
          up?: number[]
        ) => {
          viewStore.getState().updateViewPosition(viewId, position, target, up);
          set((state) => ({
            ...state,
          }));
          get().fire("ViewChanged", { view: viewId });
        },
      },
    };
  });
