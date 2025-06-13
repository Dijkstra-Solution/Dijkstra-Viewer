import { ViewerAPI } from "../viewerapi/ViewerAPI";

export abstract class AbstractClient {
  protected ViewerAPI: ViewerAPI;

  constructor(framework: ViewerAPI) {
    this.ViewerAPI = framework;
    this.init();

    // framework.on(FrameworkEvents.EntitySelected, (guid) => {
    //   get entity with guid
    // });
  }

  protected abstract init(): void;
}
