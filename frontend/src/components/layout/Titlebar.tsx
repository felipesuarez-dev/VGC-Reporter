import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Copy,
  Minus,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Square,
  Grid3x3,
  X,
} from "lucide-react";
import { useNavHistoryStore } from "../../stores/navHistoryStore";
import { useSearchStore } from "../../stores/searchStore";
import { useUiStore } from "../../stores/uiStore";
import { useTypeLabStore } from "../../stores/typeLabStore";
import { useViewTabActions } from "../../hooks/useViewTabActions";
import { useRegulationCatalog } from "../../hooks/useRegulationCatalog";
import { DesktopTabStrip } from "./DesktopTabStrip";
import { TitlebarCalendarPanel } from "./TitlebarCalendarPanel";
import { LanguageCombobox } from "./LanguageCombobox";
import { ThemeSelect } from "./ThemeSelect";
import { routeLabel } from "../../lib/routes";

const TITLE = "VGC Reporter";

export function Titlebar() {
  const [maximized, setMaximized] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { create: createTab } = useViewTabActions();
  const { active } = useRegulationCatalog();
  const entries = useNavHistoryStore((s) => s.entries);
  const index = useNavHistoryStore((s) => s.index);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const quickTablesMode = useUiStore((s) => s.quickTablesMode);
  const calendarMode = useUiStore((s) => s.calendarMode);
  const backKey = routeLabel(entries[index - 1]);
  const forwardKey = routeLabel(entries[index + 1]);
  const backTitle = backKey ? t(backKey) : t("titlebar.back");
  const forwardTitle = forwardKey ? t(forwardKey) : t("titlebar.forward");
  const canBack = index > 0;
  const canForward = index >= 0 && index < entries.length - 1;

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const w = getCurrentWindow();
        const initial = await w.isMaximized();
        if (!cancelled) setMaximized(initial);
        const off = await w.onResized(async () => {
          const m = await w.isMaximized();
          if (!cancelled) setMaximized(m);
        });
        unlisten = off;
      } catch {
        /* not running in Tauri (e.g. pure Vite preview) */
      }
    })();
    return () => {
      cancelled = true;
      if (unlisten) unlisten();
    };
  }, []);

  const minimize = async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().minimize();
    } catch {
      /* no-op outside Tauri */
    }
  };

  const toggleMax = async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().toggleMaximize();
    } catch {
      /* no-op outside Tauri */
    }
  };

  const close = async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().close();
    } catch {
      /* no-op outside Tauri */
    }
  };

  return (
    <div
      data-tauri-drag-region
      className="flex h-[44px] shrink-0 select-none items-center border-b"
      style={{
        backgroundColor: "var(--bg-elev)",
        borderColor: "var(--border)",
        color: "var(--text-muted)",
      }}
    >
      <div
        data-tauri-drag-region
        className="flex shrink-0 items-center gap-2 px-3 text-xs font-medium"
      >
        <img
          src="/logo.png"
          alt=""
          aria-hidden
          className="h-4 w-4 rounded-full"
          draggable={false}
        />
        <span data-tauri-drag-region>{TITLE}</span>
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={
            sidebarCollapsed
              ? t("titlebar.expand_sidebar")
              : t("titlebar.collapse_sidebar")
          }
          title={
            sidebarCollapsed
              ? t("titlebar.expand_sidebar")
              : t("titlebar.collapse_sidebar")
          }
          className="flex h-full w-8 items-center justify-center hover:bg-[var(--bg-elev-strong)]"
          style={{ color: "var(--text)" }}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen size={14} />
          ) : (
            <PanelLeftClose size={14} />
          )}
        </button>
        <div
          className="flex h-full items-stretch border-l"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label={backTitle}
            title={backTitle}
            disabled={!canBack}
            className="flex h-full w-8 items-center justify-center hover:bg-[var(--bg-elev-strong)] disabled:opacity-40 disabled:hover:bg-transparent"
            style={{ color: "var(--text)" }}
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => navigate(1)}
            aria-label={forwardTitle}
            title={forwardTitle}
            disabled={!canForward}
            className="flex h-full w-8 items-center justify-center hover:bg-[var(--bg-elev-strong)] disabled:opacity-40 disabled:hover:bg-transparent"
            style={{ color: "var(--text)" }}
          >
            <ChevronRight size={14} />
          </button>
          <button
            type="button"
            onClick={() => useSearchStore.getState().setOpen(true)}
            aria-label={t("titlebar.search")}
            title={t("titlebar.search")}
            aria-keyshortcuts="Control+K Meta+K"
            className="flex h-full w-8 items-center justify-center hover:bg-[var(--bg-elev-strong)]"
            style={{ color: "var(--text)" }}
          >
            <Search size={14} />
          </button>
          <button
            type="button"
            onClick={createTab}
            aria-label={t("tabs.new")}
            title={t("tabs.new_hint")}
            className="flex h-full w-8 items-center justify-center hover:bg-[var(--bg-elev-strong)]"
            style={{ color: "var(--accent)" }}
          >
            <Plus size={14} />
          </button>
          {quickTablesMode === "titlebar" && (
            <button
              type="button"
              onClick={() => useTypeLabStore.getState().toggleOpen()}
              aria-label={t("type_lab.title")}
              title={t("type_lab.title")}
              className="flex h-full w-8 items-center justify-center hover:bg-[var(--bg-elev-strong)]"
              style={{ color: "var(--text)" }}
            >
              <Grid3x3 size={14} />
            </button>
          )}
          {calendarMode === "titlebar" && active && (
            <button
              type="button"
              data-titlebar-calendar
              onClick={() => setCalendarOpen((value) => !value)}
              aria-label={t("calendar.widget_title")}
              title={t("calendar.widget_title")}
              aria-expanded={calendarOpen}
              className="flex h-full w-8 items-center justify-center hover:bg-[var(--bg-elev-strong)]"
              style={{ color: calendarOpen ? "var(--accent)" : "var(--text)" }}
            >
              <CalendarDays size={14} />
            </button>
          )}
        </div>
      </div>
      <DesktopTabStrip />
      <div className="flex h-full shrink-0 items-stretch">
        <div className="flex items-center px-2">
          <ThemeSelect variant="titlebar" />
        </div>
        <div className="flex items-center px-2">
          <LanguageCombobox variant="titlebar" />
        </div>
        <div className="hidden md:contents">
          <button
            type="button"
            onClick={minimize}
            aria-label="Minimize"
            title="Minimize"
            className="flex h-full w-11 items-center justify-center hover:bg-[var(--bg-elev-strong)]"
            style={{ color: "var(--text)" }}
          >
            <Minus size={14} />
          </button>
          <button
            type="button"
            onClick={toggleMax}
            aria-label={maximized ? "Restore" : "Maximize"}
            title={maximized ? "Restore" : "Maximize"}
            className="flex h-full w-11 items-center justify-center hover:bg-[var(--bg-elev-strong)]"
            style={{ color: "var(--text)" }}
          >
            {maximized ? <Copy size={12} /> : <Square size={12} />}
          </button>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            title="Close"
            className="group flex h-full w-11 items-center justify-center hover:bg-red-600"
            style={{ color: "var(--text)" }}
          >
            <X size={14} className="group-hover:text-white" />
          </button>
        </div>
      </div>
      <TitlebarCalendarPanel
        open={calendarOpen}
        info={active}
        onClose={() => setCalendarOpen(false)}
      />
    </div>
  );
}
