import { useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Layers,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useUiStore } from "../../stores/uiStore";
import { useNavHistoryStore } from "../../stores/navHistoryStore";
import { useSearchStore } from "../../stores/searchStore";
import { useViewTabsStore } from "../../stores/viewTabsStore";
import { useViewTabActions } from "../../hooks/useViewTabActions";
import { useModalBack } from "../../hooks/useModalBack";
import { NAV_SECTIONS, sectionForPath } from "../../lib/navSections";
import { cn } from "../../lib/cn";

/**
 * Floating navigation for mobile: history arrows, search and the list of open
 * views — the hybrid "open views + quick accesses" model approved in the
 * mockup. It can sit fixed at the bottom or be dragged anywhere; there is
 * deliberately no corner variant. When enabled, the topbar drops its own
 * back/forward/search controls to avoid duplication.
 */
export function MobileNavDock() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const enabled = useUiStore((s) => s.mobileNavEnabled);
  const placement = useUiStore((s) => s.mobileNavPlacement);
  const position = useUiStore((s) => s.mobileNavPosition);
  const setPosition = useUiStore((s) => s.setMobileNavPosition);
  const entries = useNavHistoryStore((s) => s.entries);
  const index = useNavHistoryStore((s) => s.index);
  const views = useViewTabsStore((s) => s.views);
  const activeId = useViewTabsStore((s) => s.activeId);
  const { activate, create, close, openSection } = useViewTabActions();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(
    null,
  );
  const dockRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    dx: number;
    dy: number;
    width: number;
    height: number;
  } | null>(null);
  useModalBack(sheetOpen, () => setSheetOpen(false));

  if (!enabled) return null;

  const canBack = index > 0;
  const canForward = index >= 0 && index < entries.length - 1;
  const effectivePosition =
    placement === "free" ? (dragPosition ?? position) : null;

  const startDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (placement !== "free") return;
    const dock = dockRef.current;
    if (!dock) return;
    const rect = dock.getBoundingClientRect();
    dragRef.current = {
      dx: event.clientX - rect.left,
      dy: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    };
    setDragPosition({ x: rect.left, y: rect.top });
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const moveDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const x = Math.min(
      Math.max(6, event.clientX - drag.dx),
      window.innerWidth - drag.width - 6,
    );
    const y = Math.min(
      Math.max(6, event.clientY - drag.dy),
      window.innerHeight - drag.height - 6,
    );
    setDragPosition({ x, y });
  };

  const endDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    if (dragPosition) setPosition(dragPosition);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const selectView = (id: string) => {
    activate(id);
    setSheetOpen(false);
  };

  const handleCloseView = (id: string) => {
    close(id);
  };

  const dockStyle: React.CSSProperties =
    effectivePosition != null
      ? {
          left: effectivePosition.x,
          top: effectivePosition.y,
          bottom: "auto",
        }
      : {
          left: "50%",
          bottom: "max(12px, env(safe-area-inset-bottom, 0px))",
          transform: "translateX(-50%)",
        };

  return (
    <>
      <div
        ref={dockRef}
        className={cn(
          "fixed z-[41] flex items-center gap-0 rounded-full border p-[3px]",
          dragging ? "cursor-grabbing select-none" : "",
        )}
        style={{
          ...dockStyle,
          backgroundColor: "rgba(18,18,22,.94)",
          borderColor: "var(--border)",
          backdropFilter: "blur(18px)",
          boxShadow:
            "0 18px 45px -18px #000, inset 0 1px 0 rgba(255,255,255,.06)",
        }}
        role="navigation"
        aria-label={t("mobile_nav.title")}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          disabled={!canBack}
          className="flex h-[36px] w-[36px] items-center justify-center rounded-full transition-colors hover:bg-[var(--bg-elev-strong)] disabled:opacity-30"
          style={{ color: "var(--text-muted)" }}
          aria-label={t("titlebar.back")}
        >
          <ChevronLeft size={17} />
        </button>
        <button
          type="button"
          onClick={() => navigate(1)}
          disabled={!canForward}
          className="flex h-[36px] w-[36px] items-center justify-center rounded-full transition-colors hover:bg-[var(--bg-elev-strong)] disabled:opacity-30"
          style={{ color: "var(--text-muted)" }}
          aria-label={t("titlebar.forward")}
        >
          <ChevronRight size={17} />
        </button>
        <button
          type="button"
          onClick={() => useSearchStore.getState().setOpen(true)}
          className="flex h-[36px] w-[36px] items-center justify-center rounded-full transition-colors hover:bg-[var(--bg-elev-strong)]"
          style={{ color: "var(--text-muted)" }}
          aria-label={t("titlebar.search")}
        >
          <Search size={16} />
        </button>
        <button
          type="button"
          onClick={create}
          className="flex h-[36px] w-[36px] items-center justify-center rounded-full border border-dashed transition-colors hover:bg-[var(--accent-soft)]"
          style={{
            borderColor: "color-mix(in srgb, var(--accent) 45%, transparent)",
            color: "var(--accent)",
          }}
          aria-label={t("tabs.new")}
          title={t("tabs.new_hint")}
        >
          <Plus size={16} />
        </button>
        <span
          className="mx-[2px] h-[16px] w-px shrink-0"
          style={{ backgroundColor: "var(--border)" }}
        />
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="relative flex h-[36px] items-center gap-[3px] rounded-full px-[8px] transition-colors"
          style={{
            backgroundColor: "var(--accent-soft)",
            color: "var(--accent)",
          }}
          aria-label={t("mobile_nav.open_views")}
        >
          <Layers size={16} className="shrink-0" />
          <span
            className="flex h-[14px] min-w-[14px] shrink-0 items-center justify-center rounded-full px-[3px] text-[8px] font-bold"
            style={{
              backgroundColor: "var(--accent)",
              color: "var(--accent-contrast, #171102)",
            }}
          >
            {views.length}
          </span>
        </button>
        {placement === "free" && (
          <button
            type="button"
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className="flex h-[36px] w-[24px] cursor-grab touch-none items-center justify-center rounded-full active:cursor-grabbing"
            style={{ color: "var(--text-dim)" }}
            aria-label={t("mobile_nav.drag")}
            title={t("mobile_nav.drag")}
          >
            <GripVertical size={14} />
          </button>
        )}
      </div>

      {sheetOpen && (
        <div className="fixed inset-0 z-[80]">
          <div
            className="nav-scrim absolute inset-0 bg-black/60"
            onClick={() => setSheetOpen(false)}
          />
          <div
            className="nav-sheet absolute inset-x-2 bottom-2 flex max-h-[78vh] flex-col overflow-hidden rounded-3xl border shadow-2xl"
            style={{
              backgroundColor: "var(--bg-elev)",
              borderColor: "var(--border)",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
            role="dialog"
            aria-modal="true"
            aria-label={t("mobile_nav.open_views")}
          >
            <div className="mx-auto mt-2 h-1 w-10 rounded-full" style={{ backgroundColor: "var(--border)" }} />
            <header className="flex items-start justify-between gap-2 px-4 pb-2 pt-2">
              <div className="min-w-0">
                <h2 className="text-sm font-bold">{t("mobile_nav.open_views")}</h2>
                <p className="mt-0.5 text-[10px]" style={{ color: "var(--text-dim)" }}>
                  {t("mobile_nav.open_views_hint")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text-muted)",
                }}
                aria-label={t("common.close")}
              >
                <X size={15} />
              </button>
            </header>

            <div className="modal-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-4">
              <ul className="space-y-1.5">
                {views.map((view) => {
                  const section = sectionForPath(view.path);
                  const Icon = section?.icon ?? Layers;
                  const active = view.id === activeId;
                  return (
                    <li key={view.id}>
                      <div
                        className="flex items-center gap-2 rounded-xl border p-2"
                        style={{
                          borderColor: active ? "var(--accent)" : "var(--border)",
                          backgroundColor: active
                            ? "color-mix(in srgb, var(--accent) 8%, transparent)"
                            : "var(--bg)",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => selectView(view.id)}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                            style={{
                              backgroundColor: "var(--accent-soft)",
                              color: "var(--accent)",
                            }}
                          >
                            <Icon size={15} />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[11px] font-bold">
                              {t(view.labelKey)}
                            </span>
                            <span
                              className="block truncate text-[9px]"
                              style={{ color: "var(--text-dim)" }}
                            >
                              {view.path}
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCloseView(view.id)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                          style={{ color: "var(--text-dim)" }}
                          aria-label={t("mobile_nav.close_view")}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <button
                type="button"
                onClick={create}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed py-2 text-[11px] font-bold"
                style={{
                  borderColor: "color-mix(in srgb, var(--accent) 45%, transparent)",
                  backgroundColor: "color-mix(in srgb, var(--accent) 6%, transparent)",
                  color: "var(--accent)",
                }}
              >
                <Plus size={14} />
                {t("mobile_nav.new_view")}
              </button>

              <p
                className="mb-1.5 mt-4 text-[9px] font-bold uppercase tracking-[0.14em]"
                style={{ color: "var(--text-dim)" }}
              >
                {t("mobile_nav.open_section")}
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {NAV_SECTIONS.map((section) => {
                  const Icon = section.icon;
                  const active = sectionForPath(location.pathname)?.to === section.to;
                  return (
                    <button
                      key={section.to}
                      type="button"
                      onClick={() => openSection(section.to, section.labelKey)}
                      className="flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 text-[9px] font-bold transition-colors"
                      style={{
                        borderColor: active ? "var(--accent)" : "var(--border)",
                        backgroundColor: active
                          ? "color-mix(in srgb, var(--accent) 8%, transparent)"
                          : "var(--bg)",
                        color: active ? "var(--text)" : "var(--text-muted)",
                      }}
                    >
                      <Icon size={17} style={{ color: "var(--accent)" }} />
                      <span className="truncate">{t(section.labelKey)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
