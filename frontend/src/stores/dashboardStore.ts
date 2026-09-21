import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Format, SourceId } from "../lib/types";

export type TopPokemonView = "bar" | "grid" | "treemap" | "tier";

const VIEWS: readonly TopPokemonView[] = ["bar", "grid", "treemap", "tier"];

interface DashboardState {
  format: Format;
  favoriteFormat: Format;
  topPokemonView: TopPokemonView;
  /** `null` merges every source; a value pins the view to one provider. */
  sourceFilter: SourceId | null;
  setFormat: (format: Format) => void;
  setFavoriteFormat: (format: Format) => void;
  setTopPokemonView: (view: TopPokemonView) => void;
  setSourceFilter: (source: SourceId | null) => void;
}

const SOURCES: readonly SourceId[] = ["labmaus", "limitless", "champteams", "smogon"];

/** Same gate as normalizeView: an unknown persisted value falls back to the
 *  merged view rather than pinning the user to a source that no longer exists. */
function normalizeSource(raw: unknown): SourceId | null {
  return SOURCES.includes(raw as SourceId) ? (raw as SourceId) : null;
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
      sourceFilter: null,
      setFormat: (format) => set({ format }),
      setFavoriteFormat: (favoriteFormat) => set({ favoriteFormat }),
      setTopPokemonView: (topPokemonView) => set({ topPokemonView }),
      setSourceFilter: (sourceFilter) => set({ sourceFilter }),
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
            sourceFilter: null,
          } as DashboardState;
        }
        return {
          format: prior.format ?? ACTIVE_FORMAT,
          favoriteFormat: prior.favoriteFormat ?? prior.format ?? ACTIVE_FORMAT,
          topPokemonView: normalizeView(rawView),
          sourceFilter: normalizeSource(
            (prior as Record<string, unknown>).sourceFilter,
          ),
        } as DashboardState;
      },
    },
  ),
);
