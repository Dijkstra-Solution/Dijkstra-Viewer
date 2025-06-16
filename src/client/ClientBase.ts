import { ViewerAPI } from "../viewerapi/ViewerAPI";

abstract class ClientBase {
  readonly ViewerAPI: ViewerAPI;

  constructor(api: ViewerAPI) {
    this.ViewerAPI = api;
    this.init();
  }

  protected abstract init(): void;
}

export { ClientBase };
