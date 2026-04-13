import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import type {
  Format,
  MetaSnapshot,
  Pokemon,
  PokemonType,
  Team,
  TopTeam,
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
  getMetaStats: (format: Format) => call<MetaSnapshot>("get_meta_stats", { format }),
  listPokemon: () => call<Pokemon[]>("list_pokemon"),
  searchPokemon: (query?: string, typeFilter?: PokemonType) =>
    call<Pokemon[]>("search_pokemon", { query, typeFilter }),
  getPokemon: (id: string) => call<Pokemon>("get_pokemon", { id }),
  saveTeam: (team: Team) => call<number>("save_team", { team }),
  listTeams: () => call<Team[]>("list_teams"),
  getTeam: (id: number) => call<Team>("get_team", { id }),
  deleteTeam: (id: number) => call<void>("delete_team", { id }),
  getTopTeams: (format: Format, limit = 20) =>
    call<TopTeam[]>("get_top_teams", { format, limit }),
  getSettings: () => call<Record<string, string>>("get_settings"),
  setSetting: (key: string, value: string) =>
    call<void>("set_setting", { key, value }),
};
