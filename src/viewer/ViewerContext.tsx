import { createContext } from "react";
import { ViewerRef } from "./ViewerRef";

const ViewerContext = createContext<ViewerRef | null>(null);
export default ViewerContext;
