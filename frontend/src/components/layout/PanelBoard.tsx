import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/cn";

interface BoardContextValue {
  order: string[];
  dragId: string | null;
  overId: string | null;
  overAfter: boolean;
  moveBy: (id: string, delta: -1 | 1) => void;
}

const BoardContext = createContext<BoardContextValue | null>(null);

interface GroupProps {
  order: string[];
  onOrderChange: (order: string[]) => void;
  children: ReactNode;
  className?: string;
}

/**
 * Visual order is driven by CSS `order` inside a flex column, so panels keep
 * their state and iframes while the user drags. Pointer events are used
 * instead of HTML5 drag-and-drop so it also works on touch and WebView2.
 */
export function PanelOrderGroup({
  order,
  onOrderChange,
  children,
  className,
}: GroupProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [overAfter, setOverAfter] = useState(false);
  const dragRef = useRef<{
    id: string;
    pointerId: number;
    startY: number;
    active: boolean;
  } | null>(null);
  const overRef = useRef<{ id: string; after: boolean } | null>(null);

  const moveItem = useCallback(
    (sourceId: string, targetId: string, after: boolean) => {
      const next = order.filter((id) => id !== sourceId);
      const targetIndex = next.indexOf(targetId);
      if (targetIndex < 0) return;
      next.splice(after ? targetIndex + 1 : targetIndex, 0, sourceId);
      onOrderChange(next);
    },
    [onOrderChange, order],
  );

  const moveBy = useCallback(
    (id: string, delta: -1 | 1) => {
      const index = order.indexOf(id);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= order.length) return;
      const next = [...order];
      [next[index], next[target]] = [next[target], next[index]];
      onOrderChange(next);
    },
    [onOrderChange, order],
  );

  const beginDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const handle = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-panel-drag-handle]",
    );
    const id = handle?.dataset.panelDragHandle;
    if (!handle || !id || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    handle.setPointerCapture(event.pointerId);
    dragRef.current = {
      id,
      pointerId: event.pointerId,
      startY: event.clientY,
      active: false,
    };
  };

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const state = dragRef.current;
      if (!state || state.pointerId !== event.pointerId) return;
      if (!state.active) {
        if (Math.abs(event.clientY - state.startY) < 6) return;
        state.active = true;
        setDragId(state.id);
      }
      const target = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>("[data-panel-board-id]");
      const id = target?.dataset.panelBoardId;
      if (!target || !id || id === state.id) {
        overRef.current = null;
        setOverId(null);
        return;
      }
      const rect = target.getBoundingClientRect();
      const after = event.clientY > rect.top + rect.height / 2;
      overRef.current = { id, after };
      setOverId(id);
      setOverAfter(after);
    };
    const finish = (event: PointerEvent) => {
      const state = dragRef.current;
      if (!state || state.pointerId !== event.pointerId) return;
      if (state.active && overRef.current) {
        moveItem(state.id, overRef.current.id, overRef.current.after);
      }
      dragRef.current = null;
      overRef.current = null;
      setDragId(null);
      setOverId(null);
    };
    const cancel = () => {
      dragRef.current = null;
      overRef.current = null;
      setDragId(null);
      setOverId(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", cancel);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
    };
  }, [moveItem]);

  return (
    <BoardContext.Provider
      value={{ order, dragId, overId, overAfter, moveBy }}
    >
      <div
        className={cn("flex flex-col gap-4", className)}
        onPointerDown={beginDrag}
      >
        {children}
      </div>
    </BoardContext.Provider>
  );
}

export function PanelOrder({
  id,
  label,
  icon,
  children,
}: {
  id: string;
  label: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const context = useContext(BoardContext);
  if (!context) throw new Error("PanelOrder must be used inside PanelOrderGroup");
  const { order, dragId, overId, overAfter, moveBy } = context;
  const index = Math.max(0, order.indexOf(id));
  const isDragging = dragId === id;
  const isOver = overId === id;
  return (
    <div
      data-panel-board-id={id}
      style={{ order: index }}
      className={cn(
        "rounded-2xl transition-[box-shadow,opacity]",
        isDragging && "opacity-55",
        isOver &&
          "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg)]",
      )}
    >
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1.5 px-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <button
            type="button"
            data-panel-drag-handle={id}
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border",
              isDragging ? "cursor-grabbing" : "cursor-grab",
            )}
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--bg-elev)",
              color: "var(--text-dim)",
              touchAction: "none",
            }}
            title={t("ui.drag_panel")}
            aria-label={t("ui.drag_panel")}
          >
            <GripVertical size={13} />
          </button>
          {icon && (
            <span aria-hidden style={{ color: "var(--text-dim)" }}>
              {icon}
            </span>
          )}
          <span
            className="truncate text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: "var(--text-dim)" }}
          >
            {label}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded-md transition-colors enabled:hover:bg-[var(--bg-elev-strong)] disabled:opacity-30"
            style={{ color: "var(--text-muted)" }}
            onClick={() => moveBy(id, -1)}
            disabled={index === 0}
            title={t("feed.move_up")}
            aria-label={t("feed.move_up")}
          >
            <ArrowUp size={14} />
          </button>
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded-md transition-colors enabled:hover:bg-[var(--bg-elev-strong)] disabled:opacity-30"
            style={{ color: "var(--text-muted)" }}
            onClick={() => moveBy(id, 1)}
            disabled={index >= order.length - 1}
            title={t("feed.move_down")}
            aria-label={t("feed.move_down")}
          >
            <ArrowDown size={14} />
          </button>
        </div>
      </div>
      {children}
      {isOver && (
        <div
          aria-hidden
          className="pointer-events-none mx-1 h-0.5 rounded-full"
          style={{
            backgroundColor: "var(--accent)",
            marginTop: overAfter ? "-2px" : "4px",
          }}
        />
      )}
    </div>
  );
}
