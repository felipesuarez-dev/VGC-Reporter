import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Columns3,
  GripVertical,
  PanelsTopLeft,
  RotateCcw,
  Rows3,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/cn";
import {
  panelLayoutMode,
  type FeedPanelPrefs,
} from "../../stores/dashboardStore";

export interface PanelBoardItem {
  label: string;
  icon?: ReactNode;
  badge?: ReactNode;
}

interface Props<T extends string> {
  rows: T[][];
  panelIds: readonly T[];
  items: Record<T, PanelBoardItem>;
  prefs: Record<T, FeedPanelPrefs>;
  onRowsChange: (rows: T[][]) => void;
  onToggle: (id: T, collapsed: boolean) => void;
  onAllCollapsed: (collapsed: boolean) => void;
  onReset: () => void;
  renderPanel: (id: T, dragging: boolean) => ReactNode;
  className?: string;
}

type DropZone = "left" | "right" | "above" | "below";

function rowClass(length: number): string {
  if (length <= 1) return "grid-cols-1";
  if (length === 2) return "md:grid-cols-2";
  if (length === 3) return "lg:grid-cols-3";
  return "lg:grid-cols-2 2xl:grid-cols-4";
}

/**
 * Shared dockable board for every Dashboard view. It keeps the original
 * Novedades behavior (Separados/Juntos, rows, drag & drop, collapse and
 * persisted layout) and exposes the same controls to Torneos, Métricas and
 * Regulación.
 */
export function PanelBoard<T extends string>({
  rows,
  panelIds,
  items,
  prefs,
  onRowsChange,
  onToggle,
  onAllCollapsed,
  onReset,
  renderPanel,
  className,
}: Props<T>) {
  const { t } = useTranslation();
  const [dragId, setDragId] = useState<T | null>(null);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(
    null,
  );
  const dragRef = useRef<{
    id: T;
    pointerId: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
    active: boolean;
  } | null>(null);
  const [drop, setDrop] = useState<{ id: T; zone: DropZone } | null>(null);

  const dropZoneAt = (x: number, y: number, rect: DOMRect): DropZone => {
    const px = (x - rect.left) / Math.max(1, rect.width);
    const py = (y - rect.top) / Math.max(1, rect.height);
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
  ): { id: T; zone: DropZone } | null => {
    const source = dragRef.current?.id;
    if (!source) return null;
    const element = document.elementFromPoint(x, y) as HTMLElement | null;
    const panel = element?.closest<HTMLElement>("[data-panel-board-id]");
    const id = panel?.dataset.panelBoardId as T | undefined;
    if (!panel || !id || id === source) return null;
    return { id, zone: dropZoneAt(x, y, panel.getBoundingClientRect()) };
  };

  const applyMove = (sourceId: T, targetId: T, zone: DropZone) => {
    if (sourceId === targetId) return;
    const cleaned = rows
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
    onRowsChange(cleaned);
  };

  const beginPointerDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
    id: T,
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

  const mode = panelLayoutMode(rows);
  const anyExpanded = panelIds.some((id) => !prefs[id]?.collapsed);
  const isCustomLayout =
    mode === "custom" || panelIds.some((id) => prefs[id]?.collapsed);

  const setLayout = (next: "vertical" | "horizontal") => {
    const seen = new Set<T>();
    const flat: T[] = [];
    for (const row of rows) {
      for (const id of row) {
        if (panelIds.includes(id) && !seen.has(id)) {
          seen.add(id);
          flat.push(id);
        }
      }
    }
    for (const id of panelIds) {
      if (!seen.has(id)) flat.push(id);
    }
    onRowsChange(next === "horizontal" ? [flat] : flat.map((id) => [id]));
  };

  const moveRow = (rowIndex: number, delta: -1 | 1) => {
    const target = rowIndex + delta;
    if (target < 0 || target >= rows.length) return;
    const next = rows.map((row) => [...row]);
    const [row] = next.splice(rowIndex, 1);
    next.splice(target, 0, row);
    onRowsChange(next);
  };

  return (
    <div className={cn("space-y-3", dragId && "select-none", className)}>
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
              onClick={() => setLayout("vertical")}
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
              onClick={() => setLayout("horizontal")}
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
            onClick={() => onAllCollapsed(anyExpanded)}
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
            <button type="button" className="btn-ghost h-7 text-[10px]" onClick={onReset}>
              <RotateCcw size={11} className="mr-1" />
              {t("feed.reset_layout")}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className={cn("grid grid-cols-1 gap-3", rowClass(row.length))}>
            {row.map((panelId) => {
              const meta = items[panelId];
              if (!meta) return null;
              const collapsed = prefs[panelId]?.collapsed ?? false;
              const dragging = dragId === panelId;
              const marker = drop?.id === panelId && dragId !== panelId;
              return (
                <div
                  key={panelId}
                  className="relative min-w-0 self-start"
                  data-panel-board-id={panelId}
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

                  <div className={cn("min-w-0 transition-opacity", dragging && "opacity-40")}>
                    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1.5 px-1">
                      <div
                        data-panel-drag-handle={panelId}
                        onPointerDown={(event) => beginPointerDrag(event, panelId)}
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
                        {meta.icon && (
                          <span aria-hidden style={{ color: "var(--text-dim)" }}>
                            {meta.icon}
                          </span>
                        )}
                        <span
                          className="truncate text-[10px] font-semibold uppercase tracking-wide"
                          style={{ color: "var(--text-dim)" }}
                        >
                          {meta.label}
                        </span>
                        {meta.badge}
                      </div>

                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          className="flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-elev-strong)]"
                          style={{ color: "var(--text-muted)" }}
                          onClick={() => onToggle(panelId, !collapsed)}
                          title={collapsed ? t("feed.expand") : t("feed.collapse")}
                          aria-label={collapsed ? t("feed.expand") : t("feed.collapse")}
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
                          disabled={rowIndex === rows.length - 1}
                          title={t("feed.move_down")}
                          aria-label={t("feed.move_down")}
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>
                    </div>

                    {!collapsed && renderPanel(panelId, dragId !== null)}
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
          {items[dragId]?.label}
        </div>
      )}
    </div>
  );
}
