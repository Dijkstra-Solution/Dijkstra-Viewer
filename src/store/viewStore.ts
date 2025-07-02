import { create } from "zustand";
import { CameraControls } from "@react-three/drei";

/**
 * Camera mode types
 */
export type CameraMode = "perspective" | "orthographic";

/**
 * View settings interface
 */
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
 * Base abstract view interface for the store
 */
export interface IBaseView {
  viewId: string;
  displayName: string;
  getViewSettings(): ViewSettings;
  applyConstraints(controls: CameraControls): void;
  apply(
    controls: CameraControls,
    animate?: boolean,
    customSmoothTime?: number,
    useDefaults?: boolean
  ): void;
}

/**
 * View data structure to be stored in the state
 */
export interface ViewData {
  viewId: string;
  displayName: string;
  settings: ViewSettings;
  defaultSettings: ViewSettings;
  customState?: Record<string, unknown>;
}

/**
 * ViewStore state and actions
 */
export type ViewStore = {
  // State
  views: Map<string, ViewData>;
  currentViewId: string | null;
  defaultSettings: ViewSettings;

  // Actions - View Management
  registerView: (view: ViewData) => void;
  unregisterView: (viewId: string) => void;
  setCurrentView: (viewId: string, animate?: boolean) => boolean;
  resetView: (viewId: string, animate?: boolean) => void;
  resetAllViews: () => void;
  getAllViews: () => ViewData[];
  getView: (viewId: string) => ViewData | undefined;
  getCurrentView: () => ViewData | undefined;

  // Actions - View Settings
  updateViewSettings: (viewId: string, settings: Partial<ViewSettings>) => void;
  setOrthographicCamera: (viewId: string, useOrthographic: boolean) => void;
  updateViewPosition: (
    viewId: string,
    position: number[],
    target: number[],
    up?: number[]
  ) => void;
  updateConstraints: (
    viewId: string,
    constraints: Partial<ViewSettings["constraints"]>
  ) => void;

  // Camera Controls Interaction
  applyToCamera: (
    controls: CameraControls,
    viewId?: string,
    animate?: boolean,
    customSmoothTime?: number,
    useDefaults?: boolean
  ) => void;
};

/**
 * Implementation of BaseView's apply method as a utility function
 */
function applyViewToCamera(
  settings: ViewSettings,
  controls: CameraControls,
  animate: boolean = false,
  customSmoothTime?: number,
  useDefaults: boolean = true
): void {
  // Define symbol for camera mode storage
  const modeSymbol = Symbol.for("preferredCameraMode");

  // Get the current and new camera mode
  const controlsWithSymbol = controls as unknown as Record<symbol, unknown>;
  const currentMode = controlsWithSymbol[modeSymbol] as string | undefined;
  const newMode = settings.useOrthographicCamera
    ? "orthographic"
    : "perspective";

  // Check if we're changing camera types
  const isChangingCameraType =
    settings.useOrthographicCamera !== undefined &&
    currentMode !== undefined &&
    currentMode !== newMode;

  // Force animation off when switching camera types as this causes issues
  let shouldAnimate = animate;
  if (isChangingCameraType) {
    // console.log('Camera type change detected, disabling animation');
    shouldAnimate = false;
  }

  // Only set position and target if useDefaults is true
  if (useDefaults) {
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
  }

  // The camera type (orthographic or perspective) is handled at the Viewer level
  // through the ViewChanged event. No custom events needed here.
  if (settings.useOrthographicCamera !== undefined) {
    // Store camera mode as a property on controls for debugging/reference
    // Using a Symbol to avoid name collisions
    Object.defineProperty(controls, modeSymbol, {
      value: newMode,
      enumerable: false,
      configurable: true,
    });
  }

  // Always apply constraints
  applyConstraintsToCamera(settings, controls);
}

/**
 * Implementation of BaseView's applyConstraints method as a utility function
 */
