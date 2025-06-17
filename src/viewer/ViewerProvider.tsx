import { Events } from "@/viewerapi/Events";
import { useEventEmitter } from "./hooks/useEventEmitter";
import ViewerContext from "./ViewerContext";
import { ViewerRef } from "./ViewerRef";

export function ViewerProvider({ children }: { children: React.ReactNode }) {
  const { on, off, fire } = useEventEmitter();
  const actions = {
    SelectPoints: (count: number, callback: (pts: number[]) => void) =>
      fire(Events.StatusMessage, { message: `Select ${count} Points` }),
  };

  const api: ViewerRef = { on, off, fire, actions };
  return (
    <ViewerContext.Provider value={api}>{children}</ViewerContext.Provider>
  );
}
