import type { Format, PokemonType, SourceId } from "./types";

export const queryKeys = {
  // The source filter is part of the key: without it, switching sources would
  // serve the cached merged snapshot and look like nothing happened.
  meta: (
    format: Format,
    tournamentCount?: number,
    source?: SourceId | null,
    from?: string | null,
    to?: string | null,
  ) =>
    [
      "meta",
      format,
      tournamentCount ?? 0,
      source ?? "all",
      from ?? "auto",
      to ?? "auto",
    ] as const,
  pokedex: {
    all: ["pokedex", "all"] as const,
    search: (q?: string, t?: PokemonType) => ["pokedex", "search", q ?? "", t ?? ""] as const,
    detail: (id: string) => ["pokedex", "detail", id] as const,
  },
  teams: {
    list: ["teams", "list"] as const,
    detail: (id: number) => ["teams", "detail", id] as const,
  },
  topTeams: (
    format: Format,
    limit: number,
    source?: string | null,
    from?: string | null,
    to?: string | null,
  ) =>
    [
      "topTeams",
      format,
      limit,
      source ?? "all",
      from ?? "auto",
      to ?? "auto",
    ] as const,
  items: { all: ["items", "all"] as const },
  moves: { all: ["moves", "all"] as const },
  learnsetsIndex: () => ["learnsets-index"] as const,
  moveCatalog: () => ["move-catalog"] as const,
  pikalyticsEntry: (species: string, lang: string) =>
    ["pikalytics", species, lang] as const,
  sets: (species: string) => ["sets", species] as const,
  championsReport: (
    format: Format,
    limit: number,
    from?: string | null,
    to?: string | null,
  ) =>
    ["champions-report", format, limit, from ?? "auto", to ?? "auto"] as const,
  championsSearch: (format: Format, query: string) =>
    ["champions-search", format, query] as const,
  tournamentStandings: (id: string) => ["tournament-standings", id] as const,
  upcomingTournaments: (country?: string) =>
    ["upcoming-tournaments", country ?? "all"] as const,
  officialEvent: (url: string) => ["official-event", url] as const,
  regulations: ["regulations", "catalog"] as const,
  regulationStatus: ["regulations", "status"] as const,
  regulationNews: ["regulations", "news"] as const,
  officialStream: ["regulations", "official-stream"] as const,
  liveStreams: ["regulations", "live-streams"] as const,
  settings: ["settings"] as const,
  translationTable: () => ["translation-table"] as const,
  entityDescriptions: () => ["entity-descriptions"] as const,
  trending: (format: Format) => ["trending", format] as const,
  allowedSpecies: (format: Format) => ["regulations", "species", format] as const,
  allowedItems: (format: Format) => ["regulations", "items", format] as const,
  allowedMoves: (format: Format) => ["regulations", "moves", format] as const,
};
