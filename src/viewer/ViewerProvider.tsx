import { Events } from "@/viewerapi/Events";
import { useEventEmitter } from "./hooks/useEventEmitter";
import ViewerContext from "./ViewerContext";
import { ViewerRef } from "./ViewerRef";
import { DTOEntity } from "@/viewerapi/dto/DTOEntity";
import { useCallback, useMemo, useReducer, useRef } from "react";
import { BufferGeometryUtils } from "three/examples/jsm/Addons.js";
import { BufferGeometry } from "three";
import { ViewManager } from "./views/ViewManager";
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
      callback: (data: {
        guids: string[];
        points: number[];
        normals: number[];
      }) => void,
      signal?: AbortSignal
    ) => {
      const guids: string[] = [];
      const points: number[][] = [];
      const normals: number[][] = [];

      fire(Events.StatusMessage, {
        message: `Pick ${count == 1 ? "a point" : count + " points"}!`,
      });

      const clickHandler = ({
        guid,
        point,
        normal,
      }: {
        guid: string;
        point: number[];
        normal: number[];
      }) => {
        guids.push(guid);
        points.push(point);
        normals.push(normal);
        if (points.length == count) {
          cleanup();
          callback({
            guids: guids,
            points: points.flat(),
            normals: normals.flat(),
          });
        } else {
          fire(Events.StatusMessage, {
            message: `Pick ${count} points! (${points.length} / ${count})`,
          });
        }
      };

      const onAbort = () => {
        cleanup();
        callback({
          guids: [],
          points: [],
          normals: [],
        });
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
      const result = viewManager.current.setView(viewId, animate);
      return result;
    },
    [viewManager]
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
      AddEntity: addEntity,
      RemoveEntity: removeEntity,
      ClearEntities: clearEntities,
      SetView: setView,
      CreateView: createView,
      DeleteView: deleteView,
    }),
    [
      selectPoints,
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

        // Internal API
        setCameraControlsRef: (ref) => viewManager.current.setCameraControlsRef(ref),
        getSavedCameraState: (viewId) => {
          const state = viewManager.current.getSavedCameraState(viewId);
          // Return undefined if no state exists
          if (!state) return undefined;

          return {
            position: state.position,
            target: state.target,
            up: state.up,
            zoom: state.zoom ?? 1
          };
        },
      },
    }),
    [on, off, fire, actions, mergedGeometry, viewManager]
  );
  return (
    <ViewerContext.Provider value={api}>{children}</ViewerContext.Provider>
  );
}
