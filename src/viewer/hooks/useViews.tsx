import { useEffect, useState } from "react";
import { Events } from "@/viewerapi/Events";
import { BaseView } from "../views/BaseView";
import { useViewer } from "./useViewer";

/**
 * React hook that exposes an always-up-to-date list of registered views and the
 * currently active view id.
 *
 * The hook listens to the internal ViewCreated / ViewDeleted / ViewChanged
 * events that `ViewManager` fires via the viewer event-bus, therefore any
 * component that consumes this hook will automatically re-render whenever the
 * view list changes or another view becomes active – no manual `refreshTrigger`
 * bookkeeping is required.
 *
 * Example usage:
 * ```tsx
 * const { viewList, currentViewId } = useViews();
 * ```
 */
export function useViews() {
  const { views, on, off } = useViewer();
  
  const [viewList, setViewList] = useState<BaseView[]>(() => views.getAllViews());
  const [currentViewId, setCurrentViewId] = useState<string>(() => {
    const current = views.getCurrentView();
    return current ? current.viewId : "";
  });

  useEffect(() => {
    const syncViewList = () => setViewList([...views.getAllViews()]);
    const handleViewChanged = ({ view }: { view: string }) => setCurrentViewId(view);

    syncViewList();

    on(Events.ViewCreated, syncViewList);
    on(Events.ViewDeleted, syncViewList);
    on(Events.ViewChanged, handleViewChanged);

    return () => {
      off(Events.ViewCreated, syncViewList);
      off(Events.ViewDeleted, syncViewList);
      off(Events.ViewChanged, handleViewChanged);
    };
  }, [views, on, off]);

  return { viewList, currentViewId } as const;
}
