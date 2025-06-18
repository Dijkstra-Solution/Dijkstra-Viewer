import { Vector3 } from "three";
import { BaseView, ViewSettings } from "./BaseView";

/**
 * Standard Perspective View implementation
 */
export class PerspectiveView extends BaseView {
  readonly viewId: string = "perspective";
  readonly displayName: string = "Perspective";

  getViewSettings(): ViewSettings {
    return {
      position: new Vector3(5, 5, 5),
      target: new Vector3(0, 0, 0),
      up: new Vector3(0, 1, 0)
    };
  }
}

/**
 * Standard Top View implementation
 */
export class TopView extends BaseView {
  readonly viewId: string = "top";
  readonly displayName: string = "Top";

  getViewSettings(): ViewSettings {
    return {
      position: new Vector3(0, 10, 0),
      target: new Vector3(0, 0, 0),
      up: new Vector3(0, 0, -1),
      constraints: {
        // Restrict rotation in top view
        azimuthRotateSpeed: 0,
        polarRotateSpeed: 0,
        
      }
    };
  }
}

/**
 * Standard Parallel View implementation
 */
export class ParallelView extends BaseView {
  readonly viewId: string = "parallel";
  readonly displayName: string = "Parallel";

  getViewSettings(): ViewSettings {
    return {
      position: new Vector3(10, 5, 0),
      target: new Vector3(0, 0, 0),
      up: new Vector3(0, 1, 0)
    };
  }
}
