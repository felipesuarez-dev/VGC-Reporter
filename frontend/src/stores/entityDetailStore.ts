import { create } from "zustand";

interface EntityDetailState {
  name: string | null;
  open: (name: string) => void;
  close: () => void;
}

function createEntityDetailStore() {
  return create<EntityDetailState>((set) => ({
    name: null,
    open: (name) => set({ name }),
    close: () => set({ name: null }),
  }));
}

export const useMoveDetailStore = createEntityDetailStore();
export const useItemDetailStore = createEntityDetailStore();
export const useAbilityDetailStore = createEntityDetailStore();
