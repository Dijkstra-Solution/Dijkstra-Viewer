import { CameraControls } from "@react-three/drei";

/**
 * Camera mode types
 */
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
   * @param customSmoothTime Optional custom smooth time value for the animation (overrides settings)
   */

  //TODO - Animate
  /**
   * Apply the view settings to the given camera controls.
   * 
   * This method configures the camera controls based on the view settings,
   * including position, target, and constraints. It handles both perspective
   * and orthographic camera modes and ensures proper transitions between views
   * by applying default constraints and overriding them with view-specific ones.
   * 
   * @param controls The camera controls to apply the view to.
   * @param animate Whether to animate the transition to the new view.
   * @param customSmoothTime Optional custom smooth time for animation, 
   *                         overriding default or constraint values.
   */
  apply(controls: CameraControls, animate: boolean = false, customSmoothTime?: number): void {
    const settings = this.getViewSettings();
    
    // Define symbol for camera mode storage
    const modeSymbol = Symbol.for('preferredCameraMode');
    
    // Get the current and new camera mode
    // We need to use a type assertion but avoid using 'any'
    const controlsWithSymbol = controls as unknown as Record<symbol, unknown>;
    const currentMode = controlsWithSymbol[modeSymbol] as string | undefined;
    const newMode = settings.useOrthographicCamera ? 'orthographic' : 'perspective';
    
    // Check if we're changing camera types
    const isChangingCameraType = 
      settings.useOrthographicCamera !== undefined && 
      currentMode !== undefined && 
      currentMode !== newMode;
    
    // Force animation off when switching camera types as this causes issues
    let shouldAnimate = animate;
    if (isChangingCameraType) {
      console.log('Camera type change detected, disabling animation');
      shouldAnimate = false;
    }
    
    // For proper view transitions, we need to ensure all constraints are either:
    // 1. Explicitly set by the new view, or
    // 2. Reset to standard values if not specified
    // This approach ensures no settings from previous views persist unintentionally
    
    if (shouldAnimate) {
      // For animation, set the smooth time - custom value takes precedence
      if (customSmoothTime !== undefined) {
        // Use the custom smooth time provided in the method call
        controls.smoothTime = customSmoothTime;
      } else if (settings.constraints?.smoothTime !== undefined) {
        // Otherwise use smooth time from constraints if available
        controls.smoothTime = settings.constraints.smoothTime;
      }
      
      // Then do the animated camera movement
      controls.setLookAt(
        settings.position[0],
        settings.position[1],
        settings.position[2],
        settings.target[0],
        settings.target[1],
        settings.target[2],
        true
      );
    } else {
      // When not animating, move instantly
      controls.setLookAt(
        settings.position[0],
        settings.position[1],
        settings.position[2],
        settings.target[0],
        settings.target[1],
        settings.target[2],
        false
      );
    }
    
    // The camera type (orthographic or perspective) is handled at the Viewer level
    // through the ViewChanged event. No custom events needed here.
    if (settings.useOrthographicCamera !== undefined) {
      // Store camera mode as a property on controls for debugging/reference
      // Using a Symbol to avoid name collisions
      Object.defineProperty(controls, modeSymbol, {
        value: newMode,
        enumerable: false,
        configurable: true
      });
    }
    
    // We need to apply ALL standard defaults first, then override with view-specific settings
    // This prevents inheriting constraints from the previous view
    
    // Apply default constraints (these match drei CameraControls defaults)
    controls.azimuthRotateSpeed = 1.0;
    controls.polarRotateSpeed = 1.0;
    controls.truckSpeed = 1.0;
    controls.dollySpeed = 1.0;
    controls.draggingSmoothTime = 0;
    controls.smoothTime = 0;
    
    // Then apply view-specific constraint settings if provided
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
