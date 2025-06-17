function unbound() {
  throw new Error("Not bound to viewer!");
}

export const viewerActions = {
  SelectPoints: unbound as (
    count: number,
    callback: (pts: number[]) => void
  ) => void,
};

export type ViewerActions = typeof viewerActions;
