import { createInteractionStore } from './interactionStore'
import { DTOEntity } from '@/viewerapi'
import { create } from 'zustand'
import { createViewStore } from './viewStore' // import view store
import { colors } from '@/constants/colors'
import { InternalDijkstraViewerStore, SurfacePoint, ViewerEventMap } from '@/viewerapi/dto/store/dijkstraViewer'
import { ViewSettings } from '@/viewerapi/dto/store/view'
import { Point3 } from '@/viewerapi/Geometry'

export const createDijkstraViewerStore = () =>
  create<InternalDijkstraViewerStore>((set, get) => {
    const interactionStore = createInteractionStore()
    const viewStore = createViewStore()

    return {
      //#region Event Management
      //TODO - make event sets null by default
      eventListeners: {
        SceneClicked: new Set<(payload: ViewerEventMap['SceneClicked']) => void>(),
        SelectionChanged: new Set<(payload: ViewerEventMap['SelectionChanged']) => void>(),
        SceneUpdated: new Set<(payload: ViewerEventMap['SceneUpdated']) => void>(),
        StatusMessageChanged: new Set<(payload: ViewerEventMap['StatusMessageChanged']) => void>(),
        ViewChanged: new Set<(payload: ViewerEventMap['ViewChanged']) => void>(),
        ViewerLoaded: new Set<(payload: ViewerEventMap['ViewerLoaded']) => void>(),
        ViewDeleted: new Set<(payload: ViewerEventMap['ViewDeleted']) => void>(),
        ViewCreated: new Set<(payload: ViewerEventMap['ViewCreated']) => void>(),
        ViewReset: new Set<(payload: ViewerEventMap['ViewReset']) => void>(),
      },
      on(event, callback) {
        set((state) => {
          const listeners = { ...state.eventListeners }
          listeners[event].add(callback)
          return { eventListeners: listeners }
        })
        // return unsubscribe
        return () => get().off(event, callback)
      },

      off(event, callback) {
        set((state) => {
          const listeners = { ...state.eventListeners }
          listeners[event].delete(callback)
          return { eventListeners: listeners }
        })
      },

      fire(event, payload) {
        // iterate current snapshot of listeners
        get().eventListeners[event]?.forEach((cb) => {
          try {
            cb(payload)
          } catch (err) {
            console.error(`Error in ${event} handler`, err)
          }
        })
      },
      //#endregion

      //#region Actions
      Actions: {
        //#region Entity Management
        AddEntity(entity) {
          if (!get()._internal.entities.has(entity.guid)) {
            set((state) => {
              const newEntities = new Map(state._internal.entities)
              newEntities.set(entity.guid, entity)
              return {
                ...state,
                _internal: {
                  ...state._internal,
                  entities: newEntities,
                },
              }
            })
          }
        },
        RemoveEntity(guid) {
          if (get()._internal.entities.has(guid)) {
            set((state) => {
              const newEntities = new Map(state._internal.entities)
              newEntities.delete(guid)
              return {
                ...state,
                _internal: {
                  ...state._internal,
                  entities: newEntities,
                },
              }
            })
            return
          }
        },
        ClearEntities() {
          set((state) => ({
            ...state,
            _internal: {
              ...state._internal,
              entities: new Map<string, DTOEntity>(),
            },
          }))
        },
        //#endregion

        //#region Selection
        SelectPoints: (count, callback) => {
          get().fire('StatusMessageChanged', {
            message: `Pick ${count} points!`,
          })

          const surfacePoints: SurfacePoint[] = []

          const clickHandler = ({ guid, point, normal }: { guid: string; point: Point3; normal: Point3 }) => {
            surfacePoints.push({ guid, point, normal })
            if (surfacePoints.length == count) {
              cleanup()
              callback(surfacePoints)
            }
          }
          const cleanup = () => {
            get().off('SceneClicked', clickHandler)
          }
          get().on('SceneClicked', clickHandler)
          return cleanup
        },
        SelectEdges(count, callback) {
          return () => {
            console.info('selected', count, 'edges')
            callback([])
          }
        },
        SelectFaces(count, callback) {
          return () => {
            console.info('selected', count, 'faces')
            callback([])
          }
        },
        //#endregion

        //#region View Management
        CreateView(viewId, displayName: string, settings: ViewSettings) {
          // Check if the view already exists in this store with the same properties
          const existingViews = get().Views
          const existingView = existingViews[viewId]

          // Only proceed if the view doesn't exist or has different properties
          if (
            !existingView ||
            existingView.displayName !== displayName ||
            JSON.stringify(existingView.settings) !== JSON.stringify(settings)
          ) {
            viewStore.getState().registerView({
              viewId,
              displayName,
              settings,
              defaultSettings: settings,
            })
            get().fire('ViewCreated', { view: viewId })

            // Update the Views array in this store by adding the new view instead of overwriting
            set((state) => {
              const newView = {
                viewId,
                displayName,
                settings,
                defaultSettings: settings,
              }
              // Check if view with this ID already exists
              const updatedViews = new Map(state.Views)
              updatedViews.set(viewId, newView)
              return { Views: updatedViews }
            })
          }
          return true
        },
        DeleteView(viewId) {
          // Prevent deletion of perspective and top view
          if (viewId === 'perspective' || viewId === 'top') {
            console.warn(`Cannot delete the ${viewId} view as it is required by the system.`)
            return
          }

          viewStore.getState().unregisterView(viewId)
          set((state) => ({
            ...state,
            Views: viewStore.getState().views,
          }))
          get().fire('ViewDeleted', { view: viewId })

          // Update the Views array by filtering out the deleted view
          set((state) => {
            const updated = new Map(state.Views)
            updated.delete(viewId)
            return { Views: updated }
          })
        },
        SetView(viewId) {
          viewStore.getState().setCurrentView(viewId)
          get().fire('ViewChanged', { view: viewId })
          return true
        },
        ResetView(viewId, animate) {
          viewStore.getState().resetView(viewId, animate)
          set((state) => ({
            ...state,
            Views: viewStore.getState().views,
          }))
          get().fire('ViewReset', { view: viewId })
        },
        ResetAllViews() {
          viewStore.getState().resetAllViews()
          set((state) => ({
            ...state,
            Views: viewStore.getState().views,
          }))
        },
        //#endregion
      },
      //#endregion

      Views: viewStore.getState().views,

      Attributes: {
        Hover: {
          Enabled: false,
          Color: colors.foreground,
          Thickness: 3,
        },
        Selection: {
          Enabled: false,
          Multiple: false,
          Remove: false,
          Color: colors.foreground,
          Thickness: 3,
        },
        Snapping: {
          Enabled: false,
          Tolerance: 0.1,
        },
        Viewer: {
          BackgroundColor: colors.foreground,
          GridHelper: true,
        },
      },

      SetAttribute: (group, patch) =>
        set((state) => ({
          Attributes: {
            ...state.Attributes,
            [group]: {
              ...state.Attributes[group],
              ...patch,
            },
          },
        })),

      _internal: {
        entities: new Map<string, DTOEntity>(),
        getHoveredGUID: () => interactionStore.getState().hoveredGUID,
        getHoverIndex: () => interactionStore.getState().hoverIndex,
        getSelectedGUIDs: () => interactionStore.getState().selectedGUIDs,
        getHoveredObjects: () => interactionStore.getState().hoveredObjects,

        setHoveredGUID: (guid: string | null) => {
          interactionStore.getState().setHoveredGUID(guid)
          set((state) => ({
            ...state,
          }))
        },
        setHoverIndex: (index: number) => interactionStore.getState().setHoverIndex(index),
        setSelectedGUIDs: (guids: Set<string>) => interactionStore.getState().setSelectedGUIDs(guids),
        getIntersectionPoint: () => interactionStore.getState().intersectionPoint,
        setIntersectionPoint: (point) => interactionStore.getState().setIntersectionPoint(point),
        setHoveredObjects: (objects: number[]) => interactionStore.getState().setHoveredObjects(objects),

        cycleHover: () => interactionStore.getState().cycleHover(),
        updateViewPosition: (viewId: string, position: number[], target: number[], up?: number[]) => {
          viewStore.getState().updateViewPosition(viewId, position, target, up)
          set((state) => ({
            ...state,
            Views: viewStore.getState().views,
          }))
        },
      },
    }
  })
