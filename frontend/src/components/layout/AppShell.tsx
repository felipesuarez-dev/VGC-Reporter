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
import { LanguageToggle } from "./LanguageToggle";

const VERSION = "0.0.1.20260412";

export function AppShell() {
  const { t } = useTranslation();
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
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100">
      <aside className="flex w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-900">
        <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-4">
          <img
            src="/logo.png"
            alt="PumaSoft"
            className="h-9 w-9 shrink-0 rounded-full"
          />
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight">{t("app.name")}</span>
            <span className="text-xs text-slate-400">{t("app.tagline")}</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-brand-600/20 text-brand-300"
                        : "text-slate-300 hover:bg-slate-800",
                    )
                  }
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-slate-800 px-4 py-3 text-xs text-slate-500">
          <div className="flex items-center justify-between">
            <span>
              {t("app.version")} {VERSION}
            </span>
            <LanguageToggle />
          </div>
          <div className="mt-1">{t("app.by")} PumaSoft</div>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
