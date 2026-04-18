import type { Format, PokemonType } from "./types";

export const queryKeys = {
  meta: (format: Format, tournamentCount?: number) =>
    ["meta", format, tournamentCount ?? 0] as const,
  pokedex: {
    all: ["pokedex", "all"] as const,
    search: (q?: string, t?: PokemonType) => ["pokedex", "search", q ?? "", t ?? ""] as const,
    detail: (id: string) => ["pokedex", "detail", id] as const,
  },
  teams: {
    list: ["teams", "list"] as const,
    detail: (id: number) => ["teams", "detail", id] as const,
  },
  topTeams: (format: Format) => ["topTeams", format] as const,
  items: { all: ["items", "all"] as const },
  moves: { all: ["moves", "all"] as const },
  learnsetsIndex: () => ["learnsets-index"] as const,
  moveCatalog: () => ["move-catalog"] as const,
  pikalyticsEntry: (species: string, lang: string) =>
    ["pikalytics", species, lang] as const,
  sets: (species: string) => ["sets", species] as const,
  championsReport: (format: Format, limit: number) =>
    ["champions-report", format, limit] as const,
  tournamentStandings: (id: string) => ["tournament-standings", id] as const,
  upcomingTournaments: () => ["upcoming-tournaments"] as const,
  settings: ["settings"] as const,
  translationTable: () => ["translation-table"] as const,
  entityDescriptions: () => ["entity-descriptions"] as const,
};
