import "./App.css";
import { Viewer } from "./viewer/Viewer";
import { ViewerProvider } from "./viewer/ViewerProvider";
import { ClientBase } from "./client/ClientBase";
import { ViewerAPI } from "./viewerapi/ViewerAPI";


class MyClient extends ClientBase {
  constructor() {
    super(api);
  }

  protected init(): void {
    // TODO: Implement init logic
  }
}
const api = new ViewerAPI();
const client = new MyClient();

function App() {

  return (
    <>
      <ViewerProvider>
          <div style={{ padding: '10px' }}>
            <button onClick={() => api.Views.topview()}>Top View</button>
            <button onClick={() => api.Views.parallelView()}>Parallel View</button>
            <button onClick={() => api.Views.perspectiveView()}>Perspective View</button>
          </div>
        
        
          <Viewer 
            client={client}
          />
      </ViewerProvider>
    </>
  );
}

export default App;
