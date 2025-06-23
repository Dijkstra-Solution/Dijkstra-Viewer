import { Events } from "@/viewerapi/Events";
import { useEventEmitter } from "./hooks/useEventEmitter";
import ViewerContext from "./ViewerContext";
import { ViewerRef } from "./ViewerRef";
import { DTOEntity } from "@/viewerapi/dto/DTOEntity";
import { useCallback, useMemo, useReducer, useRef } from "react";
import { BufferGeometryUtils } from "three/examples/jsm/Addons.js";
import { BufferGeometry } from "three";
import { ViewManager } from "./views/ViewManager";
import { Edge, Face, SurfacePoint } from "./ViewerActions";
import { BaseView, ViewSettings } from "./views/BaseView";

type State = {
  byId: Map<string, DTOEntity>;
  rev: number;
};

type GeometryAction =
  | { type: "add"; entity: DTOEntity }
  | { type: "remove"; guid: string }
  | { type: "clear" };

function reducer(state: State, action: GeometryAction): State {
  const { byId, rev } = state;

  switch (action.type) {
    case "add": {
      if (byId.has(action.entity.guid)) return state;
      const next = new Map(byId);
      next.set(action.entity.guid, action.entity);
      return { byId: next, rev: rev + 1 };
    }
    case "remove": {
      if (!byId.has(action.guid)) return state;
      const next = new Map(byId);
      next.delete(action.guid);
      return { byId: next, rev: rev + 1 };
    }
    case "clear":
      return { byId: new Map(), rev: rev + 1 };
    default:
      return state;
  }
}
export function ViewerProvider({ children }: { children: React.ReactNode }) {
  const { on, off, fire } = useEventEmitter();
  const [state, dispatch] = useReducer(reducer, {
    byId: new Map<string, DTOEntity>(),
    rev: 0,
  });

  // Create ViewManager instance first
  const viewManager = useRef(new ViewManager(fire));

  //#region ViewerActions
  const addEntity = useCallback((entity: DTOEntity) => {
    dispatch({ type: "add", entity: entity });
  }, []);

  const removeEntity = useCallback((guid: string) => {
    dispatch({ type: "remove", guid: guid });
  }, []);

  const clearEntities = useCallback(() => {
    dispatch({ type: "clear" });
  }, []);

  //TODO - cancellation logic
  const selectPoints = useCallback(
    (
      count: number,
      callback: (data: SurfacePoint[]) => void,
      signal?: AbortSignal
    ) => {
      fire(Events.StatusMessage, {
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
          fire(Events.StatusMessage, {
            message: `Pick ${count} points! (${surfacePoints.length} / ${count})`,
          });
        }
      };

      const onAbort = () => {
        cleanup();
        callback([]);
      };

      const cleanup = () => {
        off(Events.SceneClicked, clickHandler);
        signal?.removeEventListener("abort", onAbort);
      };

      on(Events.SceneClicked, clickHandler);
      signal?.addEventListener("abort", onAbort);

      return cleanup;
    },
    [on, off, fire]
  );

  const selectEdges = useCallback(
    (count: number, callback: (data: Edge[]) => void, signal?: AbortSignal) => {
      fire(Events.StatusMessage, {
        message: `Pick ${count == 1 ? "an edge" : count + " edges"}!`,
      });

      // fire(PrivateEvents.SelectionModeChanged, { mode: SelectionMode.EDGE });  //TODO

      const edges: Edge[] = [];
      const clickHandler = ({
        guid,
        point,
        normal,
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
          fire(Events.StatusMessage, {
            message: `Pick ${count} edges! (${edges.length} / ${count})`,
          });
        }
      };

      const onAbort = () => {
        cleanup();
        callback([]);
      };

      const cleanup = () => {
        off(Events.SceneClicked, clickHandler);
        signal?.removeEventListener("abort", onAbort);
      };
      //TODO - click should retrieve edge instead of point - new (private?) event
      on(Events.SceneClicked, clickHandler);
      signal?.addEventListener("abort", onAbort);
      return cleanup;
    },
    [on, off, fire]
  );

  const selectFaces = useCallback(
    (count: number, callback: (data: Face[]) => void, signal?: AbortSignal) => {
      fire(Events.StatusMessage, {
        message: `Pick ${count == 1 ? "a face" : count + " faces"}!`,
      });

      const faces: Face[] = [];
      const clickHandler = ({
        guid,
        point,
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
          fire(Events.StatusMessage, {
            message: `Pick ${count} faces! (${faces.length} / ${count})`,
          });
        }
      };

      const onAbort = () => {
        cleanup();
        callback([]);
      };

      const cleanup = () => {
        off(Events.SceneClicked, clickHandler);
        signal?.removeEventListener("abort", onAbort);
      };
      //TODO - click should retrieve face instead of point
      on(Events.SceneClicked, clickHandler);
      signal?.addEventListener("abort", onAbort);
      return cleanup;
    },
    [on, off, fire]
  );

  const mergedGeometry = useMemo(() => {
    const entities = Array.from(state.byId.values());
    if (entities.length == 0) return new BufferGeometry();
    const geoms = entities.map((e) => e.geometry());
    const merged =
      BufferGeometryUtils.mergeGeometries(geoms) ?? new BufferGeometry();

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
  }, [state.byId]);

  /*########
  View creation actions
  #########*/
  const deleteView = useCallback(
    (viewId: string) => {
      viewManager.current.unregisterView(viewId);
      fire(Events.ViewDeleted, { view: viewId });
    },
    [viewManager, fire]
  );
  const setView = useCallback(
    (viewId: string, animate: boolean = false) => {
      viewManager.current.setView(viewId, animate);
      fire(Events.ViewChanged, { view: viewId });
    },
    [viewManager, fire]
  );
  const createView = useCallback(
    (viewId: string, displayName?: string, settings?: ViewSettings) => {
      // If viewId is a standard ViewType and no displayName/settings, just set the view
      if (typeof viewId === "string" && !displayName && !settings) {
        return viewManager.current.setView(viewId);
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
        const registered = viewManager.current.setView(customView);

        if (registered) {
          // Notify about the view creation
          fire(Events.ViewCreated, { view: viewId });
        }

        return registered;
      }

      // Invalid parameters
      console.warn("Invalid parameters for createView");
      return false;
    },
    [viewManager, fire]
  );

  const actions = useMemo(
    () => ({
      SelectPoints: selectPoints,
      SelectEdges: selectEdges,
      SelectFaces: selectFaces,

      AddEntity: addEntity,
      RemoveEntity: removeEntity,
      ClearEntities: clearEntities,
      SetView: setView,
      CreateView: createView,
      DeleteView: deleteView,
    }),
    [
      selectPoints,
      selectEdges,
      selectFaces,
      addEntity,
      removeEntity,
      clearEntities,
      setView,
      createView,
      deleteView,
    ]
  );
  //#endregion

  const api = useMemo<ViewerRef>(
    () => ({
      on,
      off,
      fire,
      actions,
      mergedGeometry,
      views: {
        // View retrieval
        getAllViews: () => viewManager.current.getAllViews(),
        getView: (viewId: string) => viewManager.current.getView(viewId),
        getCurrentView: () => viewManager.current.getCurrentView(),

        deleteView: (viewId: string) =>
          viewManager.current.unregisterView(viewId),

        // Internal API
        setCameraControlsRef: (ref) =>
          viewManager.current.setCameraControlsRef(ref),
      },
    }),
    [on, off, fire, actions, mergedGeometry, viewManager]
  );
  return (
    <ViewerContext.Provider value={api}>{children}</ViewerContext.Provider>
  );
}
