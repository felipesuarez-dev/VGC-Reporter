import { create } from "zustand";
import { persist } from "zustand/middleware";

export type RecentSearchKind = "pokemon" | "move" | "item" | "ability";

export interface RecentSearch {
  kind: RecentSearchKind;
  name: string;
  at: number;
}

interface RecentSearchesState {
  recents: RecentSearch[];
  addRecent: (kind: RecentSearchKind, name: string) => void;
  clearRecents: () => void;
}

const MAX_RECENTS = 8;

export const useRecentSearchesStore = create<RecentSearchesState>()(
  persist(
    (set) => ({
      recents: [],
      addRecent: (kind, name) =>
        set((s) => {
          const filtered = s.recents.filter(
            (r) => !(r.kind === kind && r.name === name),
          );
          return {
            recents: [{ kind, name, at: Date.now() }, ...filtered].slice(
              0,
              MAX_RECENTS,
            ),
          };
        }),
      clearRecents: () => set({ recents: [] }),
    }),
    { name: "vgc-recent-searches", version: 1 },
  ),
);
