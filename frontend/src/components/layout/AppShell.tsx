import { useEffect, useRef, useState } from "react";
import { useIsMobile } from "../../hooks/useIsMobile";
import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  BookOpen,
  Blocks,
  UsersRound,
  Trophy,
  Calculator,
  Settings as SettingsIcon,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { Titlebar } from "./Titlebar";
import { MobileTopbar } from "./MobileTopbar";
import { ScrollToTop } from "../ui/ScrollToTop";
import { useUiStore, SIDEBAR_WIDTH_DEFAULT } from "../../stores/uiStore";
import { APP_VERSION, shortVersion } from "../../lib/version";
import { useNavHistorySync } from "../../hooks/useNavHistorySync";
import { useAutoUpdate } from "../../hooks/useAutoUpdate";
import { PokemonDetailModal } from "../pokemon/PokemonDetailModal";
import { UpdaterModal } from "./UpdaterModal";
import { UpdaterErrorBanner } from "./UpdaterErrorBanner";
import { GlobalSearchPalette } from "../search/GlobalSearchPalette";
import { MoveDetailModal } from "../info/MoveDetailModal";
import { ItemDetailModal } from "../info/ItemDetailModal";
import { AbilityDetailModal } from "../info/AbilityDetailModal";

const SIDEBAR_COLLAPSED_WIDTH = 64;

