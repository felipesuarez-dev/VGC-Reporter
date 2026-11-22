import { create } from "zustand";
import type { EntityUser } from "../lib/entityUsers";

interface EntityDetailState {
  name: string | null;
  users: EntityUser[];
  open: (name: string, users?: EntityUser[]) => void;
  close: () => void;
}

function createEntityDetailStore() {
  return create<EntityDetailState>((set) => ({
    name: null,
    users: [],
    open: (name, users = []) => set({ name, users }),
    close: () => set({ name: null, users: [] }),
  }));
}

export const useMoveDetailStore = createEntityDetailStore();
export const useItemDetailStore = createEntityDetailStore();
export const useAbilityDetailStore = createEntityDetailStore();
