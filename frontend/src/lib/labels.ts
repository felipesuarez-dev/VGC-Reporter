import type { TFunction } from "i18next";
import type { Nature, PokemonType } from "./types";

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
