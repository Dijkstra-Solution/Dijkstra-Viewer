/**
 * Camera mode types
 */
export type CameraMode = 'perspective' | 'orthographic'

/**
 * View settings interface
 */
export interface ViewSettings {
  position: number[]
  target: number[]
  up: number[]
  useOrthographicCamera?: boolean
  constraints?: {
    azimuthRotateSpeed?: number
    polarRotateSpeed?: number
    truckSpeed?: number
    dollySpeed?: number
    draggingSmoothTime?: number
    smoothTime?: number
  }
}

/**
 * View data structure to be stored in the state
 */
export interface ViewData {
  viewId: string
  displayName: string
  settings: ViewSettings
  defaultSettings: ViewSettings
  customState?: Record<string, unknown>
}

/**
 * ViewStore state and actions
 */
export type ViewStore = {
  // State
  views: Map<string, ViewData>
  currentViewId: string | null
  defaultSettings: ViewSettings

  // Actions - View Management
  registerView: (view: ViewData) => void
  unregisterView: (viewId: string) => void
  setCurrentView: (viewId: string, animate?: boolean) => boolean
  resetView: (viewId: string, animate?: boolean) => void
  resetAllViews: () => void
  getAllViews: () => ViewData[]
  getView: (viewId: string) => ViewData | undefined
  getCurrentView: () => ViewData | undefined

  // Actions - View Settings
  setOrthographicCamera: (viewId: string, useOrthographic: boolean) => void
  updateViewSettings: (viewId: string, settings: Partial<ViewSettings>) => void
  updateViewPosition: (viewId: string, position: number[], target: number[], up?: number[]) => void
  updateConstraints: (viewId: string, constraints: Partial<ViewSettings['constraints']>) => void
}
