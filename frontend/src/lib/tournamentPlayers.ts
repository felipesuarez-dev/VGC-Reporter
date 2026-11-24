import type { OfficialPlayerMatches } from "./types";

export function normalizePlayerName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * The official results feed sometimes truncates long names ("Masahiro T"),
 * while PokéData keeps the full name. Match exact first, then a unique prefix;
 * country is only a tie-breaker because the official feed can carry a stale
 * country code.
 */
export function findPlayerMatches(
  players: OfficialPlayerMatches[],
  name: string,
  country: string | null,
  place?: number | null,
): OfficialPlayerMatches | undefined {
  const normalized = normalizePlayerName(name);
  const exact = players.find(
    (player) => normalizePlayerName(player.player_name) === normalized,
  );
  if (exact) return exact;
  const candidates = players.filter((player) => {
    const candidate = normalizePlayerName(player.player_name);
    return candidate.startsWith(normalized) || normalized.startsWith(candidate);
  });
  if (candidates.length === 1) return candidates[0];
  const countryMatches = candidates.filter(
    (player) => country && player.country === country,
  );
  if (countryMatches.length === 1) return countryMatches[0];
  // Trainer names and real names often differ in the official feed. Both
  // tables use the same final placement, so it is the safest remaining key.
  if (place != null) {
    return players.find((player) => player.place === place);
  }
  return undefined;
}
