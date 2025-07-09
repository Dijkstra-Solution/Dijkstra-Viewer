import { InteractionStore } from '@/viewerapi/dto/store/interaction'
import { create } from 'zustand'

export const createInteractionStore = () =>
  create<InteractionStore>((set, get) => ({
    hoveredGUID: null,
    hoveredObjects: [],
    hoverIndex: 0,
    hoveredOutlineGeometry: null,
    selectedGUIDs: new Set<string>(),
    selectedOutlineGeometry: null,
    intersectionPoint: null,

    setHoveredGUID: (guid) => set({ hoveredGUID: guid }),
    setHoveredObjects: (faceIndices) => set({ hoveredObjects: faceIndices }),
    setHoverIndex: (index) => set({ hoverIndex: index }),

    cycleHover: () => {
      const { hoveredObjects, hoverIndex } = get()
      if (hoveredObjects.length === 0) return
      const newIndex = (hoverIndex + 1) % hoveredObjects.length
      set({ hoverIndex: newIndex })
    },

    setSelectedGUIDs: (guids) => set({ selectedGUIDs: guids }),
    addToSelection: (guid) =>
      set((state) => {
        const newSelection = new Set(state.selectedGUIDs)
        newSelection.add(guid)
        return { selectedGUIDs: newSelection }
      }),
    removeFromSelection: (guid) =>
      set((state) => {
        const newSelection = new Set(state.selectedGUIDs)
        newSelection.delete(guid)
        return { selectedGUIDs: newSelection }
      }),
    clearSelection: () => set({ selectedGUIDs: new Set<string>() }),
    setIntersectionPoint: (point) => set({ intersectionPoint: point }),
  }))
