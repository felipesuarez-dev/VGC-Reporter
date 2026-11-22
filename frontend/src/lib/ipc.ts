import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import type {
  SourceId,
  ChampionsReport,
  ChampionsSearchHit,
  EntityDescriptions,
  Format,
  MetaSnapshot,
  MoveSummary,
  LiveStreamScreen,
  OfficialEventDetails,
  OfficialLiveStream,
  PikalyticsEntry,
  Pokemon,
  PokemonType,
  RegulationInfo,
  RegulationNewsItem,
  RegulationSyncStatus,
  SetsBundle,
  Team,
  TopTeamsReport,
  SyncBundle,
  SyncImportResult,
  SyncSession,
  TournamentStanding,
  TranslationTable,
  TrendingReport,
  UpcomingTournament,
  UpdateInfo,
  Violation,
} from "./types";

export interface AppErrorShape {
  kind: string;
  message: string;
}

export class AppError extends Error {
  kind: string;
  constructor(kind: string, message: string) {
    super(message);
    this.kind = kind;
  }
}

async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await tauriInvoke<T>(cmd, args);
  } catch (e) {
    if (typeof e === "object" && e !== null && "kind" in e && "message" in e) {
      const err = e as AppErrorShape;
      throw new AppError(err.kind, err.message);
    }
    throw new AppError("unknown", String(e));
  }
}

export const ipc = {
  getMetaStats: (
    format: Format,
    tournamentCount?: number,
    source?: SourceId | null,
    from?: string | null,
    to?: string | null,
  ) =>
    call<MetaSnapshot>("get_meta_stats", {
      format,
      tournamentCount,
      // undefined would be dropped by the IPC bridge; null reaches Rust as the
      // None that means "merge every source".
      source: source ?? null,
      from: from ?? null,
      to: to ?? null,
    }),
  openLogsFolder: () => call<void>("open_logs_folder"),
  listPokemon: () => call<Pokemon[]>("list_pokemon"),
  searchPokemon: (query?: string, typeFilter?: PokemonType) =>
    call<Pokemon[]>("search_pokemon", { query, typeFilter }),
  getPokemon: (id: string) => call<Pokemon>("get_pokemon", { id }),
  saveTeam: (team: Team) => call<number>("save_team", { team }),
  listTeams: () => call<Team[]>("list_teams"),
  getTeam: (id: number) => call<Team>("get_team", { id }),
  deleteTeam: (id: number) => call<void>("delete_team", { id }),
  importShowdownText: (text: string) =>
    call<Team>("import_showdown_text", { text }),
  exportTeamToShowdown: (team: Team) =>
    call<string>("export_team_to_showdown", { team }),
  validateTeam: (team: Team, regulation: string) =>
    call<Violation[]>("validate_team", { team, regulation }),
  getRegulations: () => call<RegulationInfo[]>("get_regulations"),
  getRegulationStatus: () => call<RegulationSyncStatus>("get_regulation_status"),
  getRegulationNews: (force = false) =>
    call<RegulationNewsItem[]>("get_regulation_news", { force }),
  getOfficialLiveStream: (force = false) =>
    call<OfficialLiveStream | null>("get_official_live_stream", { force }),
  getLiveStreams: (force = false) =>
    call<LiveStreamScreen[]>("get_live_streams", { force }),
  refreshRegulations: (force = true) =>
    call<RegulationInfo[]>("refresh_regulations", { force }),
  getAllowedSpecies: (format: Format) =>
    call<string[]>("get_allowed_species", { format }),
  getAllowedItems: (format: Format) =>
    call<string[]>("get_allowed_items", { format }),
  getAllowedMoves: (format: Format) =>
    call<string[]>("get_allowed_moves", { format }),
  getTopTeams: (
    format: Format,
    limit = 20,
    source?: string | null,
    from?: string | null,
    to?: string | null,
  ) =>
    call<TopTeamsReport>("get_top_teams", {
      format,
      limit,
      source: source ?? null,
      from: from ?? null,
      to: to ?? null,
    }),
  saveTopTeamsMarkdown: (format: Format, limit: number, path: string) =>
    call<void>("save_top_teams_markdown", { format, limit, path }),
  listItems: () => call<string[]>("list_items"),
  listMoves: () => call<string[]>("list_moves"),
  listAbilities: () => call<string[]>("list_abilities"),
  listMovesForSpecies: (species: string) =>
    call<MoveSummary[]>("list_moves_for_species", { species }),
  getPokemonSets: (species: string) =>
    call<SetsBundle>("get_pokemon_sets", { species }),
  getEntityDescriptions: () =>
    call<EntityDescriptions>("get_entity_descriptions"),
  getLearnsetsIndex: () =>
    call<Record<string, string[]>>("get_learnsets_index"),
  getMoveCatalog: () =>
    call<Record<string, MoveSummary>>("get_move_catalog"),
  getPikalyticsEntry: (species: string, lang: string) =>
    call<PikalyticsEntry>("get_pikalytics_entry", { species, lang }),
  listChampionsTournaments: (
    format?: Format,
    limit?: number,
    from?: string | null,
    to?: string | null,
  ) =>
    call<ChampionsReport>("list_champions_tournaments", {
      format,
      limit,
      from: from ?? null,
      to: to ?? null,
    }),
  getTournamentStandings: (id: string) =>
    call<TournamentStanding[]>("get_tournament_standings", { id }),
  searchChampions: (query: string, format?: Format, limit?: number) =>
    call<ChampionsSearchHit[]>("search_champions", { query, format, limit }),
  listUpcomingTournaments: (country?: string | null) =>
    call<UpcomingTournament[]>("list_upcoming_tournaments", {
      country: country ?? null,
    }),
  getOfficialEventDetails: (url: string) =>
    call<OfficialEventDetails>("get_official_event_details", { url }),
  getSettings: () => call<Record<string, string>>("get_settings"),
  setSetting: (key: string, value: string) =>
    call<void>("set_setting", { key, value }),
  getTranslationTable: () => call<TranslationTable>("get_translation_table"),
  getTrending: (format: Format) =>
    call<TrendingReport>("get_trending", { format }),
  checkForAppUpdate: () =>
    call<UpdateInfo | null>("check_for_app_update"),
  downloadAndroidUpdate: (url: string) =>
    call<string>("download_android_update", { url }),
  syncStartSend: (uiJson: string) =>
    call<SyncSession>("sync_start_send", { uiJson }),
  syncFetch: (url: string) => call<SyncBundle>("sync_fetch", { url }),
  syncFetchByCode: (code: string) =>
    call<SyncBundle>("sync_fetch_by_code", { code }),
  syncImport: (bundle: SyncBundle) =>
    call<SyncImportResult>("sync_import", { bundle }),
};
