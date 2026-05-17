import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Format } from "../lib/types";

export type TopPokemonView = "bar" | "grid" | "treemap";

interface DashboardState {
  format: Format;
  favoriteFormat: Format;
  topPokemonView: TopPokemonView;
  setFormat: (format: Format) => void;
  setFavoriteFormat: (format: Format) => void;
  setTopPokemonView: (view: TopPokemonView) => void;
}

function normalizeView(raw: unknown): TopPokemonView {
  // 'donut' was a legacy short-lived option; 'list' was the old third chart
  // that got replaced by the Treemap in v0.2.
  if (raw === "donut") return "grid";
  if (raw === "list") return "treemap";
  if (raw === "bar" || raw === "grid" || raw === "treemap") return raw;
  return "bar";
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      format: "regulation-m-a",
      favoriteFormat: "regulation-m-a",
      topPokemonView: "bar",
      setFormat: (format) => set({ format }),
      setFavoriteFormat: (favoriteFormat) => set({ favoriteFormat }),
      setTopPokemonView: (topPokemonView) => set({ topPokemonView }),
    }),
    {
      name: "vgc-dashboard",
      version: 7,
      migrate: (persisted: unknown, version: number) => {
        if (version < 2) {
          const prior = (persisted ?? {}) as { format?: Format };
          const fallback: Format = prior.format ?? "regulation-m-a";
          return {
            format: fallback,
            favoriteFormat: fallback,
            topPokemonView: "bar",
          } as DashboardState;
        }
        const prior = (persisted ?? {}) as Partial<DashboardState> & {
          tournamentCount?: number;
        };
        const rawView = (prior as Record<string, unknown>).topPokemonView;
        return {
          format: prior.format ?? "regulation-m-a",
          favoriteFormat: prior.favoriteFormat ?? prior.format ?? "regulation-m-a",
          topPokemonView: normalizeView(rawView),
        } as DashboardState;
      },
    },
  ),
);
