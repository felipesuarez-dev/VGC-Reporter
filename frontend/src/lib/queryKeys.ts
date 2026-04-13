import type { Format, PokemonType } from "./types";

export const queryKeys = {
  meta: (format: Format) => ["meta", format] as const,
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
  sets: (species: string) => ["sets", species] as const,
  championsReport: (limit: number) => ["champions-report", limit] as const,
  tournamentStandings: (id: string) => ["tournament-standings", id] as const,
  settings: ["settings"] as const,
};
