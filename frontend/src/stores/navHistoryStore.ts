import { create } from "zustand";

interface NavHistoryState {
  entries: string[];
  index: number;
  sync: (path: string, navigationType: "PUSH" | "REPLACE" | "POP") => void;
}

export const useNavHistoryStore = create<NavHistoryState>()((set, get) => ({
  entries: [],
  index: -1,
  sync: (path, navigationType) => {
    const { entries, index } = get();
    if (entries.length === 0) {
      set({ entries: [path], index: 0 });
      return;
    }
    if (navigationType === "POP") {
      if (index > 0 && entries[index - 1] === path) {
        set({ index: index - 1 });
        return;
      }
      if (index < entries.length - 1 && entries[index + 1] === path) {
        set({ index: index + 1 });
        return;
      }
      const hit = entries.indexOf(path);
      if (hit !== -1) {
        set({ index: hit });
        return;
      }
      const next = [...entries.slice(0, index + 1), path];
      set({ entries: next, index: next.length - 1 });
      return;
    }
    if (navigationType === "REPLACE") {
      if (entries[index] === path) return;
      const next = [...entries];
      next[index] = path;
      set({ entries: next });
      return;
    }
    if (entries[index] === path) return;
    const next = [...entries.slice(0, index + 1), path];
    set({ entries: next, index: next.length - 1 });
  },
}));
