import { create } from "zustand";

export type TypeLabTab = "table" | "coverage" | "team" | "natures";

interface TypeLabState {
  open: boolean;
  tab: TypeLabTab;
  setOpen: (open: boolean) => void;
  setTab: (tab: TypeLabTab) => void;
}

export const useTypeLabStore = create<TypeLabState>((set) => ({
  open: false,
  tab: "table",
  setOpen: (open) => set({ open }),
  setTab: (tab) => set({ tab }),
}));
