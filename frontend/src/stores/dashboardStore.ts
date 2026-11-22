import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Format, SourceId } from "../lib/types";

export type TopPokemonView = "bar" | "grid" | "treemap" | "tier";
export type DashboardView = "metrics" | "regulation" | "feed";
export type FeedPanelId = "summary" | "live" | "events" | "news";
export type FeedLayoutMode = "vertical" | "horizontal" | "custom";

export interface FeedPanelPrefs {
  collapsed: boolean;
}

export const FEED_PANEL_IDS: readonly FeedPanelId[] = [
  "summary",
  "live",
  "events",
  "news",
];

/**
 * Default Feed: Regulación on top, the live wall in its own full-width row
 * below it, then tournaments and news. Users can still drag panels together.
 */
export const DEFAULT_FEED_ROWS: FeedPanelId[][] = [
  ["summary"],
  ["live"],
  ["events"],
  ["news"],
];

export const DEFAULT_FEED_PANELS: Record<FeedPanelId, FeedPanelPrefs> = {
  summary: { collapsed: false },
  live: { collapsed: false },
  events: { collapsed: false },
  news: { collapsed: false },
};

/**
 * Rows are horizontal groups: `[["live", "news"], ["events"]]` renders live
 * and news side by side, with events on its own row below. Unknown, duplicate
 * or missing panels are repaired so the persisted layout always renders every
 * section exactly once.
 */
export function normalizeFeedRows(raw: unknown): FeedPanelId[][] {
  const source = Array.isArray(raw) ? raw : [];
  const seen = new Set<FeedPanelId>();
  const rows: FeedPanelId[][] = [];
  for (const entry of source) {
    const candidates = Array.isArray(entry) ? entry : [entry];
    const row: FeedPanelId[] = [];
    for (const value of candidates) {
      if (
        typeof value === "string" &&
        FEED_PANEL_IDS.includes(value as FeedPanelId)
      ) {
        const id = value as FeedPanelId;
        if (!seen.has(id)) {
          seen.add(id);
          row.push(id);
        }
      }
    }
    if (row.length > 0) rows.push(row);
  }
  for (const id of FEED_PANEL_IDS) {
    if (!seen.has(id)) rows.push([id]);
  }
  return rows;
}

/**
 * One-time repair for layouts saved before 0.5.0: live must start directly
 * below the regulation summary, never beside or above it. Other groups
 * (events + news) are kept.
 */
export function placeLiveBelowSummary(
  rows: FeedPanelId[][],
): FeedPanelId[][] {
  const summaryRow = rows.find((row) => row.includes("summary")) ?? [
    "summary",
  ];
  const summaryRest = summaryRow.filter(
    (id) => id !== "summary" && id !== "live",
  );
  // Keep the groups that did not contain the summary, without the live panel.
  const rest = rows
    .filter((row) => !row.includes("summary"))
    .map((row) => row.filter((id) => id !== "live"))
    .filter((row) => row.length > 0);
  return [
    ["summary"],
    ["live"],
    ...(summaryRest.length > 0 ? [summaryRest] : []),
    ...rest,
  ];
}

/** Missing or malformed panel preferences fall back to expanded. */
export function normalizeFeedPanels(
  raw: unknown,
): Record<FeedPanelId, FeedPanelPrefs> {
  const source =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out = {} as Record<FeedPanelId, FeedPanelPrefs>;
  for (const id of FEED_PANEL_IDS) {
    const entry =
      source[id] && typeof source[id] === "object"
        ? (source[id] as Record<string, unknown>)
        : {};
    out[id] = { collapsed: entry.collapsed === true };
  }
  return out;
}

export function feedLayoutMode(rows: FeedPanelId[][]): FeedLayoutMode {
  const visible = rows.filter((row) => row.length > 0);
  if (visible.length === 1 && visible[0].length > 1) return "horizontal";
  if (visible.every((row) => row.length === 1)) return "vertical";
  return "custom";
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
      feedRows: normalizeFeedRows(DEFAULT_FEED_ROWS),
      feedPanels: normalizeFeedPanels(DEFAULT_FEED_PANELS),
      sourceFilter: null,
      favoriteSource: null,
      dateRanges: {},
      setFormat: (format) => set({ format, formatPinned: true }),
      setFavoriteFormat: (favoriteFormat) =>
        set({ favoriteFormat, format: favoriteFormat, formatPinned: true }),
      setShowArchived: (showArchived) => set({ showArchived }),
      setDashboardView: (dashboardView) => set({ dashboardView }),
      setFeedRows: (feedRows) => set({ feedRows: normalizeFeedRows(feedRows) }),
      setFeedLayoutMode: (mode) => {
        const current = get().feedRows.flat();
        const ordered = [
          ...current,
          ...FEED_PANEL_IDS.filter((id) => !current.includes(id)),
        ];
        set({
          feedRows:
            mode === "horizontal"
              ? [ordered]
              : ordered.map((id) => [id]),
        });
      },
      setFeedCollapsed: (id, collapsed) =>
        set((state) => ({
          feedPanels: {
            ...state.feedPanels,
            [id]: { ...state.feedPanels[id], collapsed },
          },
        })),
      setAllFeedCollapsed: (collapsed) =>
        set((state) => {
          const feedPanels = { ...state.feedPanels };
          for (const id of FEED_PANEL_IDS) {
            feedPanels[id] = { ...feedPanels[id], collapsed };
          }
          return { feedPanels };
        }),
      resetFeedLayout: () =>
        set({
          feedRows: normalizeFeedRows(DEFAULT_FEED_ROWS),
          feedPanels: normalizeFeedPanels(DEFAULT_FEED_PANELS),
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
      version: 22,
      migrate: (persisted: unknown, version: number) => {
        const prior = (persisted ?? {}) as Record<string, unknown>;
        if (!(version >= 11)) {
          return {
            format: ACTIVE_FORMAT,
            favoriteFormat: ACTIVE_FORMAT,
            formatPinned: false,
            showArchived: true,
            topPokemonView: normalizeView(prior.topPokemonView),
            dashboardView: "feed",
            feedRows: normalizeFeedRows(DEFAULT_FEED_ROWS),
            feedPanels: normalizeFeedPanels(DEFAULT_FEED_PANELS),
            sourceFilter: null,
            favoriteSource: null,
            dateRanges: {},
          } as DashboardState;
        }
        const savedRows = normalizeFeedRows(prior.feedRows ?? prior.feedOrder);
        return {
          format: normalizeFormat(prior.format),
          favoriteFormat: normalizeFormat(prior.favoriteFormat ?? prior.format),
          formatPinned: Boolean(prior.formatPinned),
          showArchived: prior.showArchived !== false,
          topPokemonView: normalizeView(prior.topPokemonView),
          dashboardView:
            prior.dashboardView === "regulation" ? "regulation" : "feed",
          feedRows:
            version < 20 ? placeLiveBelowSummary(savedRows) : savedRows,
          feedPanels: normalizeFeedPanels(prior.feedPanels),
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