function applyConstraintsToCamera(
  settings: ViewSettings,
  controls: CameraControls
): void {
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

/**
 * Create the ViewStore with Zustand
 */
export const useViewStore = create<ViewStore>((set, get) => ({
  // Initial State
  views: new Map<string, ViewData>([
    [
      "perspective",
      {
        viewId: "perspective",
        displayName: "Perspective",
        settings: {
          position: [0, 0, 5],
          target: [0, 0, 0],
          up: [0, 1, 0],
        },
        defaultSettings: {
          position: [0, 0, 5],
          target: [0, 0, 0],
          up: [0, 1, 0],
        },
      },
    ],
    [
      "top",
      {
        viewId: "top",
        displayName: "Top",
        settings: {
          position: [0, 10, 0],
          target: [0, 0, 0],
          up: [0, 0, -1],
          useOrthographicCamera: true,
          constraints: {
            azimuthRotateSpeed: 0,
            polarRotateSpeed: 0,
          },
        },
        defaultSettings: {
          position: [0, 10, 0],
          target: [0, 0, 0],
          up: [0, 0, -1],
          useOrthographicCamera: true,
          constraints: {
            azimuthRotateSpeed: 0,
            polarRotateSpeed: 0,
          },
        },
      },
    ],
  ]),

  currentViewId: null,
  defaultSettings: {
    position: [0, 0, 5],
    target: [0, 0, 0],
    up: [0, 1, 0],
    useOrthographicCamera: false,
    constraints: {
      azimuthRotateSpeed: 1.0,
      polarRotateSpeed: 1.0,
      truckSpeed: 1.0,
      dollySpeed: 1.0,
      draggingSmoothTime: 0,
      smoothTime: 0,
    },
  },
  // View Management Methods
  registerView: (view) => {
    set((state) => ({
      ...state,
      views: new Map(state.views).set(view.viewId, view),
      currentViewId:
        state.currentViewId === null ? view.viewId : state.currentViewId,
    }));
  },

  unregisterView: (viewId) => {
    set((state) => {
      if (!state.views.has(viewId)) {
        console.warn(`View with id ${viewId} does not exist`);
        return state;
      }

      const newViews = new Map(state.views);
      newViews.delete(viewId);

      let newCurrentViewId = state.currentViewId;
      if (state.currentViewId === viewId) {
        const ids = Array.from(newViews.keys());
        newCurrentViewId = ids.length ? ids[0] : null;
      }

      return {
        ...state,
        views: newViews,
        currentViewId: newCurrentViewId,
      };
    });
  },

  setCurrentView: (viewId: string) => {
    const state = get();
    const view = state.views.get(viewId);
    if (!view) {
      console.warn(`View with id ${viewId} does not exist`);
      return false;
    }

    set({ currentViewId: viewId });
    return true;
  },

  resetView: (viewId: string) => {
    set((state) => {
      const view = state.views.get(viewId);
      if (!view) return state;

      const updatedView = {
        ...view,
        settings: { ...view.defaultSettings },
      };

      const newViews = new Map(state.views);
      newViews.set(viewId, updatedView);

      return {
        ...state,
        views: newViews,
      };
    });
  },

  resetAllViews: () => {
    const { views } = get();
    const newViews = new Map();

    views.forEach((view, viewId) => {
      newViews.set(viewId, {
        ...view,
        settings: { ...view.defaultSettings },
      });
    });

    set((state) => ({
      ...state,
      views: newViews,
    }));
  },

  getAllViews: () => {
    return Array.from(get().views.values());
  },

  getView: (viewId) => {
    return get().views.get(viewId);
  },

  getCurrentView: () => {
    const { currentViewId, views } = get();
    return currentViewId ? views.get(currentViewId) : undefined;
  },

  // View Settings Methods
  updateViewSettings: (viewId, settings) => {
    set((state) => {
      const view = state.views.get(viewId);
      if (!view) return state;

      const updatedView = {
        ...view,
        settings: { ...view.settings, ...settings },
      };

      const newViews = new Map(state.views);
      newViews.set(viewId, updatedView);

      return {
        ...state,
        views: newViews,
      };
    });
  },

  setOrthographicCamera: (viewId, useOrthographic) => {
    set((state) => {
      const view = state.views.get(viewId);
      if (!view) return state;

      const updatedView = {
        ...view,
        settings: {
          ...view.settings,
          useOrthographicCamera: useOrthographic,
        },
      };

      const newViews = new Map(state.views);
      newViews.set(viewId, updatedView);

      return {
        ...state,
        views: newViews,
      };
    });
  },

  updateViewPosition: (viewId, position, target, up) => {
    set((state) => {
      const view = state.views.get(viewId);
      if (!view) return state;

      const updatedView = {
        ...view,
        settings: {
          ...view.settings,
          position: [...position],
          target: [...target],
          up: [...(up ?? [0, 1, 0])],
        },
      };

      const newViews = new Map(state.views);
      newViews.set(viewId, updatedView);

      return {
        ...state,
        views: newViews,
      };
    });
  },

  updateConstraints: (viewId, constraints) => {
    set((state) => {
      const view = state.views.get(viewId);
      if (!view) return state;

      const updatedSettings = { ...view.settings };
      updatedSettings.constraints = {
        ...updatedSettings.constraints,
        ...constraints,
      };

      // Apply any top-level constraint properties
      [
        "azimuthRotateSpeed",
        "polarRotateSpeed",
        "truckSpeed",
        "dollySpeed",
        "draggingSmoothTime",
        "smoothTime",
      ].forEach((prop) => {
        const key = prop as keyof typeof constraints;
        if (constraints![key] !== undefined) {
          const settingsKey = prop as keyof ViewSettings;
          updatedSettings[settingsKey] = constraints![key];
        }
      });

      const updatedView = {
        ...view,
        settings: updatedSettings,
      };

      const newViews = new Map(state.views);
      newViews.set(viewId, updatedView);

      return {
        ...state,
        views: newViews,
      };
    });
  },

  // Camera Controls Interaction
  applyToCamera: (
    controls,
    viewId,
    animate = false,
    customSmoothTime,
    useDefaults = true
  ) => {
    const state = get();
    const targetViewId = viewId || state.currentViewId;
    if (!targetViewId) return;

    const view = state.views.get(targetViewId);
    if (!view) return;

    applyViewToCamera(
      view.settings,
      controls,
      animate,
      customSmoothTime,
      useDefaults
    );
  },
}));
