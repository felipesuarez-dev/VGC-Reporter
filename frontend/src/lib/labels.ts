import type { TFunction } from "i18next";
import type { Format, Nature, PokemonType, Violation } from "./types";

export type Weather = "None" | "Sun" | "Rain" | "Sand" | "Snow";
export type Terrain = "None" | "Electric" | "Grassy" | "Misty" | "Psychic";

export type StatKey = "hp" | "atk" | "def" | "spa" | "spd" | "spe";

const STAT_FALLBACK: Record<StatKey, string> = {
  hp: "HP", atk: "Atk", def: "Def", spa: "SpA", spd: "SpD", spe: "Spe",
};

export function statLabel(t: TFunction, key: StatKey): string {
  return t(`stats.${key}`, { defaultValue: STAT_FALLBACK[key] });
}

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

const FORMAT_NAME: Record<Format, string> = {
  "regulation-m-a": "Regulation M-A",
  "regulation-i": "Regulation I",
};

const FORMAT_SEASON_KEY: Partial<Record<Format, string>> = {
  "regulation-m-a": "regulations.reg_ma_s1",
};

export function formatLabel(t: TFunction, format: Format): string {
  const name = FORMAT_NAME[format] ?? format;
  const seasonKey = FORMAT_SEASON_KEY[format];
  if (!seasonKey) return name;
  const season = t(seasonKey, { defaultValue: "" });
  return season ? `${name} (${season})` : name;
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
    case "missing_item":
      return t("validation.missing_item", {
        slot: v.slot + 1,
        species: v.species,
      });
    case "missing_ability":
      return t("validation.missing_ability", {
        slot: v.slot + 1,
        species: v.species,
      });
    case "missing_nature":
      return t("validation.missing_nature", {
        slot: v.slot + 1,
        species: v.species,
      });
    case "missing_moves":
      return t("validation.missing_moves", {
        slot: v.slot + 1,
        species: v.species,
        have: v.have,
        need: v.need,
      });
    case "evs_not_assigned":
      return t("validation.evs_not_assigned", {
        slot: v.slot + 1,
        species: v.species,
      });
    case "item_not_allowed":
      return t("validation.item_not_allowed", {
        slot: v.slot + 1,
        species: v.species,
        item: v.item,
      });
    case "move_not_allowed":
      return t("validation.move_not_allowed", {
        slot: v.slot + 1,
        species: v.species,
        mv: v.mv,
      });
  }
}
