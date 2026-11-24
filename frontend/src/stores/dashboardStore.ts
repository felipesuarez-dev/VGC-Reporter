import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Format, SourceId } from "../lib/types";

export type TopPokemonView = "bar" | "grid" | "treemap" | "tier";
export type DashboardView = "feed" | "tournaments" | "metrics" | "regulation";
export type FeedPanelId = "summary" | "live" | "news";
export type TournamentPanelId = "upcoming" | "recent" | "calendar";
export type MetricsPanelId =
  | "top_pokemon"
  | "trending"
  | "top_entities"
  | "external_sources";
export type RegulationPanelId = "roster" | "items" | "megas";
export type FeedLayoutMode = "vertical" | "horizontal" | "custom";

export interface FeedPanelPrefs {
  collapsed: boolean;
}

export const FEED_PANEL_IDS: readonly FeedPanelId[] = [
  "summary",
  "live",
  "news",
];

export const TOURNAMENT_PANEL_IDS: readonly TournamentPanelId[] = [
  "upcoming",
  "recent",
  "calendar",
];

export const METRICS_PANEL_IDS: readonly MetricsPanelId[] = [
  "top_pokemon",
  "trending",
  "top_entities",
  "external_sources",
];

export const REGULATION_PANEL_IDS: readonly RegulationPanelId[] = [
  "roster",
  "items",
  "megas",
];

/**
 * Default Feed: regulation summary, the live wall and official news. Tournaments
 * and the calendar now live in their own Dashboard tab so the Feed stays focused
 * on "what is happening right now".
 */
export const DEFAULT_FEED_ROWS: FeedPanelId[][] = [
  ["summary"],
  ["live"],
  ["news"],
];

export const DEFAULT_TOURNAMENT_ROWS: TournamentPanelId[][] = [
  ["upcoming"],
  ["recent"],
  ["calendar"],
];

export const DEFAULT_METRICS_ROWS: MetricsPanelId[][] = [
  ["top_pokemon"],
  ["trending"],
  ["top_entities"],
  ["external_sources"],
];

export const DEFAULT_REGULATION_ROWS: RegulationPanelId[][] = [
  ["roster"],
  ["items"],
  ["megas"],
];

export const DEFAULT_FEED_PANELS: Record<FeedPanelId, FeedPanelPrefs> = {
  summary: { collapsed: false },
  live: { collapsed: false },
  news: { collapsed: false },
};

export const DEFAULT_TOURNAMENT_PANELS: Record<
  TournamentPanelId,
  FeedPanelPrefs
> = {
  upcoming: { collapsed: false },
  recent: { collapsed: false },
  calendar: { collapsed: false },
};

export const DEFAULT_METRICS_PANELS: Record<MetricsPanelId, FeedPanelPrefs> = {
  top_pokemon: { collapsed: false },
  trending: { collapsed: false },
  top_entities: { collapsed: false },
  external_sources: { collapsed: false },
};

export const DEFAULT_REGULATION_PANELS: Record<
  RegulationPanelId,
  FeedPanelPrefs
> = {
  roster: { collapsed: false },
  items: { collapsed: false },
  megas: { collapsed: false },
};

/**
 * Rows are horizontal groups: `[["live", "news"], ["summary"]]` renders live
 * and news side by side, with summary on its own row below. Unknown, duplicate
 * or missing panels are repaired so a persisted layout always renders every
 * section exactly once.
 */
export function normalizePanelRows<T extends string>(
  raw: unknown,
  ids: readonly T[],
): T[][] {
  const source = Array.isArray(raw) ? raw : [];
  const seen = new Set<T>();
  const rows: T[][] = [];
  for (const entry of source) {
    const candidates = Array.isArray(entry) ? entry : [entry];
    const row: T[] = [];
    for (const value of candidates) {
      if (
        typeof value === "string" &&
        ids.includes(value as T)
      ) {
        const id = value as T;
        if (!seen.has(id)) {
          seen.add(id);
          row.push(id);
        }
      }
    }
    if (row.length > 0) rows.push(row);
  }
  for (const id of ids) {
    if (!seen.has(id)) rows.push([id]);
  }
  return rows;
}

