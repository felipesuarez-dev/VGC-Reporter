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
      format: "regulation-m-b",
      favoriteFormat: "regulation-m-b",
      topPokemonView: "bar",
      setFormat: (format) => set({ format }),
      setFavoriteFormat: (favoriteFormat) => set({ favoriteFormat }),
      setTopPokemonView: (topPokemonView) => set({ topPokemonView }),
    }),
    {
      name: "vgc-dashboard",
      version: 9,
      migrate: (persisted: unknown, version: number) => {
        const prior = (persisted ?? {}) as Partial<DashboardState> & {
          tournamentCount?: number;
        };
        const rawView = (prior as Record<string, unknown>).topPokemonView;
        // Regulation M-A's season ended 2026-06-17; M-B is the active set, so
        // every pre-v9 client is moved onto M-B as the default selection.
        // `!(version >= 9)` (not `version < 9`) also catches legacy blobs with
        // no/undefined version, which would otherwise slip through to M-A.
        if (!(version >= 9)) {
          return {
            format: "regulation-m-b",
            favoriteFormat: "regulation-m-b",
            topPokemonView: normalizeView(rawView),
          } as DashboardState;
        }
        return {
          format: prior.format ?? "regulation-m-b",
          favoriteFormat: prior.favoriteFormat ?? prior.format ?? "regulation-m-b",
          topPokemonView: normalizeView(rawView),
        } as DashboardState;
      },
    },
  ),
);
