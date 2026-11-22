import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Columns3,
  GripVertical,
  Loader2,
  Newspaper,
  PanelsTopLeft,
  Radio,
  RotateCcw,
  Rows3,
  type LucideIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { Format, RegulationInfo } from "../../lib/types";
import { cn } from "../../lib/cn";
import { ipc } from "../../lib/ipc";
import { queryKeys } from "../../lib/queryKeys";
import { useUpcomingTournaments } from "../../hooks/useUpcomingTournaments";
import { useUiStore } from "../../stores/uiStore";
import {
  DEFAULT_FEED_ROWS,
  FEED_PANEL_IDS,
  feedLayoutMode,
  useDashboardStore,
  type FeedPanelId,
} from "../../stores/dashboardStore";
import { useLiveStreams } from "../../hooks/useLiveStreams";
import { FeedSummaryCard } from "./FeedSummaryCard";
import { LiveStreamCard } from "./LiveStreamCard";
import { RegulationNews } from "./RegulationNews";
import { FeedSidePanel } from "./FeedSidePanel";

interface Props {
  format: Format;
  info: RegulationInfo | null;
}

type DropZone = "left" | "right" | "above" | "below";

const PANEL_META: Record<FeedPanelId, { icon: LucideIcon; labelKey: string }> = {
  summary: { icon: CalendarRange, labelKey: "feed.panel_summary" },
  live: { icon: Radio, labelKey: "feed.panel_live" },
  events: { icon: CalendarClock, labelKey: "feed.panel_events" },
  news: { icon: Newspaper, labelKey: "feed.panel_news" },
};

function FeedLoading() {
  const { t } = useTranslation();
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <div className="card flex items-center gap-3 p-5">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            backgroundColor: "var(--accent-soft)",
            color: "var(--accent)",
          }}
        >
          <Loader2 size={20} className="animate-spin" />
        </span>
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            {t("feed.loading_feed")}
          </p>
          <p className="text-[11px]" style={{ color: "var(--text-dim)" }}>
            {t("feed.loading_feed_hint")}
          </p>
        </div>
      </div>
      <div
        className="card h-28 animate-pulse"
        style={{ backgroundColor: "var(--bg-elev)" }}
      />
      <div
        className="card h-72 animate-pulse"
        style={{ backgroundColor: "var(--bg-elev)" }}
      />
      <div className="grid gap-3 lg:grid-cols-2">
        <div
          className="card h-64 animate-pulse"
          style={{ backgroundColor: "var(--bg-elev)" }}
        />
        <div
          className="card h-64 animate-pulse"
          style={{ backgroundColor: "var(--bg-elev)" }}
        />
      </div>
    </div>
  );
}

function rowClass(length: number): string {
  if (length <= 1) return "";
  if (length === 2) return "md:grid-cols-2";
  if (length === 3) return "lg:grid-cols-3";
  return "lg:grid-cols-2 2xl:grid-cols-4";
}

/**
 * The Feed is the "what is happening now" surface. Rows are horizontal
 * groups: dropping a panel on the side of another puts them side by side,
 * while dropping on the top/bottom edge creates a separate full-width row.
 * Every panel can be collapsed. The broadcast stays visible when offline so it
 * can say that no channel is live right now.
 *
 * The layout is persisted as rows, so "news + events together", "all three
 * together" and "everything separate" are all just different row shapes.
 */
