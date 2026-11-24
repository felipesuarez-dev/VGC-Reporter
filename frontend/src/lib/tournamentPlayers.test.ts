import { describe, expect, it } from "vitest";
import type { OfficialPlayerMatches } from "./types";
import { findPlayerMatches, normalizePlayerName } from "./tournamentPlayers";

function player(
  name: string,
  country: string | null,
  place = 1,
): OfficialPlayerMatches {
  return {
    player_name: name,
    country,
    place,
    record: "14-2-0",
    matches: [],
    team: [],
  };
}

describe("findPlayerMatches", () => {
  it("normalizes accents and punctuation", () => {
    expect(normalizePlayerName("  Daniel Nuñez ")).toBe("danielnunez");
    expect(normalizePlayerName("FABIO Ricardo")).toBe("fabioricardo");
  });

  it("matches the full name exactly", () => {
    const players = [player("Emilio Forbes", "US")];
    expect(findPlayerMatches(players, "Emilio Forbes", "US")?.player_name).toBe(
      "Emilio Forbes",
    );
  });

  it("resolves official truncated names against the full PokéData name", () => {
    const players = [
      player("Masahiro Taoka", "JP"),
      player("Kandai Nagatome", "JP"),
    ];
    expect(findPlayerMatches(players, "Masahiro T", "JP")?.player_name).toBe(
      "Masahiro Taoka",
    );
    expect(findPlayerMatches(players, "Kandai N", "US")?.player_name).toBe(
      "Kandai Nagatome",
    );
  });

  it("uses country as a tie-breaker on ambiguous prefixes", () => {
    const players = [player("Daniel Nunez", "MX"), player("Daniel Nakano", "JP")];
    expect(findPlayerMatches(players, "Daniel N", "JP")?.player_name).toBe(
      "Daniel Nakano",
    );
    expect(findPlayerMatches(players, "Daniel N", "BR")).toBeUndefined();
  });

  it("falls back to placement when the official feed uses a trainer name", () => {
    const players = [player("Kyle Livinghouse", "US", 1), player("Snaf69", "US", 4)];
    expect(findPlayerMatches(players, "Snaf69", "US", 4)?.player_name).toBe(
      "Snaf69",
    );
    const pokedata = [player("Zach Holowiak", "US", 4)];
    expect(findPlayerMatches(pokedata, "Snaf69", "US", 4)?.player_name).toBe(
      "Zach Holowiak",
    );
  });
});
