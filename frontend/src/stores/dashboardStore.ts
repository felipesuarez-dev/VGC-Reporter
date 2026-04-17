import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Format } from "../lib/types";

export type TournamentCount = 25 | 50 | 100;

interface DashboardState {
  format: Format;
  favoriteFormat: Format;
  tournamentCount: TournamentCount;
  setFormat: (format: Format) => void;
  setFavoriteFormat: (format: Format) => void;
  setTournamentCount: (count: TournamentCount) => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      format: "regulation-m-a",
      favoriteFormat: "regulation-m-a",
      tournamentCount: 50,
      setFormat: (format) => set({ format }),
      setFavoriteFormat: (favoriteFormat) => set({ favoriteFormat }),
      setTournamentCount: (tournamentCount) => set({ tournamentCount }),
    }),
    {
      name: "vgc-dashboard",
      version: 3,
      migrate: (persisted: unknown, version: number) => {
        if (version < 2) {
          const prior = (persisted ?? {}) as { format?: Format };
          const fallback: Format = prior.format ?? "regulation-m-a";
          return {
            format: fallback,
            favoriteFormat: fallback,
            tournamentCount: 50,
          } as DashboardState;
        }
        if (version < 3) {
          const prior = persisted as Partial<DashboardState>;
          return { ...prior, tournamentCount: 50 } as DashboardState;
        }
        return persisted as DashboardState;
      },
    },
  ),
);
