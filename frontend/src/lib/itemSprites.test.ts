import { describe, expect, it } from "vitest";
import {
  itemSpriteSlug,
  itemSpriteUrl,
  itemSpriteUrls,
  showdownItemSpriteSlug,
} from "./itemSprites";

describe("item sprite names", () => {
  it("normalizes spaces, apostrophes and accents", () => {
    expect(itemSpriteSlug("Leftovers")).toBe("leftovers");
    expect(itemSpriteSlug("Assault Vest")).toBe("assault-vest");
    expect(itemSpriteSlug("King's Rock")).toBe("kings-rock");
    expect(itemSpriteSlug("Poké Ball")).toBe("poke-ball");
    expect(itemSpriteSlug("Heavy-Duty Boots")).toBe("heavy-duty-boots");
    expect(itemSpriteSlug("BrightPowder")).toBe("bright-powder");
    expect(itemSpriteSlug("TwistedSpoon")).toBe("twisted-spoon");
    expect(itemSpriteSlug("Leek")).toBe("stick");
    expect(showdownItemSpriteSlug("Leek")).toBe("leek");
  });

  it("builds the PokéAPI sprite URL", () => {
    expect(itemSpriteUrl("Focus Sash")).toBe(
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/focus-sash.png",
    );
  });

  it("offers mirrors in fallback order", () => {
    expect(itemSpriteUrls("Focus Sash")).toEqual([
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/focus-sash.png",
      "https://play.pokemonshowdown.com/sprites/itemicons/focus-sash.png",
      "https://img.pokemondb.net/sprites/items/focus-sash.png",
    ]);
  });
});
