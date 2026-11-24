import type { LucideIcon } from "lucide-react";
import {
  Blocks,
  BookOpen,
  Calculator,
  GraduationCap,
  LayoutDashboard,
  Settings as SettingsIcon,
  Trophy,
  UsersRound,
} from "lucide-react";

export interface NavSection {
  to: string;
  labelKey: string;
  icon: LucideIcon;
}

/** Single source of truth for the sidebar, mobile views sheet and access grid. */
export const NAV_SECTIONS: NavSection[] = [
  { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { to: "/pokedex", labelKey: "nav.pokedex", icon: BookOpen },
  { to: "/team-builder", labelKey: "nav.team_builder", icon: Blocks },
  { to: "/my-teams", labelKey: "nav.my_teams", icon: UsersRound },
  { to: "/top-teams", labelKey: "nav.top_teams", icon: Trophy },
  { to: "/damage-calc", labelKey: "nav.damage_calc", icon: Calculator },
  { to: "/learn", labelKey: "nav.learn", icon: GraduationCap },
  { to: "/settings", labelKey: "nav.settings", icon: SettingsIcon },
];

export function sectionForPath(pathname: string): NavSection | undefined {
  return NAV_SECTIONS.find(
    (section) =>
      pathname === section.to || pathname.startsWith(`${section.to}/`),
  );
}
