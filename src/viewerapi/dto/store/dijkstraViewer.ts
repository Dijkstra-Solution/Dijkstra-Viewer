import { BufferGeometry, Vector3 } from 'three'
import { DTOEntity } from '../mesh/DTOEntity'
import { ViewStore } from './view'
import { Point3 } from '@/viewerapi/Geometry'

export interface SurfacePoint {
  guid: string
  point: Point3
  normal: Point3
}
export interface Edge {
  guid: string
  start: Point3
  end: Point3
}
export interface Face {
  guid: string
  outline: Point3[]
  holes: Point3[][]
  normal: Point3
}

export type ViewerEventMap = {
  SelectionChanged: { guids: string[] }
  SceneClicked: {
    guid?: string | undefined
    point: Point3
    normal: Point3
  }
  SceneUpdated: { geometry: BufferGeometry } //TODO - is this even needed?
  StatusMessageChanged: { message: string }
  ViewChanged: { view: string }
  ViewerLoaded: { viewer: string }
  ViewDeleted: { view: string }
  ViewCreated: { view: string }
  ViewReset: { view: string }
}

type ViewerEventCallback<T extends keyof ViewerEventMap> = (payload: ViewerEventMap[T]) => void

interface ViewerEventHandler {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  eventListeners: Record<keyof ViewerEventMap, Set<Function>> //TODO  hide and find safer method

  on: <K extends keyof ViewerEventMap>(event: K, callback: ViewerEventCallback<K>) => () => void

  off: <K extends keyof ViewerEventMap>(event: K, callback: ViewerEventCallback<K>) => void

  fire: <K extends keyof ViewerEventMap>(event: K, payload: ViewerEventMap[K]) => void
}

type ViewerActions = {
  Actions: {
    //TODO - implementation for methods
    //#region Entity Management
    AddEntity: (entity: DTOEntity) => void
    RemoveEntity: (guid: string) => void
    ClearEntities: () => void
    //#endregion

    //#region Selection
    SelectPoints: (count: number, callback: (data: SurfacePoint[]) => void) => () => void
    SelectEdges: (count: number, callback: (data: Edge[]) => void) => () => void
    SelectFaces: (count: number, callback: (data: Face[]) => void) => () => void
    //#endregion

    //#region View Management
    CreateView: (
      viewId: string,
      displayName?: string,
      settings?: object, //TODO
    ) => boolean
    DeleteView: (viewId: string) => void
    SetView: (viewId: string, animate?: boolean) => boolean
    ResetView: (viewId: string, animate?: boolean) => void
    ResetAllViews: () => void
    //#endregion
  }
}

type Views = {
  //TODO - viewStore
  Views: ViewStore['views']
}

interface Attributes {
  Hover: {
    Enabled: boolean
    Color: number
    Thickness: number
  }
  Selection: {
    Enabled: boolean
    Multiple: boolean
    Remove: boolean
    Color: number
    Thickness: number
  }
  Snapping: {
    Enabled: boolean
    Tolerance: number
  }
  Viewer: {
    BackgroundColor: number
    GridHelper: boolean
  }
}

export type DijkstraViewerStore = ViewerEventHandler &
  ViewerActions &
  Views & { Attributes: Attributes } & {
    SetAttribute<G extends keyof Attributes>(group: G, path: Partial<Attributes[G]>): void
  }

export interface InternalDijkstraViewerStore extends DijkstraViewerStore {
  _internal: {
    entities: Map<string, DTOEntity>
    // getEntity: (guid: string) => DTOEntity | undefined;
    // getEntities: () => Map<string, DTOEntity>;

    getHoveredGUID: () => string | null
    setHoveredGUID: (guid: string | null) => void
    getHoverIndex: () => number
    setHoverIndex: (index: number) => void
    cycleHover: () => void
    getSelectedGUIDs: () => Set<string>
    setSelectedGUIDs: (guids: Set<string>) => void
    getIntersectionPoint: () => Point3 | null
    setIntersectionPoint: (point: Vector3 | null) => void
    getHoveredObjects: () => number[]
    setHoveredObjects: (objects: number[]) => void

    updateViewPosition: (viewId: string, position: number[], target: number[], up?: number[]) => void
  }
}
