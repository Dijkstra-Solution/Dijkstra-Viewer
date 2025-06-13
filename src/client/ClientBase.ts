import { ViewerAPI } from "../viewerapi/ViewerAPI";

abstract class ClientBase {
  protected ViewerAPI: ViewerAPI;

  constructor(api: ViewerAPI) {
    this.ViewerAPI = api;
    this.init();
  }

  protected abstract init(): void;
}

export { ClientBase };
