import { Events, type ViewType } from "./Events";
import { Vector3 } from "three";
import type { CameraControls } from "@react-three/drei";
import type { ViewerAPI } from "./ViewerAPI";

type ViewSettings = {
  position: Vector3;
  target: Vector3;
  up: Vector3;
};

//Helper class to manage camera views in the 3D viewer
export class View {
  private static viewerAPI: ViewerAPI | null = null;
  private static currentView: ViewType = "perspective";
  private static cameraControlsRef: React.RefObject<CameraControls | null> | null = null;

  /**
   * Initialize the View module with the ViewerAPI instance
   * @param viewerAPI - The ViewerAPI instance
   */
  static initialize(viewerAPI: ViewerAPI) {
    View.viewerAPI = viewerAPI;
  }

  /**
   * Set the camera controls reference to be used for view changes
   * @param cameraControlsRef - Reference to the CameraControls component
   */
  static setCameraControlsRef(cameraControlsRef: React.RefObject<CameraControls | null>) {
    View.cameraControlsRef = cameraControlsRef;
  }

  /**
   * Get predefined settings for a specific view type
   * @param viewType - The type of view to get settings for
   * @returns The view settings with position, target and up vector
   */
  private static getViewSettings(viewType: ViewType): ViewSettings {
    switch (viewType) {
      case "top":
        return {
          position: new Vector3(0, 10, 0),
          target: new Vector3(0, 0, 0),
          up: new Vector3(0, 0, -1),
        };
      case "parallel":
        return {
          position: new Vector3(10, 5, 0),
          target: new Vector3(0, 0, 0),
          up: new Vector3(0, 1, 0),
        };
      case "perspective":
      default:
        return {
          position: new Vector3(5, 5, 5),
          target: new Vector3(0, 0, 0),
          up: new Vector3(0, 1, 0),
        };
    }
  }

  /**
   * Set the active view to the top view (looking down the Y-axis)
   */
  static topview() {
    View.setView("top");
  }

  /**
   * Set the active view to parallel view
   */
  static parallelView() {
    View.setView("parallel");
  }

  /**
   * Set the active view to perspective view
   */
  static perspectiveView() {
    View.setView("perspective");
  }

  /**
   * Set the active view by view type
   * @param viewType - The view type to set
   */
  static setView(viewType: ViewType) {
    if (!View.cameraControlsRef || !View.cameraControlsRef.current) {
      console.warn("Camera controls reference not set. Call setCameraControlsRef first.");
      return;
    }

    const settings = View.getViewSettings(viewType);
    const controls = View.cameraControlsRef.current;

    // Set camera position and target
    controls.setLookAt(
      settings.position.x,
      settings.position.y,
      settings.position.z,
      settings.target.x,
      settings.target.y,
      settings.target.z,
      false // animate
    );
    
    // Set rotation constraints based on view type
    if (viewType === "top") {
      // Top view - Disable rotation but allow panning/zooming
      controls.azimuthRotateSpeed = 0; // Disable horizontal rotation
      controls.polarRotateSpeed = 0;   // Disable vertical rotation
    }
    else {
      // Other views - Enable all controls
      controls.azimuthRotateSpeed = 1.0;
      controls.polarRotateSpeed = 1.0;
      controls.truckSpeed = 1.0;
      controls.dollySpeed = 1.0;
    }
    controls.draggingSmoothTime = 0;

    

    View.currentView = viewType;

    // Fire view changed event if API is available
    if (View.viewerAPI) {
      View.viewerAPI.fire(Events.ViewChanged, { view: viewType });
    }
  }

  /**
   * Get the current active view type
   * @returns The current view type
   */
  static getCurrentView(): ViewType {
    return View.currentView;
  }
}
