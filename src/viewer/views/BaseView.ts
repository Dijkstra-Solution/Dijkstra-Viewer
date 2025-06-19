import { Vector3 } from "three";
import { CameraControls } from "@react-three/drei";

export interface ViewSettings {
  position: Vector3;
  target: Vector3;
  up: Vector3;
  constraints?: {
    azimuthRotateSpeed?: number;
    polarRotateSpeed?: number;
    truckSpeed?: number;
    dollySpeed?: number;
    draggingSmoothTime?: number;
    smoothTime?: number;
  };
}

/**
 * Base abstract class for all views
 * Custom views should extend this class
 */
export abstract class BaseView {
  /**
   * Unique identifier for the view
   */
  abstract readonly viewId: string;

  /**
   * Display name for the view
   */
  abstract readonly displayName: string;

  /**
   * Get view settings for camera positioning
   */
  abstract getViewSettings(): ViewSettings;

  /**
   * Apply the view to the camera controls
   * @param controls Camera controls to apply the view to
   * @param animate Whether to animate the transition
   */
  apply(controls: CameraControls, animate: boolean = false): void {
    const settings = this.getViewSettings();

    // Set camera position and target
    controls.setLookAt(
      settings.position.x,
      settings.position.y,
      settings.position.z,
      settings.target.x,
      settings.target.y,
      settings.target.z,
      animate
    );

    // Apply constraint settings if provided
    if (settings.constraints) {
      const c = settings.constraints;
      if (c.azimuthRotateSpeed !== undefined)
        controls.azimuthRotateSpeed = c.azimuthRotateSpeed;
      if (c.polarRotateSpeed !== undefined)
        controls.polarRotateSpeed = c.polarRotateSpeed;
      if (c.truckSpeed !== undefined) controls.truckSpeed = c.truckSpeed;
      if (c.dollySpeed !== undefined) controls.dollySpeed = c.dollySpeed;
      if (c.draggingSmoothTime !== undefined)
        controls.draggingSmoothTime = c.draggingSmoothTime;
      if (c.smoothTime !== undefined) controls.smoothTime = c.smoothTime;
    } else {
      // Default to normal control settings
      controls.azimuthRotateSpeed = 1.0;
      controls.polarRotateSpeed = 1.0;
      controls.truckSpeed = 1.0;
      controls.dollySpeed = 1.0;
      controls.draggingSmoothTime = 0;
    }
  }
}
