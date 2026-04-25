import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  BookOpen,
  Wrench,
  Users,
  Trophy,
  Calculator,
  Settings as SettingsIcon,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { Titlebar } from "./Titlebar";
import { MobileTopbar } from "./MobileTopbar";
import { ScrollToTop } from "../ui/ScrollToTop";
import { useUiStore } from "../../stores/uiStore";
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
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches,
  );
  useNavHistorySync();
  useAutoUpdate(!isMobile);
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const sidebarWidthPx = useUiStore((s) => s.sidebarWidthPx);
  const setSidebarWidthPx = useUiStore((s) => s.setSidebarWidthPx);
  const [isResizing, setIsResizing] = useState(false);
  const [hoverHandle, setHoverHandle] = useState(false);
  const asideRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      if (e.matches) useUiStore.getState().setSidebarCollapsed(true);
    };
    mq.addEventListener("change", handler);
    if (mq.matches) useUiStore.getState().setSidebarCollapsed(true);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: MouseEvent) => {
      const left = asideRef.current?.getBoundingClientRect().left ?? 0;
      const delta = e.clientX - left;
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
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevUserSelect;
    };
  }, [isResizing, setSidebarWidthPx]);

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: t("nav.dashboard") },
    { to: "/pokedex", icon: BookOpen, label: t("nav.pokedex") },
    { to: "/team-builder", icon: Wrench, label: t("nav.team_builder") },
    { to: "/my-teams", icon: Users, label: t("nav.my_teams") },
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
      {!isMobile && <UpdaterErrorBanner />}
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
            "flex items-center gap-3 border-b px-3 py-4",
            collapsed && "justify-center px-2",
          )}
          style={{ borderColor: "var(--border)" }}
        >
          <img
            src="/logo.png"
            alt="PumaSoft"
            className="h-9 w-9 shrink-0 rounded-full object-cover"
          />
          {!collapsed && (
            <div className="flex min-w-0 flex-col">
              <span className="text-lg font-bold leading-tight tracking-tight">
                {t("app.name")}
              </span>
              <span
                className="whitespace-normal break-words text-[11px] leading-tight"
                style={{ color: "var(--text-muted)" }}
              >
                {t("app.tagline")}
              </span>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-2">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  title={collapsed ? item.label : undefined}
                  onClick={isMobile ? () => useUiStore.getState().setSidebarCollapsed(true) : undefined}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      collapsed && "justify-center px-2",
                      isActive
                        ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "text-[var(--text)] hover:bg-[var(--bg-elev-strong)]",
                    )
                  }
                >
                  <item.icon size={18} />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div
          className={cn(
            "border-t text-xs",
            collapsed ? "px-2 py-2 text-center text-[10px]" : "px-3 py-3",
          )}
          style={{
            borderColor: "var(--border)",
            color: "var(--text-muted)",
          }}
        >
          {collapsed ? (
            <span title={APP_VERSION}>{shortVersion(APP_VERSION)}</span>
          ) : (
            <>
              <div>
                {t("app.version")} {APP_VERSION}
              </div>
              <div className="mt-0.5">{t("app.by")} PumaSoft</div>
            </>
          )}
        </div>
        {!collapsed && !isMobile && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label={t("ui.resize_sidebar")}
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizing(true);
            }}
            onMouseEnter={() => setHoverHandle(true)}
            onMouseLeave={() => setHoverHandle(false)}
            onDoubleClick={() => setSidebarWidthPx(240)}
            className="absolute right-0 top-0 z-10 h-full w-1.5 cursor-col-resize transition-opacity"
            style={{
              backgroundColor: "var(--accent)",
              opacity: isResizing ? 0.6 : hoverHandle ? 0.35 : 0,
            }}
          />
        )}
      </aside>
      <main id="app-main" className="flex-1 overflow-y-auto">
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
      {!isMobile && <UpdaterModal />}
    </div>
  );
}
