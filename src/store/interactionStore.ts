import { create } from "zustand";
import * as THREE from "three";
import { LineSegmentsGeometry } from "three/examples/jsm/Addons.js";

interface InteractionStoreState {
  hoveredGUID: string | null;
  hoveredObjects: number[];
  hoverIndex: number;
  hoveredOutlineGeometry: LineSegmentsGeometry | null;

  selectedGUIDs: Set<string>;
  selectedOutlineGeometry: LineSegmentsGeometry | null;

  intersectionPoint: THREE.Vector3 | null;
}

interface InteractionStoreActions {
  setHoveredGUID: (guid: string | null) => void;
  setHoveredObjects: (objects: number[]) => void;
  setHoverIndex: (index: number) => void;
  setHoveredOutlineGeometry: (geometry: LineSegmentsGeometry | null) => void;
  cycleHover: () => void;

  setSelectedGUIDs: (guids: Set<string>) => void;
  addToSelection: (guid: string) => void;
  removeFromSelection: (guid: string) => void;
  clearSelection: () => void;
  setSelectedOutlineGeometry: (geometry: LineSegmentsGeometry | null) => void;

  setIntersectionPoint: (point: THREE.Vector3 | null) => void;
}

export type InteractionStore = InteractionStoreState & InteractionStoreActions;

export const useInteractionStore = create<InteractionStore>((set, get) => ({
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
  setHoveredOutlineGeometry: (geometry) =>
    set({ hoveredOutlineGeometry: geometry }),

  cycleHover: () => {
    const { hoveredObjects, hoverIndex } = get();
    if (hoveredObjects.length === 0) return;
    const newIndex = (hoverIndex + 1) % hoveredObjects.length;
    set({ hoverIndex: newIndex });
  },

  setSelectedGUIDs: (guids) => set({ selectedGUIDs: guids }),
  addToSelection: (guid) =>
    set((state) => {
      const newSelection = new Set(state.selectedGUIDs);
      newSelection.add(guid);
      return { selectedGUIDs: newSelection };
    }),
  removeFromSelection: (guid) =>
    set((state) => {
      const newSelection = new Set(state.selectedGUIDs);
      newSelection.delete(guid);
      return { selectedGUIDs: newSelection };
    }),
  clearSelection: () => set({ selectedGUIDs: new Set<string>() }),
  setSelectedOutlineGeometry: (geometry) =>
    set({ selectedOutlineGeometry: geometry }),

  setIntersectionPoint: (point) => set({ intersectionPoint: point }),
}));
