import { canonicalSpeciesId, type PokemonUsage } from "./types";

export type EntityUsageKey = "top_items" | "top_moves" | "top_abilities";

export interface EntityUser {
  species: string;
  /** Adoption inside this Pokémon's own sets (0..100). */
  usagePercent: number;
  /** Contribution to the global team usage of the entity (0..100). */
  sharePercent: number;
  spriteUrl: string;
  fallbackUrl: string | null;
  homeUrl: string | null;
}

/**
 * Invert the per-Pokémon usage lists into "who uses this item/move/ability
 * most". Percentages are adoption within that Pokémon's own sets.
 */
export function buildEntityUsers(
  pokemon: PokemonUsage[],
  key: EntityUsageKey,
  limit = 3,
): Map<string, EntityUser[]> {
  const map = new Map<string, EntityUser[]>();
  for (const entry of pokemon) {
    for (const usage of entry[key] ?? []) {
      // A few mirror rows mix raw counts into usage_percent (e.g. 39993%).
      // Drop impossible adoption values instead of showing a misleading chip.
      if (
        !Number.isFinite(usage.usage_percent) ||
        usage.usage_percent <= 0 ||
        usage.usage_percent > 100.5
      ) {
        continue;
      }
      const entityKey = canonicalSpeciesId(usage.name);
      const users = map.get(entityKey) ?? [];
      const speciesShare = Number.isFinite(entry.usage_percent)
        ? Math.max(0, Math.min(100, entry.usage_percent))
        : 0;
      users.push({
        species: entry.species,
        usagePercent: usage.usage_percent,
        sharePercent: (speciesShare * usage.usage_percent) / 100,
        spriteUrl: entry.sprite_url,
        fallbackUrl: entry.sprite_fallback_url ?? null,
        homeUrl: entry.home_sprite_url ?? null,
      });
      map.set(entityKey, users);
    }
  }
  for (const [entityKey, users] of map) {
    users.sort(
      (a, b) =>
        b.sharePercent - a.sharePercent ||
        b.usagePercent - a.usagePercent ||
        a.species.localeCompare(b.species),
    );
    map.set(entityKey, users.slice(0, limit));
  }
  return map;
}
