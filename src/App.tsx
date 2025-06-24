import "./App.css";
import { ViewerProvider } from "./viewer/ViewerProvider";
import { Viewer } from "./viewer/Viewer";


function App() {
  return (
    <ViewerProvider>
      <Viewer />
    </ViewerProvider>
  );
}

export default App;
