import { Events } from "@/viewerapi/Events";
import { useEventEmitter } from "./hooks/useEventEmitter";
import ViewerContext from "./ViewerContext";
import { ViewerRef } from "./ViewerRef";
import { DTOEntity } from "@/viewerapi/dto/DTOEntity";
import { useCallback, useMemo, useReducer } from "react";
import { BufferGeometryUtils } from "three/examples/jsm/Addons.js";
import { BufferGeometry } from "three";
import { ViewManager } from "./views/ViewManager";

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

  const selectPoints = useCallback(
    (count: number, callback: (pts: number[]) => void) => {
      const collectedPoints: number[][] = [];
      const clickHandler: (payload: { point: number[] }) => void = (payload: {
        point: number[];
      }) => {
        collectedPoints.push(payload.point);
        if (collectedPoints.length >= count) {
          if (clickHandler) off(Events.SceneClicked, clickHandler);
          const flatPoints = collectedPoints.flat();
          callback(flatPoints);
        }
      };
      on(Events.SceneClicked, clickHandler);
      return () => {
        if (clickHandler) off(Events.SceneClicked, clickHandler);
      };
    },
    [on, off]
  );

  const mergedGeometry = useMemo(() => {
    const entities = Array.from(state.byId.values());
    if (entities.length == 0) return new BufferGeometry();
    const geoms = entities.map((e) => e.geometry());
    return BufferGeometryUtils.mergeGeometries(geoms) ?? new BufferGeometry();
  }, [state.byId]);

  const actions = useMemo(
    () => ({
      SelectPoints: selectPoints,
      AddEntity: addEntity,
      RemoveEntity: removeEntity,
      ClearEntities: clearEntities,
    }),
    [selectPoints, addEntity, removeEntity, clearEntities]
  );
  //#endregion

  // Create ViewManager instance
  const viewManager = useMemo(() => {
    return new ViewManager(fire);
  }, [fire]);

  const api = useMemo<ViewerRef>(
    () => ({ on, off, fire, actions, mergedGeometry, viewManager }),
    [on, off, fire, actions, mergedGeometry, viewManager]
  );
  return (
    <ViewerContext.Provider value={api}>{children}</ViewerContext.Provider>
  );
}
