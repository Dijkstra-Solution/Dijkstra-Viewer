import { Events } from "@/viewerapi/Events";
import { useEventEmitter } from "./hooks/useEventEmitter";
import ViewerContext from "./ViewerContext";
import { ViewerRef } from "./ViewerRef";
import { DTOEntity } from "@/viewerapi/dto/DTOEntity";
import { useCallback, useMemo, useReducer } from "react";
import { BufferGeometryUtils } from "three/examples/jsm/Addons.js";
import { mergeBufferGeometries } from "three/examples/jsm/utils/BufferGeometryUtils";
import { BufferGeometry } from "three";

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
  const [state, dispatch] = useReducer(reducer, { byId: new Map(), rev: 0 });

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
      fire(Events.StatusMessage, { message: `Select ${count} Points` });
    },
    [fire]
  );

  const mergedGeometry = useMemo(() => {
    const geoms = Array.from(state.byId.values()).map((e) =>
      e.geometry(state.rev)
    );
    console.log(state.rev);
    console.log(state.byId);
    if (geoms.length == 0) return new BufferGeometry();
    return BufferGeometryUtils.mergeGeometries(geoms);
  }, [state.rev]);

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

  const api = useMemo<ViewerRef>(
    () => ({ on, off, fire, actions, mergedGeometry }),
    [on, off, fire, actions, mergedGeometry]
  );
  return (
    <ViewerContext.Provider value={api}>{children}</ViewerContext.Provider>
  );
}
