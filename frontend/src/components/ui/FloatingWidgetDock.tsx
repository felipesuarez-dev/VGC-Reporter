import { useEffect, useState } from "react";
import {
  ArrowUp,
  CalendarDays,
  MoreVertical,
  Table2,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useUiStore } from "../../stores/uiStore";
import { useRegulationCatalog } from "../../hooks/useRegulationCatalog";
import { useModalBack } from "../../hooks/useModalBack";
import { useIsMobile } from "../../hooks/useIsMobile";
import { QuickTables } from "./QuickTables";
import { FeedCalendar } from "../dashboard/FeedCalendar";
import { cn } from "../../lib/cn";

type WidgetId = "tables" | "calendar";

/**
 * One vertical rail for the optional floating widgets and ScrollToTop. Keeping
 * them in the same object avoids the "two loose circles" look and guarantees
 * that neither the widgets nor the arrow cover each other.
 */
export function FloatingWidgetDock() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const calendarMode = useUiStore((s) => s.calendarMode);
  const quickTablesMode = useUiStore((s) => s.quickTablesMode);
  const grouped = useUiStore((s) => s.floatingWidgetsGrouped);
  const corner = useUiStore((s) => s.floatingWidgetsCorner);
  const defaultTab = useUiStore((s) => s.quickTablesDefaultTab);
  const mobileNavEnabled = useUiStore((s) => s.mobileNavEnabled);
  const { active } = useRegulationCatalog();
  const [open, setOpen] = useState<WidgetId | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showScroll, setShowScroll] = useState(false);
  useModalBack(Boolean(open), () => setOpen(null));

  useEffect(() => {
    const el = document.getElementById("app-main");
    if (!el) return;
    const update = () => setShowScroll(el.scrollTop > 300);
    update();
    el.addEventListener("scroll", update, { passive: true });
    return () => el.removeEventListener("scroll", update);
  }, []);

  const widgets: WidgetId[] = [];
  if (quickTablesMode === "floating") widgets.push("tables");
  if (calendarMode === "floating" && active) widgets.push("calendar");
  if (widgets.length === 0 && !showScroll) return null;

  const groupedMode = grouped && widgets.length > 1;
  const bottom =
    isMobile && mobileNavEnabled
      ? "calc(92px + env(safe-area-inset-bottom, 0px))"
      : "max(16px, env(safe-area-inset-bottom, 0px))";

  const scrollToTop = () => {
    document.getElementById("app-main")?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderWidget = (id: WidgetId) => {
    const Icon = id === "tables" ? Table2 : CalendarDays;
    const label =
      id === "tables" ? t("type_lab.quick_title") : t("calendar.widget_title");
    return (
      <button
        key={id}
        type="button"
        onClick={() => setOpen(id)}
        className="flex h-[42px] w-[42px] items-center justify-center rounded-full transition-colors hover:bg-[var(--accent-soft)]"
        style={{ color: "var(--accent)" }}
        title={label}
        aria-label={label}
      >
        <Icon size={18} />
      </button>
    );
  };

  return (
    <>
      <div
        className="fixed z-[40] flex w-[50px] flex-col items-center gap-1 rounded-full border p-1 shadow-lg"
        style={{
          right: corner === "bottom-left" ? undefined : 14,
          left: corner === "bottom-left" ? 14 : undefined,
          bottom,
          backgroundColor: "rgba(16,16,20,.94)",
          borderColor: "var(--border)",
          backdropFilter: "blur(18px)",
          boxShadow: "0 18px 40px -20px #000, inset 0 1px 0 rgba(255,255,255,.06)",
        }}
        aria-label={t("settings.group_widgets")}
      >
        <div
          className={cn(
            "flex w-full flex-col items-center gap-1 overflow-hidden transition-all duration-300 ease-out",
            groupedMode && !expanded
              ? "max-h-0 -translate-y-2 opacity-0"
              : "max-h-28 translate-y-0 opacity-100",
          )}
        >
          {widgets.map(renderWidget)}
        </div>

        {groupedMode && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="flex h-[42px] w-[42px] items-center justify-center rounded-full transition-colors"
            style={{
              backgroundColor: expanded ? "var(--accent)" : "var(--accent-soft)",
              color: expanded ? "var(--accent-contrast, #fff)" : "var(--accent)",
            }}
            title={expanded ? t("common.close") : t("settings.group_widgets")}
            aria-label={expanded ? t("common.close") : t("settings.group_widgets")}
            aria-expanded={expanded}
          >
            {expanded ? <X size={18} /> : <MoreVertical size={18} />}
          </button>
        )}

        {(widgets.length > 0 || showScroll) && (
          <span className="h-px w-5" style={{ backgroundColor: "var(--border)" }} />
        )}

        <button
          type="button"
          onClick={scrollToTop}
          className={cn(
            "flex h-[42px] w-[42px] items-center justify-center rounded-full transition-all duration-200",
            showScroll
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none h-0 opacity-0",
          )}
          style={{ color: "var(--text-muted)" }}
          title={t("common.scroll_to_top")}
          aria-label={t("common.scroll_to_top")}
        >
          <ArrowUp size={18} />
        </button>
      </div>

      {open === "tables" && (
        <div
          className="fixed inset-0 z-[73] flex items-center justify-center bg-black/65 p-3 sm:p-4"
          onClick={() => setOpen(null)}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border shadow-2xl"
            style={{ backgroundColor: "var(--bg-elev)", borderColor: "var(--border)" }}
            onClick={(event) => event.stopPropagation()}
          >
            <header
              className="flex items-center justify-between border-b px-4 py-3"
              style={{ borderColor: "var(--border)" }}
            >
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Table2 size={15} style={{ color: "var(--accent)" }} />
                {t("type_lab.quick_title")}
              </h2>
              <button
                type="button"
                className="rounded p-1"
                style={{ color: "var(--text-muted)" }}
                onClick={() => setOpen(null)}
                aria-label={t("common.close")}
              >
                <X size={16} />
              </button>
            </header>
            <div className="modal-scroll min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
              <QuickTables embedded defaultTab={defaultTab} />
            </div>
          </div>
        </div>
      )}

      {open === "calendar" && active && (
        <div
          className="fixed inset-0 z-[65] flex items-center justify-center bg-black/60 p-3 sm:p-4"
          onClick={() => setOpen(null)}
        >
          <div
            className="flex h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border shadow-2xl"
            style={{ backgroundColor: "var(--bg-elev)", borderColor: "var(--border)" }}
            onClick={(event) => event.stopPropagation()}
          >
            <header
              className="flex items-center justify-between border-b px-4 py-3"
              style={{ borderColor: "var(--border)" }}
            >
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <CalendarDays size={15} style={{ color: "var(--accent)" }} />
                {t("calendar.widget_title")}
              </h2>
              <button
                type="button"
                className="rounded p-1"
                style={{ color: "var(--text-muted)" }}
                onClick={() => setOpen(null)}
                aria-label={t("common.close")}
              >
                <X size={16} />
              </button>
            </header>
            <div className="modal-scroll min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
              <FeedCalendar info={active} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
