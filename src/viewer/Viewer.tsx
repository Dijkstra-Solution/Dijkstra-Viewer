import { Canvas } from "@react-three/fiber";
import { ClientBase } from "@/client/ClientBase";
import { useViewer } from "./hooks/useViewer";

function Viewer({ client: client }: { client: ClientBase }) {
  const { on, off, fire, actions } = useViewer();

  return <Canvas></Canvas>;
}

export { Viewer };