export function RegulationFeed({ info }: Props) {
  const { t } = useTranslation();
  const feedRows = useDashboardStore((s) => s.feedRows);
  const feedPanels = useDashboardStore((s) => s.feedPanels);
  const setFeedRows = useDashboardStore((s) => s.setFeedRows);
  const setFeedLayoutMode = useDashboardStore((s) => s.setFeedLayoutMode);
  const setFeedCollapsed = useDashboardStore((s) => s.setFeedCollapsed);
  const setAllFeedCollapsed = useDashboardStore((s) => s.setAllFeedCollapsed);
  const resetFeedLayout = useDashboardStore((s) => s.resetFeedLayout);
  const live = useLiveStreams();
  const upcomingCountry = useUiStore((s) => s.upcomingCountry);
  const upcoming = useUpcomingTournaments(upcomingCountry);
  const news = useQuery({
    queryKey: queryKeys.regulationNews,
    queryFn: () => ipc.getRegulationNews(),
    staleTime: 15 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
    retry: 1,
  });
  const feedLoading =
    live.isLoading || upcoming.isLoading || news.isLoading;
  const liveIsOn = live.data?.some((screen) => screen.live) ?? false;
  const [dragId, setDragId] = useState<FeedPanelId | null>(null);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(
    null,
  );
  const dragRef = useRef<{
    id: FeedPanelId;
    pointerId: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
    active: boolean;
  } | null>(null);
  const [drop, setDrop] = useState<{ id: FeedPanelId; zone: DropZone } | null>(
    null,
  );
  const dropZoneAt = (
    x: number,
    y: number,
    rect: DOMRect,
  ): DropZone => {
    const px = (x - rect.left) / Math.max(1, rect.width);
    const py = (y - rect.top) / Math.max(1, rect.height);
    // The center groups the panels in the same row; the edges decide whether
    // the dragged panel goes before/after (sides) or in a new row (top/bottom).
    if (px > 0.3 && px < 0.7 && py > 0.3 && py < 0.7) return "right";
    const distances: [DropZone, number][] = [
      ["left", px],
      ["right", 1 - px],
      ["above", py],
      ["below", 1 - py],
    ];
    distances.sort((a, b) => a[1] - b[1]);
    return distances[0][0];
  };

  const resolveDropAt = (
    x: number,
    y: number,
  ): { id: FeedPanelId; zone: DropZone } | null => {
    const source = dragRef.current?.id;
    if (!source) return null;
    const element = document.elementFromPoint(x, y) as HTMLElement | null;
    const panel = element?.closest<HTMLElement>("[data-feed-panel]");
    const id = panel?.dataset.feedPanel as FeedPanelId | undefined;
    if (!panel || !id || id === source) return null;
    return { id, zone: dropZoneAt(x, y, panel.getBoundingClientRect()) };
  };

  const applyMove = (
    sourceId: FeedPanelId,
    targetId: FeedPanelId,
    zone: DropZone,
  ) => {
    if (sourceId === targetId) return;
    const cleaned = feedRows
      .map((row) => row.filter((id) => id !== sourceId))
      .filter((row) => row.length > 0);
    const targetRow = cleaned.findIndex((row) => row.includes(targetId));
    if (targetRow < 0) return;
    if (zone === "above" || zone === "below") {
      cleaned.splice(targetRow + (zone === "below" ? 1 : 0), 0, [sourceId]);
    } else {
      const row = [...cleaned[targetRow]];
      const targetIndex = row.indexOf(targetId);
      row.splice(targetIndex + (zone === "left" ? 0 : 1), 0, sourceId);
      cleaned[targetRow] = row;
    }
    setFeedRows(cleaned);
  };

  const beginPointerDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
    id: FeedPanelId,
  ) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = {
      id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      active: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const movePointerDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = dragRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    state.x = event.clientX;
    state.y = event.clientY;
    if (!state.active) {
      if (Math.hypot(state.x - state.startX, state.y - state.startY) < 6) {
        return;
      }
      state.active = true;
      setDragId(state.id);
    }
    setDragPoint({ x: state.x, y: state.y });
    setDrop(resolveDropAt(state.x, state.y));
  };

  const finishPointerDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = dragRef.current;
    if (!state) return;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // The pointer may already be released after leaving the window.
    }
    state.x = event.clientX;
    state.y = event.clientY;
    if (state.active) {
      const target = resolveDropAt(state.x, state.y);
      if (target) applyMove(state.id, target.id, target.zone);
    }
    dragRef.current = null;
    setDragId(null);
    setDragPoint(null);
    setDrop(null);
  };

  const cancelPointerDrag = () => {
    dragRef.current = null;
    setDragId(null);
    setDragPoint(null);
    setDrop(null);
  };

  useEffect(() => {
    if (!dragId) return;
    const main = document.getElementById("app-main");
    if (!main) return;
    const timer = window.setInterval(() => {
      const state = dragRef.current;
      if (!state?.active) return;
      const rect = main.getBoundingClientRect();
      const margin = 80;
      let delta = 0;
      if (state.y < rect.top + margin) delta = -16;
      else if (state.y > rect.bottom - margin) delta = 16;
      if (delta !== 0) {
        main.scrollTop += delta;
        setDrop(resolveDropAt(state.x, state.y));
      }
    }, 45);
    return () => window.clearInterval(timer);
  }, [dragId]);

  useEffect(() => {
    if (!dragId) return;
    const previous = document.body.style.cursor;
    document.body.style.cursor = "move";
    return () => {
      document.body.style.cursor = previous;
    };
  }, [dragId]);

  if (!info) {
    return (
      <section className="card">
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>
          {t("common.loading")}
        </p>
      </section>
    );
  }

  const mode = feedLayoutMode(feedRows);
  const anyExpanded = FEED_PANEL_IDS.some((id) => !feedPanels[id].collapsed);
  const isDefaultRows =
    feedRows.length === DEFAULT_FEED_ROWS.length &&
    feedRows.every(
      (row, rowIndex) =>
        row.length === DEFAULT_FEED_ROWS[rowIndex].length &&
        row.every((id, index) => id === DEFAULT_FEED_ROWS[rowIndex][index]),
    );
  const isCustomLayout =
    !isDefaultRows || FEED_PANEL_IDS.some((id) => feedPanels[id].collapsed);

  const moveRow = (rowIndex: number, delta: -1 | 1) => {
    const target = rowIndex + delta;
    if (target < 0 || target >= feedRows.length) return;
    const next = feedRows.map((row) => [...row]);
    const [row] = next.splice(rowIndex, 1);
    next.splice(target, 0, row);
    setFeedRows(next);
  };

  if (feedLoading) {
    return <FeedLoading />;
  }

  return (
    <div className={cn("space-y-3", dragId && "select-none")}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex overflow-hidden rounded-md border"
            style={{ borderColor: "var(--border)" }}
          >
            <button
              type="button"
              className="flex h-7 items-center gap-1 px-2 text-[10px] font-medium transition-colors"
              style={{
                backgroundColor:
                  mode === "vertical" ? "var(--accent-soft)" : "transparent",
                color:
                  mode === "vertical" ? "var(--accent)" : "var(--text-muted)",
              }}
              onClick={() => setFeedLayoutMode("vertical")}
              title={t("feed.layout_vertical_hint")}
              aria-pressed={mode === "vertical"}
            >
              <Rows3 size={12} />
              {t("feed.layout_vertical")}
            </button>
            <button
              type="button"
              className="flex h-7 items-center gap-1 px-2 text-[10px] font-medium transition-colors"
              style={{
                backgroundColor:
                  mode === "horizontal" ? "var(--accent-soft)" : "transparent",
                color:
                  mode === "horizontal" ? "var(--accent)" : "var(--text-muted)",
              }}
              onClick={() => setFeedLayoutMode("horizontal")}
              title={t("feed.layout_horizontal_hint")}
              aria-pressed={mode === "horizontal"}
            >
              <Columns3 size={12} />
              {t("feed.layout_horizontal")}
            </button>
            {mode === "custom" && (
              <span
                className="flex h-7 w-7 items-center justify-center"
                style={{
                  backgroundColor: "var(--accent-soft)",
                  color: "var(--accent)",
                }}
                title={t("feed.layout_custom")}
                aria-label={t("feed.layout_custom")}
                aria-current="true"
              >
                <PanelsTopLeft size={13} />
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className="hidden text-[10px] lg:inline"
            style={{ color: "var(--text-dim)" }}
            title={t("feed.drag_help")}
          >
            {t("feed.drag_hint")}
          </span>
          <button
            type="button"
            className="btn-ghost h-7 text-[10px]"
            onClick={() => setAllFeedCollapsed(anyExpanded)}
            title={anyExpanded ? t("feed.collapse_all") : t("feed.expand_all")}
          >
            {anyExpanded ? (
              <ChevronsDownUp size={12} className="mr-1" />
            ) : (
              <ChevronsUpDown size={12} className="mr-1" />
            )}
            {anyExpanded ? t("feed.collapse_all") : t("feed.expand_all")}
          </button>
          {isCustomLayout && (
            <button
              type="button"
              className="btn-ghost h-7 text-[10px]"
              onClick={resetFeedLayout}
            >
              <RotateCcw size={11} className="mr-1" />
              {t("feed.reset_layout")}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {feedRows.map((row, rowIndex) => (
          <div key={rowIndex} className={cn("grid gap-3", rowClass(row.length))}>
            {row.map((panelId) => {
              const { icon: Icon, labelKey } = PANEL_META[panelId];
              const prefs = feedPanels[panelId];
              const label = t(labelKey);
              const collapsed = prefs.collapsed;
              const dragging = dragId === panelId;
              const marker = drop?.id === panelId && dragId !== panelId;
              const toggleCollapsed = () => {
                setFeedCollapsed(panelId, !collapsed);
              };

              return (
                <div
                  key={panelId}
                  className="relative self-start"
                  data-feed-panel={panelId}
                  data-drag-source={dragId ?? undefined}
                  data-drop-zone={drop?.id === panelId ? drop.zone : undefined}
                >
                  {marker && drop?.zone === "left" && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -left-1.5 inset-y-0 w-0.5 rounded-full"
                      style={{ backgroundColor: "var(--accent)" }}
                    />
                  )}
                  {marker && drop?.zone === "right" && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -right-1.5 inset-y-0 w-0.5 rounded-full"
                      style={{ backgroundColor: "var(--accent)" }}
                    />
                  )}
                  {marker && drop?.zone === "above" && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 -top-2 h-0.5 rounded-full"
                      style={{ backgroundColor: "var(--accent)" }}
                    />
                  )}
                  {marker && drop?.zone === "below" && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 -bottom-2 h-0.5 rounded-full"
                      style={{ backgroundColor: "var(--accent)" }}
                    />
                  )}

                  <div
                    className={cn(
                      "transition-opacity",
                      dragging && "opacity-40",
                    )}
                  >
                    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1.5 px-1">
                      <div
                        data-feed-drag="true"
                        onPointerDown={(event) =>
                          beginPointerDrag(event, panelId)
                        }
                        onPointerMove={movePointerDrag}
                        onPointerUp={finishPointerDrag}
                        onPointerCancel={cancelPointerDrag}
                        className="flex min-w-0 cursor-move touch-none select-none items-center gap-1.5"
                        title={t("feed.drag_panel")}
                      >
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-md border"
                          style={{
                            borderColor: "var(--border)",
                            backgroundColor: "var(--bg-elev)",
                            color: "var(--text-dim)",
                          }}
                          aria-hidden
                        >
                          <GripVertical size={13} />
                        </span>
                        <Icon
                          size={12}
                          aria-hidden
                          style={{ color: "var(--text-dim)" }}
                        />
                        <span
                          className="truncate text-[10px] font-semibold uppercase tracking-wide"
                          style={{ color: "var(--text-dim)" }}
                        >
                          {label}
                        </span>
                        {panelId === "live" && !liveIsOn && live.isSuccess && (
                          <span
                            className="rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wide"
                            style={{
                              backgroundColor: "var(--bg-elev-strong)",
                              color: "var(--text-dim)",
                            }}
                          >
                            {t("feed.offline")}
                          </span>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          className="flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-elev-strong)]"
                          style={{ color: "var(--text-muted)" }}
                          onClick={toggleCollapsed}
                          title={
                            collapsed ? t("feed.expand") : t("feed.collapse")
                          }
                          aria-label={
                            collapsed ? t("feed.expand") : t("feed.collapse")
                          }
                          aria-expanded={!collapsed}
                        >
                          {collapsed ? (
                            <ChevronRight size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          )}
                        </button>
                        <button
                          type="button"
                          className="flex h-6 w-6 items-center justify-center rounded-md transition-colors enabled:hover:bg-[var(--bg-elev-strong)] disabled:opacity-30"
                          style={{ color: "var(--text-muted)" }}
                          onClick={() => moveRow(rowIndex, -1)}
                          disabled={rowIndex === 0}
                          title={t("feed.move_up")}
                          aria-label={t("feed.move_up")}
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          className="flex h-6 w-6 items-center justify-center rounded-md transition-colors enabled:hover:bg-[var(--bg-elev-strong)] disabled:opacity-30"
                          style={{ color: "var(--text-muted)" }}
                          onClick={() => moveRow(rowIndex, 1)}
                          disabled={rowIndex === feedRows.length - 1}
                          title={t("feed.move_down")}
                          aria-label={t("feed.move_down")}
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>
                    </div>

                    {!collapsed && (
                      <>
                        {panelId === "summary" && <FeedSummaryCard info={info} />}
                        {panelId === "live" && (
                          <LiveStreamCard dragging={dragId !== null} />
                        )}
                        {panelId === "events" && (
                          <FeedSidePanel info={info} />
                        )}
                        {panelId === "news" && (
                          <RegulationNews compact={row.length > 1} />
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {dragId && dragPoint && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-[70] flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold shadow-xl"
          style={{
            left: dragPoint.x + 14,
            top: dragPoint.y + 14,
            backgroundColor: "var(--bg-elev-strong)",
            borderColor: "var(--accent)",
            color: "var(--accent)",
          }}
        >
          <GripVertical size={11} />
          {t(PANEL_META[dragId].labelKey)}
        </div>
      )}
    </div>
  );
}
