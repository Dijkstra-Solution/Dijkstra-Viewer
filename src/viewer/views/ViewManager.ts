import { RefObject } from "react";
import { CameraControls } from "@react-three/drei";
import { BaseView } from "./BaseView";
import { PerspectiveView, TopView } from "./StandardViews";
import { Events } from "@/viewerapi/Events";

/**
 * ViewManager - Manages views and view switching
 * 
 * Allows registering custom views and switching between them.
 * This is the central place for all view-related operations.
 */
export class ViewManager {
  private views: Map<string, BaseView> = new Map();
  private currentViewId: string = "perspective";
  private cameraControlsRef: RefObject<CameraControls | null> | null = null;
  private fireEvent: <T extends keyof typeof Events>(event: T, payload: Record<string, unknown>) => void;

  constructor(fireEvent: <T extends keyof typeof Events>(event: T, payload: Record<string, unknown>) => void) {
    // Store the event firing function
    this.fireEvent = fireEvent;
    
    // Register standard views
    this.setView(new PerspectiveView(), false, undefined, false);
    this.setView(new TopView(), false, undefined, false);
  }

  /**
   * Set the camera controls reference
   */
  setCameraControlsRef(ref: RefObject<CameraControls | null>): void {
    this.cameraControlsRef = ref;
  }

  /**
   * Register a new view
   * @param view The view to register
   * @returns True if the view was registered successfully, false if a view with the same ID already exists
   * @deprecated Use setView with a BaseView object instead
   */
  registerView(view: BaseView): boolean {
    return this.setView(view, false, undefined, false);
  }

  /**
   * Unregister a view by ID
   * @param viewId The ID of the view to unregister
   * @returns True if the view was unregistered, false if the view was not found
   */
  unregisterView(viewId: string): boolean {
    // Don't allow unregistering the standard views
    if (["perspective", "top"].includes(viewId)) {
      console.warn(`Cannot unregister standard view "${viewId}".`);
      return false;
    }
    
    return this.views.delete(viewId);
  }

  /**
   * Get a view by ID
   * @param viewId The ID of the view to get
   * @returns The view or undefined if not found
   */
  getView(viewId: string): BaseView | undefined {
    return this.views.get(viewId);
  }

  /**
   * Get all registered views
   * @returns All registered views
   */
  getAllViews(): BaseView[] {
    return Array.from(this.views.values());
  }

  /**
   * Set the current view
   * 
   * This function combines registering and setting views. If passed:
   * - String viewId: Sets the specified view as current (must already be registered)
   * - BaseView object: Registers the view if needed, then sets it as current
   * 
   * @param viewId The ID of the view to set or the view object itself
   * @param animate Whether to animate the transition to the new view
   * @param customSmoothTime Optional custom smooth time value for the animation (overrides settings)
   * @param activateView If false, the view will only be registered but not activated (default: true)
   * @returns True if the view was set/registered, false if an error occurred
   */
  setView(viewId: string | BaseView, animate: boolean = false, customSmoothTime?: number, activateView: boolean = true): boolean {
    let id: string;
    let view: BaseView;
    
    // Handle different parameter types
    if (typeof viewId === 'string') {
      // String ID case - view must already be registered
      id = viewId;
      const existingView = this.views.get(id);
      if (!existingView) {
        console.warn(`View with ID "${id}" not found.`);
        return false;
      }
      view = existingView;
    } else {
      // BaseView object case - register it if needed
      view = viewId;
      id = view.viewId;
      
      // Register the view if it doesn't exist yet
      if (!this.views.has(id)) {
        this.views.set(id, view);
      }
    }
    
    // If we only want to register but not activate the view
    if (!activateView) {
      return true;
    }
    
    // Check if camera controls are available for activation
    if (!this.cameraControlsRef || !this.cameraControlsRef.current) {
      console.warn("Camera controls not available. Call setCameraControlsRef first.");
      return false;
    }
    
    // Apply the view
    view.apply(this.cameraControlsRef.current, animate, customSmoothTime);
    
    // Update current view
    this.currentViewId = id;
    
    // Fire view changed event
    this.fireEvent(Events.ViewChanged, { view: id });
    
    return true;
  }

  /**
   * Get the current view
   * @returns The current view object
   */
  getCurrentView(): BaseView | undefined {
    return this.views.get(this.currentViewId);
  }

  /**
   * Get the current view ID
   * @returns The current view ID
   */
  getCurrentViewId(): string {
    return this.currentViewId;
  }

  /**
   * Convenience method for setting top view
   * @param animate Whether to animate the transition
   */
  topView(animate: boolean = false, customSmoothTime?: number): boolean {
    return this.setView("top", animate, customSmoothTime);
  }

  /**
   * Convenience method for setting perspective view
   * @param animate Whether to animate the transition
   */
  perspectiveView(animate: boolean = false, customSmoothTime?: number): boolean {
    return this.setView("perspective", animate, customSmoothTime);
  }
}
