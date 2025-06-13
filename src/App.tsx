import "./App.css";
import Viewer from "./viewer/Viewer";
import { ViewerAPI } from "./viewerapi/ViewerAPI";

function App() {
  const api: ViewerAPI = new ViewerAPI();
  return (
    <>
      <Viewer api={api}></Viewer>
    </>
  );
}

export default App;