export function normalizePanelPrefs<T extends string>(
  raw: unknown,
  ids: readonly T[],
): Record<T, FeedPanelPrefs> {
  const source =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out = {} as Record<T, FeedPanelPrefs>;
  for (const id of ids) {
    const entry =
      source[id] && typeof source[id] === "object"
        ? (source[id] as Record<string, unknown>)
        : {};
    out[id] = { collapsed: entry.collapsed === true };
  }
  return out;
}

export function panelLayoutMode<T extends string>(
  rows: T[][],
): FeedLayoutMode {
  const visible = rows.filter((row) => row.length > 0);
  if (visible.length === 1 && visible[0].length > 1) return "horizontal";
  if (visible.every((row) => row.length === 1)) return "vertical";
  return "custom";
}

/** Repair a persisted panel order: drop unknown/duplicate ids and append any
 * panel added in a newer version, so a layout never hides content silently. */
export function normalizePanelOrder<T extends string>(
  raw: unknown,
  ids: readonly T[],
): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  if (Array.isArray(raw)) {
    for (const value of raw) {
      if (
        typeof value === "string" &&
        ids.includes(value as T) &&
        !seen.has(value as T)
      ) {
        seen.add(value as T);
        out.push(value as T);
      }
    }
  }
  for (const id of ids) {
    if (!seen.has(id)) out.push(id);
  }
  return out;
}

function rowsFromOrder<T extends string>(order: readonly T[]): T[][] {
  return order.map((id) => [id]);
}

function layoutRows<T extends string>(
  rows: T[][],
  ids: readonly T[],
  mode: "vertical" | "horizontal",
): T[][] {
  const seen = new Set<T>();
  const flat: T[] = [];
  for (const row of rows) {
    for (const id of row) {
      if (ids.includes(id) && !seen.has(id)) {
        seen.add(id);
        flat.push(id);
      }
    }
  }
  for (const id of ids) {
    if (!seen.has(id)) flat.push(id);
  }
  return mode === "horizontal" ? [flat] : flat.map((id) => [id]);
}

const VIEWS: readonly TopPokemonView[] = ["bar", "grid", "treemap", "tier"];

interface DashboardState {
  format: Format;
  favoriteFormat: Format;
  /** The user explicitly chose a format; do not follow the active one. */
  formatPinned: boolean;
  showArchived: boolean;
  topPokemonView: TopPokemonView;
  dashboardView: DashboardView;
  feedRows: FeedPanelId[][];
  feedPanels: Record<FeedPanelId, FeedPanelPrefs>;
  tournamentRows: TournamentPanelId[][];
  tournamentPanels: Record<TournamentPanelId, FeedPanelPrefs>;
  metricsRows: MetricsPanelId[][];
  metricsPanels: Record<MetricsPanelId, FeedPanelPrefs>;
  regulationRows: RegulationPanelId[][];
  regulationPanels: Record<RegulationPanelId, FeedPanelPrefs>;
  /** `null` merges every source; a value pins the view to one provider. */
  sourceFilter: SourceId | null;
  /** Starred source. `null` means "all sources". */
  favoriteSource: SourceId | null;
  /** Custom date window per format, shared by Metrics and Top Teams. */
  dateRanges: Record<string, { from: string; to: string }>;
  setFormat: (format: Format) => void;
  setFavoriteFormat: (format: Format) => void;
  setShowArchived: (show: boolean) => void;
  setDashboardView: (view: DashboardView) => void;
  setFeedRows: (rows: FeedPanelId[][]) => void;
  setFeedLayoutMode: (mode: "vertical" | "horizontal") => void;
  setFeedCollapsed: (id: FeedPanelId, collapsed: boolean) => void;
  setAllFeedCollapsed: (collapsed: boolean) => void;
  resetFeedLayout: () => void;
  setTournamentRows: (rows: TournamentPanelId[][]) => void;
  setTournamentLayoutMode: (mode: "vertical" | "horizontal") => void;
  setTournamentCollapsed: (id: TournamentPanelId, collapsed: boolean) => void;
  setAllTournamentCollapsed: (collapsed: boolean) => void;
  resetTournamentLayout: () => void;
  setMetricsRows: (rows: MetricsPanelId[][]) => void;
  setMetricsLayoutMode: (mode: "vertical" | "horizontal") => void;
  setMetricsCollapsed: (id: MetricsPanelId, collapsed: boolean) => void;
  setAllMetricsCollapsed: (collapsed: boolean) => void;
  resetMetricsLayout: () => void;
  setRegulationRows: (rows: RegulationPanelId[][]) => void;
  setRegulationLayoutMode: (mode: "vertical" | "horizontal") => void;
  setRegulationCollapsed: (id: RegulationPanelId, collapsed: boolean) => void;
  setAllRegulationCollapsed: (collapsed: boolean) => void;
  resetRegulationLayout: () => void;
  resetPanelOrders: () => void;
  followActive: (format: Format) => void;
  setTopPokemonView: (view: TopPokemonView) => void;
  setSourceFilter: (source: SourceId | null) => void;
  setFavoriteSource: (source: SourceId | null) => void;
  setDateRange: (format: Format, range: { from: string; to: string } | null) => void;
}

