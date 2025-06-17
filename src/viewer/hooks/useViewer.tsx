import { useContext } from "react";
import ViewerContext from "../ViewerContext";

export function useViewer() {
  const context = useContext(ViewerContext);
  if (!context)
    throw new Error("useViewer must be used within a <ViewerProvider>");
  return context;
}
