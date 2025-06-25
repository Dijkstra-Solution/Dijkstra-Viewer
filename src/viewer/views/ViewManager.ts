import { RefObject } from "react";
import * as THREE from "three";
import { CameraControls } from "@react-three/drei";
import { BaseView } from "./BaseView";
import { PerspectiveView, TopView } from "./StandardViews";
import { EventPayloads, Events, EventType } from "@/viewerapi/Events";

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
  /**
   * Stores the last known camera state (position / target / up) for every view.
   * This allows us to restore the exact camera when the user switches back to a
   * previously visited view.
   */
  private viewCameraStates: Map<
    string,
    { position: number[]; target: number[]; up: number[]; zoom?: number }
  > = new Map();
  private fireEvent: <T extends EventType>(
    event: T,
    payload: EventPayloads[T]
  ) => void;

  constructor(
    fireEvent: <T extends EventType>(
      event: T,
      payload: EventPayloads[T]
    ) => void
  ) {
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
    // Detach previous listener (if any)
    if (this.cameraControlsRef?.current) {
      this.cameraControlsRef.current.removeEventListener(
        "control",
        this.handleControlsChange
      );
    }

    this.cameraControlsRef = ref;

    // Attach to the new ref (if provided)
    if (this.cameraControlsRef?.current) {
      this.cameraControlsRef.current.addEventListener(
        "control",
        this.handleControlsChange
      );
    }
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
   * @param useDefaults If true, use default position/target values instead of saved state (default: false)
   * @returns True if the view was set/registered, false if an error occurred
   */
  setView(
    viewId: string | BaseView,
    animate: boolean = false,
    customSmoothTime?: number,
    activateView: boolean = true,
    useDefaults: boolean = false
  ): boolean {
    let id: string;
    let view: BaseView;

    // Handle different parameter types
    if (typeof viewId === "string") {
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

    // Persist state of the currently active view before we switch away
    if (this.cameraControlsRef?.current) {
      this.saveCurrentCameraState();
    }
    // console.log(
    //   `[ViewManager] Switching to view "${id}" (animate=${animate}, useDefaults=${useDefaults})`
    // );

    // Check if camera controls are available for activation
    if (!this.cameraControlsRef || !this.cameraControlsRef.current) {
      console.warn(
        "Camera controls not available. Call setCameraControlsRef first."
      );
      return false;
    }

    // Ellenőrizzük, hogy van-e már mentett állapot ehhez a nézethez
    const savedState = this.viewCameraStates.get(id);
    const hasState = savedState !== undefined;

    // Alkalmazzuk a view-t, de csak akkor állítjuk be az alapértelmezett pozíciókat, ha:
    // - useDefaults = true (explicit reset-et kértünk), VAGY
    // - nincs még mentett állapot (első aktiválás)
    view.apply(
      this.cameraControlsRef.current,
      animate,
      customSmoothTime,
      useDefaults || !hasState
    );

    // Ha van mentett állapot és NEM akarunk alapértelmezettet használni
    if (savedState && !useDefaults) {
      setTimeout(() => {
        if (this.cameraControlsRef?.current && this.currentViewId === id) {
          this.cameraControlsRef.current.setLookAt(
            savedState.position[0],
            savedState.position[1],
            savedState.position[2],
            savedState.target[0],
            savedState.target[1],
            savedState.target[2],
            false
          );
        }
      }, 1);

      // Ensure camera up vector is also restored
      const cam = this.cameraControlsRef.current.camera;
      cam.up.set(savedState.up[0], savedState.up[1], savedState.up[2]);
      if (
        savedState.zoom !== undefined &&
        cam instanceof THREE.OrthographicCamera
      ) {
        cam.zoom = savedState.zoom;
        cam.updateProjectionMatrix();
      }

      // Force update the controls to ensure settings are applied
      this.cameraControlsRef.current.update(0);
    }

    // Update current view
    this.currentViewId = id;

    // Fire view changed event
    this.fireEvent(Events.ViewChanged, { view: id });

    return true;
  }

  /**
   * Retrieves the saved camera state for a specific view.
   * @param viewId The ID of the view to retrieve the state for.
   * @returns The saved camera state for the specified view, or undefined if the view is not found.
   */
  getSavedCameraState(viewId: string) {
    return this.viewCameraStates.get(viewId);
  }

  /**
   * Get the current view
   * @returns The current view object
   */
  getCurrentView(): BaseView | undefined {
    return this.views.get(this.currentViewId);
  }

  /**
   * Reset a view to its default settings
   * @param viewId The view ID to reset
   * @param animate Whether to animate the transition
   * @returns True if successful
   */
  resetView(viewId: string, animate: boolean = false): boolean {
    return this.setView(viewId, animate, undefined, true, true); // Az utolsó true a useDefaults
  }

  /**
   * Reset all views to their default settings
   */
  resetAllViews(): void {
    this.viewCameraStates.clear();

    const currentView = this.getCurrentView();
    if (currentView) {
      this.resetView(currentView?.viewId, false);
    }
  }

  /**
   * Persists the camera state of the *currently active* view into the
   * `viewCameraStates` map. This function is used both when the user actively
   * moves the camera (via the `control` event) and right before we switch away
   * from a view so we don't lose its last state even if the user hasn't moved
   * the camera since the last `control` event.
   */
  private saveCurrentCameraState() {
    if (!this.cameraControlsRef?.current) {
      console.warn(
        "[ViewManager] Cannot save camera state: no camera controls reference"
      );
      return;
    }
    const controls = this.cameraControlsRef.current;
    const pos = new THREE.Vector3();
    const target = new THREE.Vector3();
    controls.getPosition(pos);
    controls.getTarget(target);

    // Get the current time for debugging purposes
    const timestamp = new Date().toISOString();

    // Determine what triggered this save (stack trace would be helpful)
    // const caller = new Error().stack?.split('\n')[2]?.trim() || 'unknown';

    const zoom =
      controls.camera instanceof THREE.OrthographicCamera
        ? controls.camera.zoom
        : undefined;

    // Create the state object
    const newState = {
      position: [pos.x, pos.y, pos.z],
      target: [target.x, target.y, target.z],
      up: [controls.camera.up.x, controls.camera.up.y, controls.camera.up.z],
      ...(zoom !== undefined ? { zoom } : {}),
      timestamp,
    };

    // Get the previous state for comparison
    // const prevState = this.viewCameraStates.get(this.currentViewId);

    // Save the new state
    this.viewCameraStates.set(this.currentViewId, newState);

    // console.log(`[ViewManager] Saved camera state for view "${this.currentViewId}"`, {
    //   caller,
    //   currentViewId: this.currentViewId,
    //   newState,
    //   changed: !prevState ? 'initial' :
    //     JSON.stringify(prevState.position) !== JSON.stringify(newState.position) ? true : false
    // });
  }

  private handleControlsChange = () => {
    this.saveCurrentCameraState();
  };
}
