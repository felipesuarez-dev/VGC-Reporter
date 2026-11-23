import { matchPath } from "react-router-dom";

export const ROUTE_I18N: { pattern: string; key: string }[] = [
  { pattern: "/dashboard", key: "nav.dashboard" },
  { pattern: "/learn", key: "nav.learn" },
  { pattern: "/pokedex", key: "nav.pokedex" },
  { pattern: "/team-builder", key: "nav.team_builder" },
  { pattern: "/team-builder/:id", key: "nav.team_builder" },
  { pattern: "/my-teams", key: "nav.my_teams" },
  { pattern: "/top-teams", key: "nav.top_teams" },
  { pattern: "/damage-calc", key: "nav.damage_calc" },
  { pattern: "/settings", key: "nav.settings" },
];

export function routeLabel(path: string | undefined): string | null {
  if (!path) return null;
  for (const { pattern, key } of ROUTE_I18N) {
    if (matchPath({ path: pattern, end: true }, path)) return key;
  }
  return null;
}
