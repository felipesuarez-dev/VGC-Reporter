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
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { Titlebar } from "./Titlebar";
import { ScrollToTop } from "../ui/ScrollToTop";
import { useUiStore } from "../../stores/uiStore";
import { APP_VERSION } from "../../lib/version";
import { useNavHistorySync } from "../../hooks/useNavHistorySync";

export function AppShell() {
  const { t } = useTranslation();
  useNavHistorySync();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

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
      <Titlebar />
      <div className="flex min-h-0 flex-1">
      <aside
        className={cn(
          "flex shrink-0 flex-col border-r transition-[width] duration-200",
          collapsed ? "w-16" : "w-60",
        )}
        style={{
          backgroundColor: "var(--bg-elev)",
          borderColor: "var(--border)",
        }}
      >
        <div
          className={cn(
            "relative flex items-center gap-3 border-b px-3 py-4",
            collapsed && "justify-center px-2",
          )}
          style={{ borderColor: "var(--border)" }}
        >
          <img
            src="/logo.png"
            alt="PumaSoft"
            className="h-9 w-9 shrink-0 rounded-full"
          />
          {!collapsed && (
            <div className="flex min-w-0 flex-col pr-6">
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
          <button
            type="button"
            onClick={toggleSidebar}
            className={cn(
              "absolute rounded-md p-1 transition-colors",
              "hover:bg-[var(--bg-elev-strong)]",
              collapsed ? "bottom-1 left-1/2 -translate-x-1/2" : "right-2 top-2",
            )}
            style={{ color: "var(--text-muted)" }}
            aria-label={
              collapsed ? t("ui.expand_sidebar") : t("ui.collapse_sidebar")
            }
            title={
              collapsed ? t("ui.expand_sidebar") : t("ui.collapse_sidebar")
            }
          >
            {collapsed ? (
              <ChevronsRight size={14} />
            ) : (
              <ChevronsLeft size={14} />
            )}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-2">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  title={collapsed ? item.label : undefined}
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
          className="border-t px-3 py-3 text-xs"
          style={{
            borderColor: "var(--border)",
            color: "var(--text-muted)",
          }}
        >
          {!collapsed && (
            <>
              <div>
                {t("app.version")} {APP_VERSION}
              </div>
              <div className="mt-0.5">{t("app.by")} PumaSoft</div>
            </>
          )}
        </div>
      </aside>
      <main id="app-main" className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <Outlet />
        </div>
      </main>
      </div>
      <ScrollToTop />
    </div>
  );
}
