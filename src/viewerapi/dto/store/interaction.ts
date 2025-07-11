import * as THREE from 'three'

interface InteractionStoreState {
  hoveredGUID: string | null
  hoveredObjects: number[]
  hoverIndex: number

  selectedGUIDs: Set<string>
  intersectionPoint: THREE.Vector3 | null
}

interface InteractionStoreActions {
  setHoveredGUID: (guid: string | null) => void
  setHoveredObjects: (objects: number[]) => void
  setHoverIndex: (index: number) => void
  cycleHover: () => void

  setSelectedGUIDs: (guids: Set<string>) => void
  addToSelection: (guid: string) => void
  removeFromSelection: (guid: string) => void
  clearSelection: () => void

  setIntersectionPoint: (point: THREE.Vector3 | null) => void
}

export type InteractionStore = InteractionStoreState & InteractionStoreActions
