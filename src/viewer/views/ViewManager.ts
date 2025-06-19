import { MutableRefObject } from "react";
import { CameraControls } from "@react-three/drei";
import { BaseView } from "./BaseView";
import { PerspectiveView, TopView } from "./StandardViews";
import { Events, ViewType } from "@/viewerapi/Events";

/**
 * ViewManager - Manages views and view switching
 * 
 * Allows registering custom views and switching between them.
 * This is the central place for all view-related operations.
 */
export class ViewManager {
  private views: Map<string, BaseView> = new Map();
  private currentViewId: string = "perspective";
  private cameraControlsRef: MutableRefObject<CameraControls | null> | null = null;
  private fireEvent: <T extends keyof typeof Events>(event: T, payload: Record<string, unknown>) => void;

  constructor(fireEvent: <T extends keyof typeof Events>(event: T, payload: Record<string, unknown>) => void) {
    // Store the event firing function
    this.fireEvent = fireEvent;
    
    // Register standard views
    this.registerView(new PerspectiveView());
    this.registerView(new TopView());
  }

  /**
   * Set the camera controls reference
   */
  setCameraControlsRef(ref: MutableRefObject<CameraControls | null>): void {
    this.cameraControlsRef = ref;
  }

  /**
   * Register a new view
   * @param view The view to register
   * @returns True if the view was registered successfully, false if a view with the same ID already exists
   */
  registerView(view: BaseView): boolean {
    if (this.views.has(view.viewId)) {
      console.warn(`View with ID "${view.viewId}" is already registered.`);
      return false;
    }
    
    this.views.set(view.viewId, view);
    return true;
  }

  /**
   * Unregister a view by ID
   * @param viewId The ID of the view to unregister
   * @returns True if the view was unregistered, false if the view was not found
   */
  unregisterView(viewId: string): boolean {
    // Don't allow unregistering the standard views
    if (["perspective", "top", "parallel"].includes(viewId)) {
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
   * @param viewId The ID of the view to set or the view object itself
   * @param animate Whether to animate the transition to the new view
   * @returns True if the view was set, false if the view was not found
   */
  setView(viewId: string | BaseView, animate: boolean = false): boolean {
    // If a BaseView object was passed, use its ID
    const id = typeof viewId === 'string' ? viewId : viewId.viewId;
    
    // Get the view
    const view = this.views.get(id);
    if (!view) {
      console.warn(`View with ID "${id}" not found.`);
      return false;
    }
    
    // Check if camera controls are available
    if (!this.cameraControlsRef || !this.cameraControlsRef.current) {
      console.warn("Camera controls not available. Call setCameraControlsRef first.");
      return false;
    }
    
    // Apply the view
    view.apply(this.cameraControlsRef.current, animate);
    
    // Update current view
    this.currentViewId = id;
    
    // Fire view changed event
    this.fireEvent(Events.ViewChanged, { view: id as ViewType });
    
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
  topView(animate: boolean = false): boolean {
    return this.setView("top", animate);
  }

  /**
   * Convenience method for setting perspective view
   * @param animate Whether to animate the transition
   */
  perspectiveView(animate: boolean = false): boolean {
    return this.setView("perspective", animate);
  }
}
