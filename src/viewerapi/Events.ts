import { BufferGeometry } from 'three'

export const Events = {
  SelectionChanged: 'EntitySelected',
  SceneClicked: 'SceneClicked',
  SceneUpdated: 'SceneUpdated',
  StatusMessage: 'StatusMessage',
  ViewChanged: 'ViewChanged',
  ViewerLoaded: 'ViewerLoaded',
  ViewDeleted: 'ViewDeleted',
  ViewCreated: 'ViewCreated',
  ViewReset: 'ViewReset',
} as const

export type EventType = (typeof Events)[keyof typeof Events]

export type EventPayloads = {
  [Events.SelectionChanged]: { guids: string[] }
  [Events.SceneClicked]: {
    guid?: string
    point: { x: number; y: number; z: number }
    normal: { x: number; y: number; z: number }
  }
  [Events.SceneUpdated]: { geometry: BufferGeometry }
  [Events.StatusMessage]: { message: string }
  [Events.ViewChanged]: { view: string }
  [Events.ViewerLoaded]: { viewer: string }
  [Events.ViewDeleted]: { view: string }
  [Events.ViewCreated]: { view: string }
  [Events.ViewReset]: { view: string }
}
