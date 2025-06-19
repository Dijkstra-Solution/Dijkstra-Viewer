import { CameraControls } from "@react-three/drei";

export type CameraMode = 'perspective' | 'orthographic';

export interface ViewSettings {
  position: number[];
  target: number[];
  up: number[];
  useOrthographicCamera?: boolean;
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
      settings.position[0],
      settings.position[1],
      settings.position[2],
      settings.target[0],
      settings.target[1],
      settings.target[2],
      animate
    );
    
    // Always reset to default control settings first
    // This ensures previous view constraints don't persist
    controls.azimuthRotateSpeed = 1.0;
    controls.polarRotateSpeed = 1.0;
    controls.truckSpeed = 1.0;
    controls.dollySpeed = 1.0;
    controls.draggingSmoothTime = 0;
    
    //Camera projection type (orthographic or perspective)
    if (settings.useOrthographicCamera !== undefined) {
      // Create a type-safe custom event for camera mode change
      const cameraMode: CameraMode = settings.useOrthographicCamera ? 'orthographic' : 'perspective';
      
      // Store the camera mode preference in a custom property
      // We use a Symbol-based property to avoid conflicts
      const cameraModeSymbol = Symbol.for('cameraModePreference');
      Object.defineProperty(controls, cameraModeSymbol, {
        value: cameraMode,
        writable: true,
        enumerable: false
      });
      
      // Fire an event that the Viewer component can listen to for camera type change
      const event = new CustomEvent('cameraTypeChange', { 
        detail: { 
          useOrthographic: settings.useOrthographicCamera,
          cameraMode 
        } 
      });
      document.dispatchEvent(event);
      
      // Update projection matrix
      controls.camera.updateProjectionMatrix();
    }
    
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
    }
  }
}
