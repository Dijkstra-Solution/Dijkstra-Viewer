import { BaseView, ViewSettings } from "./BaseView";

/**
 * Standard Perspective View implementation
 */
export class PerspectiveView extends BaseView {
  readonly viewId: string = "perspective";
  readonly displayName: string = "Perspective";

  getViewSettings(): ViewSettings {
    return {
      position: [0, 0, 5],
      target: [0, 0, 0],
      up: [0, 1, 0],
      constraints: {
      }
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
      position: [0, 10, 0],
      target: [0, 0, 0],
      up: [0, 0, -1],
      useOrthographicCamera: true,
      constraints: {
        // Restrict rotation in top view
        azimuthRotateSpeed: 0,
        polarRotateSpeed: 0,
      },
    };
  }
}