const SOURCES: readonly SourceId[] = ["labmaus", "limitless", "champteams", "smogon"];

/** The last known Champions set; the catalog replaces it as soon as it loads. */
const ACTIVE_FORMAT: Format = "regulation-m-c";

function normalizeSource(raw: unknown): SourceId | null {
  return SOURCES.includes(raw as SourceId) ? (raw as SourceId) : null;
}

/** Gate for the persisted view. Anything not on the current list is discarded. */
function normalizeView(raw: unknown): TopPokemonView {
  if (raw === "donut") return "grid";
  if (raw === "list") return "treemap";
  if (VIEWS.includes(raw as TopPokemonView)) return raw as TopPokemonView;
  return "bar";
}

function normalizeDashboardView(raw: unknown): DashboardView {
  return raw === "tournaments" || raw === "metrics" || raw === "regulation"
    ? raw
    : "feed";
}

function normalizeFormat(raw: unknown): Format {
  return typeof raw === "string" && raw.trim().length > 0 ? raw : ACTIVE_FORMAT;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      format: ACTIVE_FORMAT,
      favoriteFormat: ACTIVE_FORMAT,
      formatPinned: false,
      showArchived: true,
      topPokemonView: "bar",
      dashboardView: "feed",
      feedRows: normalizePanelRows(DEFAULT_FEED_ROWS, FEED_PANEL_IDS),
      feedPanels: normalizePanelPrefs(DEFAULT_FEED_PANELS, FEED_PANEL_IDS),
      tournamentRows: normalizePanelRows(
        DEFAULT_TOURNAMENT_ROWS,
        TOURNAMENT_PANEL_IDS,
      ),
      tournamentPanels: normalizePanelPrefs(
        DEFAULT_TOURNAMENT_PANELS,
        TOURNAMENT_PANEL_IDS,
      ),
      metricsRows: normalizePanelRows(DEFAULT_METRICS_ROWS, METRICS_PANEL_IDS),
      metricsPanels: normalizePanelPrefs(
        DEFAULT_METRICS_PANELS,
        METRICS_PANEL_IDS,
      ),
      regulationRows: normalizePanelRows(
        DEFAULT_REGULATION_ROWS,
        REGULATION_PANEL_IDS,
      ),
      regulationPanels: normalizePanelPrefs(
        DEFAULT_REGULATION_PANELS,
        REGULATION_PANEL_IDS,
      ),
      sourceFilter: null,
      favoriteSource: null,
      dateRanges: {},
      setFormat: (format) => set({ format, formatPinned: true }),
      setFavoriteFormat: (favoriteFormat) =>
        set({ favoriteFormat, format: favoriteFormat, formatPinned: true }),
      setShowArchived: (showArchived) => set({ showArchived }),
      setDashboardView: (dashboardView) => set({ dashboardView }),
      setFeedRows: (feedRows) =>
        set({ feedRows: normalizePanelRows(feedRows, FEED_PANEL_IDS) }),
      setFeedLayoutMode: (mode) =>
        set((state) => ({ feedRows: layoutRows(state.feedRows, FEED_PANEL_IDS, mode) })),
      setFeedCollapsed: (id, collapsed) =>
        set((state) => ({
          feedPanels: { ...state.feedPanels, [id]: { collapsed } },
        })),
      setAllFeedCollapsed: (collapsed) =>
        set((state) => {
          const feedPanels = { ...state.feedPanels };
          for (const id of FEED_PANEL_IDS) feedPanels[id] = { collapsed };
          return { feedPanels };
        }),
      resetFeedLayout: () =>
        set({
          feedRows: normalizePanelRows(DEFAULT_FEED_ROWS, FEED_PANEL_IDS),
          feedPanels: normalizePanelPrefs(DEFAULT_FEED_PANELS, FEED_PANEL_IDS),
        }),
      setTournamentRows: (tournamentRows) =>
        set({
          tournamentRows: normalizePanelRows(
            tournamentRows,
            TOURNAMENT_PANEL_IDS,
          ),
        }),
      setTournamentLayoutMode: (mode) =>
        set((state) => ({
          tournamentRows: layoutRows(
            state.tournamentRows,
            TOURNAMENT_PANEL_IDS,
            mode,
          ),
        })),
      setTournamentCollapsed: (id, collapsed) =>
        set((state) => ({
          tournamentPanels: {
            ...state.tournamentPanels,
            [id]: { collapsed },
          },
        })),
      setAllTournamentCollapsed: (collapsed) =>
        set((state) => {
          const tournamentPanels = { ...state.tournamentPanels };
          for (const id of TOURNAMENT_PANEL_IDS) {
            tournamentPanels[id] = { collapsed };
          }
          return { tournamentPanels };
        }),
      resetTournamentLayout: () =>
        set({
          tournamentRows: normalizePanelRows(
            DEFAULT_TOURNAMENT_ROWS,
            TOURNAMENT_PANEL_IDS,
          ),
          tournamentPanels: normalizePanelPrefs(
            DEFAULT_TOURNAMENT_PANELS,
            TOURNAMENT_PANEL_IDS,
          ),
        }),
      setMetricsRows: (metricsRows) =>
        set({
          metricsRows: normalizePanelRows(metricsRows, METRICS_PANEL_IDS),
        }),
      setMetricsLayoutMode: (mode) =>
        set((state) => ({
          metricsRows: layoutRows(state.metricsRows, METRICS_PANEL_IDS, mode),
        })),
      setMetricsCollapsed: (id, collapsed) =>
        set((state) => ({
          metricsPanels: { ...state.metricsPanels, [id]: { collapsed } },
        })),
      setAllMetricsCollapsed: (collapsed) =>
        set((state) => {
          const metricsPanels = { ...state.metricsPanels };
          for (const id of METRICS_PANEL_IDS) metricsPanels[id] = { collapsed };
          return { metricsPanels };
        }),
      resetMetricsLayout: () =>
        set({
          metricsRows: normalizePanelRows(DEFAULT_METRICS_ROWS, METRICS_PANEL_IDS),
          metricsPanels: normalizePanelPrefs(
            DEFAULT_METRICS_PANELS,
            METRICS_PANEL_IDS,
          ),
        }),
      setRegulationRows: (regulationRows) =>
        set({
          regulationRows: normalizePanelRows(
            regulationRows,
            REGULATION_PANEL_IDS,
          ),
        }),
      setRegulationLayoutMode: (mode) =>
        set((state) => ({
          regulationRows: layoutRows(
            state.regulationRows,
            REGULATION_PANEL_IDS,
            mode,
          ),
        })),
      setRegulationCollapsed: (id, collapsed) =>
        set((state) => ({
          regulationPanels: {
            ...state.regulationPanels,
            [id]: { collapsed },
          },
        })),
      setAllRegulationCollapsed: (collapsed) =>
        set((state) => {
          const regulationPanels = { ...state.regulationPanels };
          for (const id of REGULATION_PANEL_IDS) {
            regulationPanels[id] = { collapsed };
          }
          return { regulationPanels };
        }),
      resetRegulationLayout: () =>
        set({
          regulationRows: normalizePanelRows(
            DEFAULT_REGULATION_ROWS,
            REGULATION_PANEL_IDS,
          ),
          regulationPanels: normalizePanelPrefs(
            DEFAULT_REGULATION_PANELS,
            REGULATION_PANEL_IDS,
          ),
        }),
      resetPanelOrders: () =>
        set({
          tournamentRows: normalizePanelRows(
            DEFAULT_TOURNAMENT_ROWS,
            TOURNAMENT_PANEL_IDS,
          ),
          tournamentPanels: normalizePanelPrefs(
            DEFAULT_TOURNAMENT_PANELS,
            TOURNAMENT_PANEL_IDS,
          ),
          metricsRows: normalizePanelRows(DEFAULT_METRICS_ROWS, METRICS_PANEL_IDS),
          metricsPanels: normalizePanelPrefs(
            DEFAULT_METRICS_PANELS,
            METRICS_PANEL_IDS,
          ),
          regulationRows: normalizePanelRows(
            DEFAULT_REGULATION_ROWS,
            REGULATION_PANEL_IDS,
          ),
          regulationPanels: normalizePanelPrefs(
            DEFAULT_REGULATION_PANELS,
            REGULATION_PANEL_IDS,
          ),
        }),
      followActive: (format) => {
        if (get().formatPinned) return;
        set({ format, favoriteFormat: format });
      },
      setTopPokemonView: (topPokemonView) => set({ topPokemonView }),
      setSourceFilter: (sourceFilter) => set({ sourceFilter }),
      setFavoriteSource: (favoriteSource) =>
        set({ favoriteSource, sourceFilter: favoriteSource }),
      setDateRange: (format, range) =>
        set((state) => {
          const next = { ...state.dateRanges };
          if (range) next[format] = range;
          else delete next[format];
          return { dateRanges: next };
        }),
    }),
    {
      name: "vgc-dashboard",
      version: 26,
      migrate: (persisted: unknown, version: number) => {
        const prior = (persisted ?? {}) as Record<string, unknown>;
        const legacyFeedRows = normalizePanelRows(
          prior.feedRows ?? prior.feedOrder,
          FEED_PANEL_IDS,
        );
        const legacyMetricsOrder = Array.isArray(prior.metricsOrder)
          ? prior.metricsOrder
          : [];
        const legacyRegulationOrder = Array.isArray(prior.regulationOrder)
          ? prior.regulationOrder
          : [];
        const metricsRows =
          version >= 26 && Array.isArray(prior.metricsRows)
            ? normalizePanelRows(prior.metricsRows, METRICS_PANEL_IDS)
            : normalizePanelRows(
                rowsFromOrder(
                  normalizePanelOrder(legacyMetricsOrder, METRICS_PANEL_IDS),
                ),
                METRICS_PANEL_IDS,
              );
        const regulationRows =
          version >= 26 && Array.isArray(prior.regulationRows)
            ? normalizePanelRows(prior.regulationRows, REGULATION_PANEL_IDS)
            : normalizePanelRows(
                rowsFromOrder(
                  normalizePanelOrder(
                    legacyRegulationOrder,
                    REGULATION_PANEL_IDS,
                  ),
                ),
                REGULATION_PANEL_IDS,
              );
        return {
          format: normalizeFormat(prior.format),
          favoriteFormat: normalizeFormat(prior.favoriteFormat ?? prior.format),
          formatPinned: Boolean(prior.formatPinned),
          showArchived: prior.showArchived !== false,
          topPokemonView: normalizeView(prior.topPokemonView),
          dashboardView: normalizeDashboardView(prior.dashboardView),
          feedRows: legacyFeedRows,
          feedPanels: normalizePanelPrefs(prior.feedPanels, FEED_PANEL_IDS),
          tournamentRows:
            version >= 26 && Array.isArray(prior.tournamentRows)
              ? normalizePanelRows(prior.tournamentRows, TOURNAMENT_PANEL_IDS)
              : normalizePanelRows(DEFAULT_TOURNAMENT_ROWS, TOURNAMENT_PANEL_IDS),
          tournamentPanels: normalizePanelPrefs(
            prior.tournamentPanels,
            TOURNAMENT_PANEL_IDS,
          ),
          metricsRows,
          metricsPanels: normalizePanelPrefs(
            prior.metricsPanels,
            METRICS_PANEL_IDS,
          ),
          regulationRows,
          regulationPanels: normalizePanelPrefs(
            prior.regulationPanels,
            REGULATION_PANEL_IDS,
          ),
          sourceFilter: normalizeSource(prior.sourceFilter),
          favoriteSource:
            version >= 22 ? normalizeSource(prior.favoriteSource) : null,
          dateRanges:
            version >= 22 &&
            prior.dateRanges &&
            typeof prior.dateRanges === "object"
              ? (prior.dateRanges as Record<string, { from: string; to: string }>)
              : {},
        } as DashboardState;
      },
    },
  ),
);
