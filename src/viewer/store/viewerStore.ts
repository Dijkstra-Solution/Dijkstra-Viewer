/*
import { create } from "zustand";
import { BufferGeometry } from "three";
import { BufferGeometryUtils } from "three/examples/jsm/Addons.js";
import { DTOEntity } from "@/viewerapi/dto/DTOEntity";
import { Edge, Face, SurfacePoint } from "../ViewerActions";
import { BaseView, ViewSettings } from "../views/BaseView";
import { ViewManager } from "../views/ViewManager";
import { RefObject } from "react";
import { CameraControls } from "@react-three/drei";

// Events definition (moved from Events.ts)
export const ViewerEvents = {
  SelectionChanged: "EntitySelected",
  SceneClicked: "SceneClicked",
  SceneUpdated: "SceneUpdated",
  StatusMessage: "StatusMessage",
  ViewChanged: "ViewChanged",
  ViewerLoaded: "ViewerLoaded",
  ViewDeleted: "ViewDeleted",
  ViewCreated: "ViewCreated",
  ViewReset: "ViewReset",
} as const;

export type ViewerEventType = (typeof ViewerEvents)[keyof typeof ViewerEvents];

export type ViewerEventPayloads = {
  [ViewerEvents.SelectionChanged]: { guids: string[] };
  [ViewerEvents.SceneClicked]: {
    guid?: string;
    point: { x: number; y: number; z: number };
    normal: { x: number; y: number; z: number };
  };
  [ViewerEvents.SceneUpdated]: { geometry: BufferGeometry };
  [ViewerEvents.StatusMessage]: { message: string };
  [ViewerEvents.ViewChanged]: { view: string };
  [ViewerEvents.ViewerLoaded]: { viewer: string };
  [ViewerEvents.ViewDeleted]: { view: string };
  [ViewerEvents.ViewCreated]: { view: string };
  [ViewerEvents.ViewReset]: { view: string };
};

// Types
type EventCallback<T> = (payload: T) => void;
type EventMap = {
  [K in keyof ViewerEventPayloads]?: Set<EventCallback<ViewerEventPayloads[K]>>;
};

// State interface
interface ViewerState {
  byId: Map<string, DTOEntity>;
  rev: number;
  eventMap: EventMap;
  viewManager: ViewManager;
  mergedGeometry: BufferGeometry;
}

// Actions interface
interface ViewerActions {
  // Event handling
  on: <T extends keyof ViewerEventPayloads>(event: T, callback: EventCallback<ViewerEventPayloads[T]>) => void;
  off: <T extends keyof ViewerEventPayloads>(event: T, callback: EventCallback<ViewerEventPayloads[T]>) => void;
  fire: <T extends keyof ViewerEventPayloads>(event: T, payload: ViewerEventPayloads[T]) => void;

  // Entity management
  addEntity: (entity: DTOEntity) => void;
  removeEntity: (guid: string) => void;
  clearEntities: () => void;
  
  // Selection actions
  selectPoints: (count: number, callback: (data: SurfacePoint[]) => void, signal?: AbortSignal) => () => void;
  selectEdges: (count: number, callback: (data: Edge[]) => void, signal?: AbortSignal) => () => void;
  selectFaces: (count: number, callback: (data: Face[]) => void, signal?: AbortSignal) => () => void;
  
  // View management
  deleteView: (viewId: string) => void;
  setView: (viewId: string, animate?: boolean) => boolean;
  createView: (viewId: string, displayName?: string, settings?: ViewSettings) => boolean;
  resetView: (viewId: string, animate?: boolean) => void;
  resetAllViews: () => void;
  
  // Camera controls
  setCameraControlsRef: (ref: RefObject<CameraControls | null>) => void;
}

// Views API interface
interface ViewsAPI {
  getAllViews: () => BaseView[];
  getView: (viewId: string) => BaseView | undefined;
  getCurrentView: () => BaseView | undefined;
  getSavedCameraState: (viewId: string) => { position: number[]; target: number[]; up: number[]; zoom: number } | undefined;
}

// Create the store
export const useViewerStore = create<ViewerState & ViewerActions & { views: ViewsAPI }>((set, get) => {
  // Create ViewManager instance
  const viewManager = new ViewManager(
    (event, payload) => get().fire(event, payload)
  );
  
  return {
    // Initial state
    byId: new Map<string, DTOEntity>(),
    rev: 0,
    eventMap: {},
    viewManager,
    mergedGeometry: new BufferGeometry(),

    // Event management
    on: <T extends keyof ViewerEventPayloads>(event: T, callback: EventCallback<ViewerEventPayloads[T]>) => {
      set(state => {
        const eventMap = { ...state.eventMap };
        if (!eventMap[event]) {
          eventMap[event] = new Set();
        }
        eventMap[event]?.add(callback as any);
        return { eventMap };
      });
    },

    off: <T extends keyof ViewerEventPayloads>(event: T, callback: EventCallback<ViewerEventPayloads[T]>) => {
      set(state => {
        const eventMap = { ...state.eventMap };
        eventMap[event]?.delete(callback as any);
        return { eventMap };
      });
    },

    fire: <T extends keyof ViewerEventPayloads>(event: T, payload: ViewerEventPayloads[T]) => {
      const { eventMap } = get();
      eventMap[event]?.forEach(callback => {
        (callback as any)(payload);
      });
    },

    // Entity management
    addEntity: (entity: DTOEntity) => {
      set(state => {
        const { byId, rev } = state;
        if (byId.has(entity.guid)) return state;
        
        const next = new Map(byId);
        next.set(entity.guid, entity);
        
        // Recalculate merged geometry
        const updatedState = { byId: next, rev: rev + 1 };
        const mergedGeometry = calculateMergedGeometry(updatedState);
        
        return { ...updatedState, mergedGeometry };
      });
    },

    removeEntity: (guid: string) => {
      set(state => {
        const { byId, rev } = state;
        if (!byId.has(guid)) return state;
        
        const next = new Map(byId);
        next.delete(guid);
        
        // Recalculate merged geometry
        const updatedState = { byId: next, rev: rev + 1 };
        const mergedGeometry = calculateMergedGeometry(updatedState);
        
        return { ...updatedState, mergedGeometry };
      });
    },

    clearEntities: () => {
      set(state => {
        const emptyGeometry = new BufferGeometry();
        return { 
          byId: new Map(), 
          rev: state.rev + 1,
          mergedGeometry: emptyGeometry
        };
      });
    },

    // Selection actions
    selectPoints: (count: number, callback: (data: SurfacePoint[]) => void, signal?: AbortSignal) => {
      const { fire, on, off } = get();
      
      fire(ViewerEvents.StatusMessage, {
        message: `Pick ${count == 1 ? "a point" : count + " points"}!`,
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
        } else {
          fire(ViewerEvents.StatusMessage, {
            message: `Pick ${count} points! (${surfacePoints.length} / ${count})`,
          });
        }
      };

      const onAbort = () => {
        cleanup();
        callback([]);
      };

      const cleanup = () => {
        off(ViewerEvents.SceneClicked, clickHandler);
        signal?.removeEventListener("abort", onAbort);
      };

      on(ViewerEvents.SceneClicked, clickHandler);
      signal?.addEventListener("abort", onAbort);

      return cleanup;
    },

    selectEdges: (count: number, callback: (data: Edge[]) => void, signal?: AbortSignal) => {
      const { fire, on, off } = get();
      
      fire(ViewerEvents.StatusMessage, {
        message: `Pick ${count == 1 ? "an edge" : count + " edges"}!`,
      });

      const edges: Edge[] = [];
      const clickHandler = ({
        guid,
        point,
      }: {
        guid: string;
        point: { x: number; y: number; z: number };
        normal: { x: number; y: number; z: number };
      }) => {
        edges.push({ guid, start: point, end: point });
        if (edges.length == count) {
          cleanup();
          callback(edges);
        } else {
          fire(ViewerEvents.StatusMessage, {
            message: `Pick ${count} edges! (${edges.length} / ${count})`,
          });
        }
      };

      const onAbort = () => {
        cleanup();
        callback([]);
      };

      const cleanup = () => {
        off(ViewerEvents.SceneClicked, clickHandler);
        signal?.removeEventListener("abort", onAbort);
      };
      
      on(ViewerEvents.SceneClicked, clickHandler);
      signal?.addEventListener("abort", onAbort);
      return cleanup;
    },

    selectFaces: (count: number, callback: (data: Face[]) => void, signal?: AbortSignal) => {
      const { fire, on, off } = get();
      
      fire(ViewerEvents.StatusMessage, {
        message: `Pick ${count == 1 ? "a face" : count + " faces"}!`,
      });

      const faces: Face[] = [];
      const clickHandler = ({
        guid,
        normal,
      }: {
        guid: string;
        point: { x: number; y: number; z: number };
        normal: { x: number; y: number; z: number };
      }) => {
        faces.push({ guid, outline: [], holes: [], normal });
        if (faces.length == count) {
          cleanup();
          callback(faces);
        } else {
          fire(ViewerEvents.StatusMessage, {
            message: `Pick ${count} faces! (${faces.length} / ${count})`,
          });
        }
      };

      const onAbort = () => {
        cleanup();
        callback([]);
      };

      const cleanup = () => {
        off(ViewerEvents.SceneClicked, clickHandler);
        signal?.removeEventListener("abort", onAbort);
      };
      
      on(ViewerEvents.SceneClicked, clickHandler);
      signal?.addEventListener("abort", onAbort);
      return cleanup;
    },

    // View management
    deleteView: (viewId: string) => {
      const { viewManager, fire } = get();
      viewManager.unregisterView(viewId);
      fire(ViewerEvents.ViewDeleted, { view: viewId });
    },

    setView: (viewId: string, animate: boolean = false) => {
      const { viewManager, fire } = get();
      const result = viewManager.setView(viewId, animate);
      fire(ViewerEvents.ViewChanged, { view: viewId });
      return result;
    },

    createView: (viewId: string, displayName?: string, settings?: ViewSettings) => {
      const { viewManager, fire } = get();
      
      // If viewId is a standard ViewType and no displayName/settings, just set the view
      if (typeof viewId === "string" && !displayName && !settings) {
        return viewManager.setView(viewId);
      }

      // Handle custom view creation
      if (
        typeof viewId === "string" &&
        typeof displayName === "string" &&
        settings
      ) {
        // Create a custom view class that extends BaseView
        class CustomView extends BaseView {
          readonly viewId: string = viewId;
          readonly displayName: string = displayName as string;

          getViewSettings(): ViewSettings {
            return settings as ViewSettings;
          }
        }

        // Register the view
        const customView = new CustomView();
        const registered = viewManager.setView(customView);

        if (registered) {
          // Notify about the view creation
          fire(ViewerEvents.ViewCreated, { view: viewId });
        }

        return registered;
      }

      // Invalid parameters
      console.warn("Invalid parameters for createView");
      return false;
    },

    resetView: (viewId: string, animate: boolean = false) => {
      const { viewManager, fire } = get();
      viewManager.resetView(viewId, animate);
      fire(ViewerEvents.ViewReset, { view: viewId });
    },

    resetAllViews: () => {
      const { viewManager, fire } = get();
      viewManager.resetAllViews();
      fire(ViewerEvents.ViewReset, { view: "all" });
    },
    
    setCameraControlsRef: (ref: RefObject<CameraControls | null>) => {
      const { viewManager } = get();
      viewManager.setCameraControlsRef(ref);
    },
    
    // Views API
    views: {
      getAllViews: () => get().viewManager.getAllViews(),
      getView: (viewId: string) => get().viewManager.getView(viewId),
      getCurrentView: () => get().viewManager.getCurrentView(),
      getSavedCameraState: (viewId: string) => {
        const state = get().viewManager.getSavedCameraState(viewId);
        if (!state) return undefined;

        return {
          position: state.position,
          target: state.target,
          up: state.up,
          zoom: state.zoom ?? 1,
        };
      },
    },
  };
});

// Helper function to calculate merged geometry
function calculateMergedGeometry(state: { byId: Map<string, DTOEntity> }): BufferGeometry {
  const entities = Array.from(state.byId.values());
  if (entities.length === 0) return new BufferGeometry();
  
  const geoms = entities.map((e) => e.geometry());
  const merged = BufferGeometryUtils.mergeGeometries(geoms) ?? new BufferGeometry();

  let offset = 0;
  const faceMap: Record<number, string> = {};
  entities.forEach((entity) => {
    const geometry = entity.geometry();
    const faces = geometry.index
      ? geometry.index.count / 3
      : geometry.attributes.position.count / 3;

    for (let i = 0; i < faces; i++) {
      faceMap[offset + i] = entity.guid;
    }
    offset += faces;
  });
  merged.userData.faceMap = faceMap;
  return merged;
}
*/
