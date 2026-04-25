import { useEffect, useState } from "react";
import { matchPath, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Minus,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Square,
  X,
} from "lucide-react";
import { useNavHistoryStore } from "../../stores/navHistoryStore";
import { useSearchStore } from "../../stores/searchStore";
import { useUiStore } from "../../stores/uiStore";
import { LanguageToggle } from "./LanguageToggle";
import { ThemeSelect } from "./ThemeSelect";

const TITLE = "VGC Reporter";

const ROUTE_I18N: { pattern: string; key: string }[] = [
  { pattern: "/dashboard", key: "nav.dashboard" },
  { pattern: "/pokedex", key: "nav.pokedex" },
  { pattern: "/team-builder", key: "nav.team_builder" },
  { pattern: "/team-builder/:id", key: "nav.team_builder" },
  { pattern: "/my-teams", key: "nav.my_teams" },
  { pattern: "/top-teams", key: "nav.top_teams" },
  { pattern: "/damage-calc", key: "nav.damage_calc" },
  { pattern: "/settings", key: "nav.settings" },
];

function routeLabel(path: string | undefined): string | null {
  if (!path) return null;
  for (const { pattern, key } of ROUTE_I18N) {
    if (matchPath({ path: pattern, end: true }, path)) return key;
  }
  return null;
}

export function Titlebar() {
  const [maximized, setMaximized] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const entries = useNavHistoryStore((s) => s.entries);
  const index = useNavHistoryStore((s) => s.index);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
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
      className="flex h-8 shrink-0 select-none items-center justify-between border-b"
      style={{
        backgroundColor: "var(--bg-elev)",
        borderColor: "var(--border)",
        color: "var(--text-muted)",
      }}
    >
      <div
        data-tauri-drag-region
        className="flex items-center gap-2 px-3 text-xs font-medium"
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
        </div>
      </div>
      <div className="flex h-full items-stretch">
        <div className="flex items-center px-2">
          <ThemeSelect variant="titlebar" />
        </div>
        <div className="flex items-center px-2">
          <LanguageToggle variant="titlebar" />
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
    </div>
  );
}
