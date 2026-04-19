import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Format } from "../lib/types";

interface DashboardState {
  format: Format;
  favoriteFormat: Format;
  setFormat: (format: Format) => void;
  setFavoriteFormat: (format: Format) => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      format: "regulation-m-a",
      favoriteFormat: "regulation-m-a",
      setFormat: (format) => set({ format }),
      setFavoriteFormat: (favoriteFormat) => set({ favoriteFormat }),
    }),
    {
      name: "vgc-dashboard",
      version: 4,
      migrate: (persisted: unknown, version: number) => {
        if (version < 2) {
          const prior = (persisted ?? {}) as { format?: Format };
          const fallback: Format = prior.format ?? "regulation-m-a";
          return {
            format: fallback,
            favoriteFormat: fallback,
          } as DashboardState;
        }
        const prior = (persisted ?? {}) as Partial<DashboardState> & {
          tournamentCount?: number;
        };
        return {
          format: prior.format ?? "regulation-m-a",
          favoriteFormat: prior.favoriteFormat ?? prior.format ?? "regulation-m-a",
        } as DashboardState;
      },
    },
  ),
);
