/**
 * Item sprites come from several community mirrors. The first source is the
 * most complete (PokéAPI), but a few legacy items live under an older slug and
 * some newer items are missing from one mirror but present in another, so the
 * UI tries each source in order before falling back to a neutral icon.
 */
function baseItemSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase()
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const POKEAPI_ALIASES: Record<string, string> = {
  // PokéAPI still ships the Gen 3 "Stick" sprite for the Leek item.
  leek: "stick",
};

export function itemSpriteSlug(name: string): string {
  const slug = baseItemSlug(name);
  return POKEAPI_ALIASES[slug] ?? slug;
}

/** Showdown uses the modern item name (`leek`), not PokéAPI's legacy alias. */
export function showdownItemSpriteSlug(name: string): string {
  return baseItemSlug(name);
}

export function itemSpriteUrls(name: string): string[] {
  const base = baseItemSlug(name);
  if (!base) return [];
  return [
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${
      POKEAPI_ALIASES[base] ?? base
    }.png`,
    `https://play.pokemonshowdown.com/sprites/itemicons/${base}.png`,
    `https://img.pokemondb.net/sprites/items/${base}.png`,
  ];
}

/** First-choice URL, kept for callers that only need one source. */
export function itemSpriteUrl(name: string): string {
  return itemSpriteUrls(name)[0] ?? "";
}
