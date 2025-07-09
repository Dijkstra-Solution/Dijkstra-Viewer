import { ViewData, ViewSettings, ViewStore } from '@/viewerapi/dto/store/view'
import { create } from 'zustand'

/**
 * Create the ViewStore with Zustand
 */
export const createViewStore = () =>
  create<ViewStore>((set, get) => ({
    // Initial State
    views: new Map<string, ViewData>([
      [
        'perspective',
        {
          viewId: 'perspective',
          displayName: 'Perspective',
          settings: {
            position: [5, 5, 5],
            target: [0, 0, 0],
            up: [0, 1, 0],
          },
          defaultSettings: {
            position: [5, 5, 5],
            target: [0, 0, 0],
            up: [0, 1, 0],
          },
        },
      ],
      [
        'top',
        {
          viewId: 'top',
          displayName: 'Top',
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
      }))
    },

    unregisterView: (viewId) => {
      set((state) => {
        if (!state.views.has(viewId)) {
          console.warn(`View with id ${viewId} does not exist`)
          return state
        }

        const newViews = new Map(state.views)
        newViews.delete(viewId)

        let newCurrentViewId = state.currentViewId
        if (state.currentViewId === viewId) {
          const ids = Array.from(newViews.keys())
          newCurrentViewId = ids.length ? ids[0] : null
        }

        return {
          ...state,
          views: newViews,
          currentViewId: newCurrentViewId,
        }
      })
    },

    setCurrentView: (viewId: string) => {
      const state = get()
      const view = state.views.get(viewId)
      if (!view) {
        console.warn(`View with id ${viewId} does not exist`)
        return false
      }

      set({ currentViewId: viewId })
      return true
    },

    resetView: (viewId: string) => {
      set((state) => {
        const view = state.views.get(viewId)
        if (!view) return state

        const updatedView = {
          ...view,
          settings: { ...view.defaultSettings },
        }

        const newViews = new Map(state.views)
        newViews.set(viewId, updatedView)

        return {
          ...state,
          views: newViews,
        }
      })
    },

    resetAllViews: () => {
      const { views } = get()
      const newViews = new Map()

      views.forEach((view, viewId) => {
        newViews.set(viewId, {
          ...view,
          settings: { ...view.defaultSettings },
        })
      })

      set((state) => ({
        ...state,
        views: newViews,
      }))
    },

    getAllViews: () => {
      return Array.from(get().views.values())
    },

    getView: (viewId) => {
      return get().views.get(viewId)
    },

    getCurrentView: () => {
      const { currentViewId, views } = get()
      return currentViewId ? views.get(currentViewId) : undefined
    },

    // View Settings Methods
    updateViewSettings: (viewId, settings) => {
      set((state) => {
        const view = state.views.get(viewId)
        if (!view) return state

        const updatedView = {
          ...view,
          settings: { ...view.settings, ...settings },
        }

        const newViews = new Map(state.views)
        newViews.set(viewId, updatedView)

        return {
          ...state,
          views: newViews,
        }
      })
    },

    setOrthographicCamera: (viewId, useOrthographic) => {
      set((state) => {
        const view = state.views.get(viewId)
        if (!view) return state

        const updatedView = {
          ...view,
          settings: {
            ...view.settings,
            useOrthographicCamera: useOrthographic,
          },
        }

        const newViews = new Map(state.views)
        newViews.set(viewId, updatedView)

        return {
          ...state,
          views: newViews,
        }
      })
    },

    updateViewPosition: (viewId, position, target, up) => {
      set((state) => {
        const view = state.views.get(viewId)
        if (!view) return state

        const updatedView = {
          ...view,
          settings: {
            ...view.settings,
            position: [...position],
            target: [...target],
            up: [...(up ?? [0, 1, 0])],
          },
        }

        const newViews = new Map(state.views)
        newViews.set(viewId, updatedView)

        return {
          ...state,
          views: newViews,
        }
      })
    },

    updateConstraints: (viewId, constraints) => {
      set((state) => {
        const view = state.views.get(viewId)
        if (!view) return state

        const updatedSettings = { ...view.settings }
        updatedSettings.constraints = {
          ...updatedSettings.constraints,
          ...constraints,
        }

        // Apply any top-level constraint properties
        ;[
          'azimuthRotateSpeed',
          'polarRotateSpeed',
          'truckSpeed',
          'dollySpeed',
          'draggingSmoothTime',
          'smoothTime',
        ].forEach((prop) => {
          const key = prop as keyof typeof constraints
          if (constraints![key] !== undefined) {
            const settingsKey = prop as keyof ViewSettings
            updatedSettings[settingsKey] = constraints![key]
          }
        })

        const updatedView = {
          ...view,
          settings: updatedSettings,
        }

        const newViews = new Map(state.views)
        newViews.set(viewId, updatedView)

        return {
          ...state,
          views: newViews,
        }
      })
    },
  }))
