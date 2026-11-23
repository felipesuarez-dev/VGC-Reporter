import type { SyncBundle, SyncState, SyncTicket, Team } from "./types";

export type ConflictMode = "rename" | "replace" | "skip";

export interface PreparedImport {
  bundle: SyncBundle;
  deleteIds: number[];
  conflicts: number;
}

export function normalizeTeamName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

/**
 * Resolve what to do with incoming teams whose name already exists locally.
 * Pure so the three choices are impossible to apply by accident: the caller
 * deletes rows only after the user confirms.
 */
export function prepareImport(
  bundle: SyncBundle,
  existing: Team[],
  mode: ConflictMode,
): PreparedImport {
  const byName = new Map<string, Team>();
  for (const team of existing) {
    const key = normalizeTeamName(team.name);
    if (!byName.has(key)) byName.set(key, team);
  }
  const conflicts = bundle.teams.filter((team) =>
    byName.has(normalizeTeamName(team.name)),
  );
  if (mode === "skip") {
    return {
      bundle: {
        ...bundle,
        teams: bundle.teams.filter(
          (team) => !byName.has(normalizeTeamName(team.name)),
        ),
      },
      deleteIds: [],
      conflicts: conflicts.length,
    };
  }
  if (mode === "replace") {
    const deleteIds = [
      ...new Set(
        conflicts
          .map((team) => byName.get(normalizeTeamName(team.name))?.id)
          .filter((id): id is number => typeof id === "number"),
      ),
    ];
    return { bundle, deleteIds, conflicts: conflicts.length };
  }
  const suffix = new Date().toLocaleDateString();
  return {
    bundle: {
      ...bundle,
      teams: bundle.teams.map((team) =>
        byName.has(normalizeTeamName(team.name))
          ? { ...team, name: `${team.name} · sync ${suffix}` }
          : team,
      ),
    },
    deleteIds: [],
    conflicts: conflicts.length,
  };
}

export const SYNC_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const SYNC_CODE_LENGTH = 8;
export const SYNC_TICKET_VERSION = 1;

export interface ParsedSyncTicket {
  kind: "ticket";
  ticket: SyncTicket;
  httpUrl: string;
}

export interface ParsedLegacySyncUrl {
  kind: "legacy";
  url: string;
}

export type ParsedSyncInput = ParsedSyncTicket | ParsedLegacySyncUrl;

/** Uppercase, trim, and reject ambiguous characters. */
export function normalizeSyncCode(raw: string): string | null {
  const code = raw.trim().toUpperCase();
  if (code.length !== SYNC_CODE_LENGTH) return null;
  return [...code].every((char) => SYNC_ALPHABET.includes(char)) ? code : null;
}

export function formatSyncCode(code: string): string {
  const normalized = normalizeSyncCode(code) ?? code;
  return normalized.length === SYNC_CODE_LENGTH
    ? `${normalized.slice(0, 4)} ${normalized.slice(4)}`
    : normalized;
}

function isHttpUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

function validToken(token: string): boolean {
  return /^[0-9a-f]{32}$/i.test(token);
}

function validHost(host: string): boolean {
  return (
    host.length > 0 &&
    !/[/?#\s]/.test(host) &&
    /^[A-Za-z0-9.:-]+$/.test(host)
  );
}

export function syncTicketHttpUrl(ticket: SyncTicket): string {
  return `http://${ticket.host}:${ticket.port}/sync/v1/bundle?token=${ticket.token}`;
}

/**
 * The QR is a pairing ticket, not the bundle. This parser mirrors the Rust
 * validator so a bad QR fails before any network request is attempted.
 */
export function parseSyncTicket(raw: string): SyncTicket {
  const value = raw.trim();
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("invalid sync ticket");
  }
  if (url.protocol !== "vgcreporter:" || url.hostname !== "sync") {
    throw new Error("not a VGC Reporter sync ticket");
  }
  const version = Number(url.searchParams.get("v"));
  if (version !== SYNC_TICKET_VERSION) {
    throw new Error(
      version === 0
        ? "sync ticket has no version"
        : `unsupported sync ticket version ${version}`,
    );
  }
  const code = normalizeSyncCode(url.searchParams.get("code") ?? "");
  if (!code) throw new Error("sync ticket has an invalid code");
  const token = url.searchParams.get("token")?.trim().toLowerCase() ?? "";
  if (!validToken(token)) throw new Error("sync ticket has an invalid token");
  const host = url.searchParams.get("host")?.trim() ?? "";
  if (!validHost(host)) throw new Error("sync ticket has an invalid host");
  const port = Number(url.searchParams.get("port"));
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("sync ticket has an invalid port");
  }
  return { version, code, token, host, port };
}

export function parseSyncInput(raw: string): ParsedSyncInput {
  const value = raw.trim();
  if (isHttpUrl(value)) {
    return { kind: "legacy", url: value };
  }
  const ticket = parseSyncTicket(value);
  return { kind: "ticket", ticket, httpUrl: syncTicketHttpUrl(ticket) };
}

export function syncTicketToHttpUrl(raw: string): string {
  const parsed = parseSyncInput(raw);
  return parsed.kind === "legacy" ? parsed.url : parsed.httpUrl;
}

export function secondsRemaining(expiresAt: string, now = Date.now()): number {
  const deadline = Date.parse(expiresAt);
  if (!Number.isFinite(deadline)) return 0;
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

export function formatSyncCountdown(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

export function isSyncTerminal(state: SyncState): boolean {
  return (
    state === "imported" ||
    state === "expired" ||
    state === "cancelled" ||
    state === "error"
  );
}

export function canImportState(state: SyncState): boolean {
  return state === "received";
}

export const SYNC_STATE_ORDER: SyncState[] = [
  "waiting",
  "connected",
  "transferring",
  "received",
  "imported",
];
