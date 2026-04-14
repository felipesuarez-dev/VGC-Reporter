import type { TFunction } from "i18next";
import type { Nature, PokemonType, Violation } from "./types";

export type Weather = "None" | "Sun" | "Rain" | "Sand" | "Snow";
export type Terrain = "None" | "Electric" | "Grassy" | "Misty" | "Psychic";

export function typeLabel(t: TFunction, type: PokemonType): string {
  return t(`types.${type}`, { defaultValue: type });
}

export function natureLabel(t: TFunction, nature: Nature): string {
  return t(`natures.${nature}`, { defaultValue: nature });
}

export function weatherLabel(t: TFunction, weather: Weather): string {
  return t(`weather.${weather}`, { defaultValue: weather });
}

export function terrainLabel(t: TFunction, terrain: Terrain): string {
  return t(`terrain.${terrain}`, { defaultValue: terrain });
}

export function prettifyName(s: string): string {
  if (!s) return s;
  return s
    .replace(/[_-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function formatViolation(t: TFunction, v: Violation): string {
  switch (v.kind) {
    case "team_incomplete":
      return t("validation.team_incomplete", { filled: v.filled });
    case "species_not_allowed":
      return t("validation.species_not_allowed", { species: v.species });
    case "item_banned":
      return t("validation.item_banned", {
        species: v.species,
        item: v.item,
      });
    case "move_banned":
      return t("validation.move_banned", { species: v.species, mv: v.mv });
    case "too_many_restricted":
      return t("validation.too_many_restricted", {
        allowed: v.allowed,
        found: v.found,
      });
    case "restricted_not_in_season":
      return t("validation.restricted_not_in_season", {
        species: v.species,
        season: v.season,
      });
    case "duplicate_species":
      return t("validation.duplicate_species", { species: v.species });
    case "duplicate_item":
      return t("validation.duplicate_item", { item: v.item });
  }
}