export function AppShell() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  useNavHistorySync();
  useAutoUpdate(true);
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const sidebarWidthPx = useUiStore((s) => s.sidebarWidthPx);
  const setSidebarWidthPx = useUiStore((s) => s.setSidebarWidthPx);
  const [isResizing, setIsResizing] = useState(false);
  const [hoverHandle, setHoverHandle] = useState(false);
  const asideRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (isMobile) useUiStore.getState().setSidebarCollapsed(true);
  }, [isMobile]);

  useEffect(() => {
    if (!isResizing) return;
    const startedCollapsed = useUiStore.getState().sidebarCollapsed;
    const onMove = (e: MouseEvent) => {
      const left = asideRef.current?.getBoundingClientRect().left ?? 0;
      const delta = e.clientX - left;
      if (startedCollapsed) {
        if (delta >= 150) {
          useUiStore.getState().setSidebarCollapsed(false);
          setSidebarWidthPx(delta);
        }
        return;
      }
      if (delta < 150) {
        useUiStore.getState().setSidebarCollapsed(true);
        setIsResizing(false);
        return;
      }
      setSidebarWidthPx(delta);
    };
    const onUp = () => setIsResizing(false);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    const prevCursor = document.body.style.cursor;
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevUserSelect;
    };
  }, [isResizing, setSidebarWidthPx]);

  // Single source of truth for the sidebar icons. Swapping the icon set is a
  // one-line change per item; labels/tooltips come from i18n.
  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: t("nav.dashboard") },
    { to: "/pokedex", icon: BookOpen, label: t("nav.pokedex") },
    { to: "/team-builder", icon: Blocks, label: t("nav.team_builder") },
    { to: "/my-teams", icon: UsersRound, label: t("nav.my_teams") },
    { to: "/top-teams", icon: Trophy, label: t("nav.top_teams") },
    { to: "/damage-calc", icon: Calculator, label: t("nav.damage_calc") },
    { to: "/settings", icon: SettingsIcon, label: t("nav.settings") },
  ];

  return (
    <div
      className="flex h-screen w-screen flex-col"
      style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}
    >
      {isMobile ? <MobileTopbar /> : <Titlebar />}
      <UpdaterErrorBanner />
      <div className="flex min-h-0 flex-1">
      {isMobile && !collapsed && (
        <div
          className="fixed inset-0 z-30 bg-black/50"
          onClick={() => useUiStore.getState().setSidebarCollapsed(true)}
        />
      )}
      <aside
        ref={asideRef}
        className={cn(
          "flex shrink-0 flex-col border-r",
          isMobile ? "fixed inset-y-0 left-0 z-40" : "relative",
        )}
        style={{
          backgroundColor: "var(--bg-elev)",
          borderColor: "var(--border)",
          width: isMobile
            ? "280px"
            : collapsed
            ? `${SIDEBAR_COLLAPSED_WIDTH}px`
            : `${sidebarWidthPx}px`,
          transform: isMobile && collapsed ? "translateX(-100%)" : "translateX(0)",
          transition: isResizing ? "none" : "width 200ms ease, transform 220ms ease",
        }}
      >
        <div
          className={cn(
            "relative flex items-center gap-3 border-b px-4 py-4",
            collapsed && "justify-center px-2",
          )}
          style={{
            borderColor: "var(--border)",
            paddingTop: isMobile ? "max(env(safe-area-inset-top, 0px), 1rem)" : undefined,
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--accent-soft) 38%, transparent), transparent)",
          }}
        >
          <div className="relative shrink-0">
            <img
              src="/logo.png"
              alt="PumaSoft"
              className="h-10 w-10 rounded-full object-cover ring-1 ring-[var(--border)]"
            />
            {!collapsed && (
              <span
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2"
                style={{
                  backgroundColor: "var(--success)",
                  borderColor: "var(--bg-elev)",
                }}
              />
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1 pr-1">
              <div className="truncate text-[1.05rem] font-bold leading-tight tracking-tight">
                {t("app.name")}
              </div>
              <div
                className="mt-1 line-clamp-2 text-[10.5px] leading-snug"
                style={{ color: "var(--text-muted)" }}
                title={t("app.tagline")}
              >
                {t("app.tagline")}
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-3">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  title={collapsed ? item.label : undefined}
                  aria-label={collapsed ? item.label : undefined}
                  onClick={isMobile ? () => useUiStore.getState().setSidebarCollapsed(true) : undefined}
                  className={({ isActive }) =>
                    cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.82rem] font-medium transition-all duration-150",
                      collapsed && "justify-center px-2",
                      isActive
                        ? "bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[var(--accent-soft)]"
                        : "text-[var(--text-muted)] hover:bg-[var(--bg-elev-strong)] hover:text-[var(--text)]",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                          isActive
                            ? "bg-[var(--accent)] text-[var(--bg)] shadow-[0_6px_16px_-8px_var(--accent)]"
                            : "bg-[var(--bg-elev-strong)] text-[var(--text-muted)] group-hover:text-[var(--text)]",
                        )}
                      >
                        <item.icon
                          size={17}
                          strokeWidth={1.9}
                          aria-hidden
                        />
                      </span>
                      {!collapsed && (
                        <span className="min-w-0 whitespace-normal break-words leading-snug">
                          {item.label}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div
          className={cn("border-t px-3 py-3", collapsed && "px-2 py-2")}
          style={{
            borderColor: "var(--border)",
            paddingBottom: isMobile
              ? "max(env(safe-area-inset-bottom, 0px), 0.75rem)"
              : undefined,
          }}
        >
          {collapsed ? (
            <div
              className="truncate text-center text-[10px] font-semibold"
              style={{ color: "var(--text-muted)" }}
              title={APP_VERSION}
            >
              {shortVersion(APP_VERSION)}
            </div>
          ) : (
            <div
              className="rounded-xl px-3 py-2"
              style={{ backgroundColor: "var(--bg-elev-strong)" }}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className="text-[10px] uppercase tracking-wider"
                  style={{ color: "var(--text-dim)" }}
                >
                  {t("app.version")}
                </span>
                {APP_VERSION.includes("beta") && (
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                    style={{
                      backgroundColor: "var(--accent-soft)",
                      color: "var(--accent)",
                    }}
                  >
                    beta
                  </span>
                )}
              </div>
              <div
                className="mt-0.5 break-all text-[10px] font-semibold leading-tight"
                title={APP_VERSION}
              >
                {APP_VERSION}
              </div>
              <div
                className="mt-0.5 text-[10px]"
                style={{ color: "var(--text-muted)" }}
              >
                {t("app.by")} PumaSoft
              </div>
            </div>
          )}
        </div>
        {!isMobile && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label={t("ui.resize_sidebar")}
            title={t("ui.resize_sidebar")}
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizing(true);
            }}
            onMouseEnter={() => setHoverHandle(true)}
            onMouseLeave={() => setHoverHandle(false)}
            onDoubleClick={() => {
              useUiStore.getState().setSidebarCollapsed(false);
              setSidebarWidthPx(SIDEBAR_WIDTH_DEFAULT);
            }}
            className={cn(
              "group absolute -right-1 top-0 z-30 flex h-full w-4 cursor-ew-resize items-center justify-center",
            )}
          >
            <span
              className="h-16 w-[3px] rounded-full transition-opacity"
              style={{
                backgroundColor: "var(--accent)",
                opacity: isResizing ? 0.9 : hoverHandle ? 0.55 : 0,
              }}
            />
          </div>
        )}
      </aside>
      <main id="app-main" className="flex-1 overflow-y-auto" style={{ paddingBottom: isMobile ? "env(safe-area-inset-bottom, 0px)" : undefined }}>
        <div className="mx-auto max-w-7xl px-3 py-4 md:px-6 md:py-6">
          <Outlet />
        </div>
      </main>
      </div>
      <ScrollToTop />
      <PokemonDetailModal />
      <MoveDetailModal />
      <ItemDetailModal />
      <AbilityDetailModal />
      <GlobalSearchPalette />
      <UpdaterModal />
    </div>
  );
}
