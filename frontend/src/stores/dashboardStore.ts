import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Format } from "../lib/types";

export type TopPokemonView = "bar" | "grid" | "treemap" | "tier";

const VIEWS: readonly TopPokemonView[] = ["bar", "grid", "treemap", "tier"];

interface DashboardState {
  format: Format;
  favoriteFormat: Format;
  topPokemonView: TopPokemonView;
  setFormat: (format: Format) => void;
  setFavoriteFormat: (format: Format) => void;
  setTopPokemonView: (view: TopPokemonView) => void;
}

/**
 * Gate for the persisted view. Anything not on the current list is discarded,
 * so a new view MUST be added to `VIEWS` or it silently resets to "bar" on
 * every reload.
 */
function normalizeView(raw: unknown): TopPokemonView {
  // 'donut' was a legacy short-lived option; 'list' was the old third chart
  // that got replaced by the Treemap in v0.2.
  if (raw === "donut") return "grid";
  if (raw === "list") return "treemap";
  if (VIEWS.includes(raw as TopPokemonView)) return raw as TopPokemonView;
  return "bar";
}

const ACTIVE_FORMAT: Format = "regulation-m-c";

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      format: ACTIVE_FORMAT,
      favoriteFormat: ACTIVE_FORMAT,
      topPokemonView: "bar",
      setFormat: (format) => set({ format }),
      setFavoriteFormat: (favoriteFormat) => set({ favoriteFormat }),
      setTopPokemonView: (topPokemonView) => set({ topPokemonView }),
    }),
    {
      name: "vgc-dashboard",
      version: 10,
      migrate: (persisted: unknown, version: number) => {
        const prior = (persisted ?? {}) as Partial<DashboardState> & {
          tournamentCount?: number;
        };
        const rawView = (prior as Record<string, unknown>).topPokemonView;
        // Regulation M-B closed on 2026-09-08 and M-C is the active set, so
        // every pre-v10 client is moved onto M-C. Landing on a closed
        // regulation would show a frozen meta with no explanation.
        // `!(version >= 10)` (not `version < 10`) also catches legacy blobs
        // with no/undefined version, which would otherwise slip through.
        if (!(version >= 10)) {
          return {
            format: ACTIVE_FORMAT,
            favoriteFormat: ACTIVE_FORMAT,
            topPokemonView: normalizeView(rawView),
          } as DashboardState;
        }
        return {
          format: prior.format ?? ACTIVE_FORMAT,
          favoriteFormat: prior.favoriteFormat ?? prior.format ?? ACTIVE_FORMAT,
          topPokemonView: normalizeView(rawView),
        } as DashboardState;
      },
    },
  ),
);
