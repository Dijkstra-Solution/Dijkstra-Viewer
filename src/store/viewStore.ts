import { create } from "zustand";

type ViewStore = {
  orthographic: boolean;
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  setOrthographic: (orthographic: boolean) => void;
  setLayout: (
    position?: { x: number; y: number; z: number },
    target?: { x: number; y: number; z: number }
  ) => Promise<void>;
};

export const useViewStore = create<ViewStore>((set) => ({
  orthographic: false,
  position: { x: 0, y: 0, z: 0 },
  target: { x: 0, y: 0, z: 0 },
  setOrthographic: (orthographic: boolean) => set({ orthographic }),
  setLayout: async (pos, tar) =>
    set((state) => ({
      position: {
        x: pos?.x ?? state.position.x,
        y: pos?.y ?? state.position.y,
        z: pos?.z ?? state.position.z,
      },
      target: {
        x: tar?.x ?? state.target.x,
        y: tar?.y ?? state.target.y,
        z: tar?.z ?? state.target.z,
      },
    })),
}));
