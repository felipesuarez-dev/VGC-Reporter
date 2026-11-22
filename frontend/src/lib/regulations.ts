import type { TFunction } from "i18next";
import type {
  FormatOption,
  RegulationInfo,
  RegulationStatus,
} from "./types";

export function regulationStatusAt(
  info: RegulationInfo,
  now = new Date(),
): RegulationStatus {
  const start = new Date(info.start_at).getTime();
  const end = info.end_at ? new Date(info.end_at).getTime() : null;
  if (Number.isFinite(start) && now.getTime() < start) return "upcoming";
  if (end !== null && Number.isFinite(end) && now.getTime() > end) {
    return "archived";
  }
  return "active";
}

export function activeSeasonName(info: RegulationInfo): string | null {
  if (info.active_season) return info.active_season.name;
  const now = Date.now();
  const started = info.seasons
    .filter((s) => new Date(s.start_at).getTime() <= now)
    .sort((a, b) => b.start_at.localeCompare(a.start_at));
  return started[0]?.name ?? null;
}

/**
 * Last full calendar day covered by an instant. Start instants keep their own
 * date (the season opens at 02:00 UTC); end instants at `...T01:59Z` close on
 * the previous date.
 */
export function dataDay(
  value: string | null | undefined,
  boundary: "start" | "end" = "start",
): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  const day = new Date(date);
  if (boundary === "end" && day.getUTCHours() < 6) {
    day.setUTCDate(day.getUTCDate() - 1);
  }
  return day.toISOString().slice(0, 10);
}

export function latestSeason(info: RegulationInfo, now = new Date()) {
  const started = info.seasons
    .filter((season) => new Date(season.start_at) <= now)
    .sort((a, b) => b.start_at.localeCompare(a.start_at));
  return started[0] ?? info.seasons[info.seasons.length - 1] ?? null;
}

/**
 * Default Dashboard range: the active (or latest) season, clamped to today.
 * The user can widen it to the whole regulation from the date controls.
 */
export function defaultRangeFor(
  info: RegulationInfo,
  now = new Date(),
): { from: string; to: string } | null {
  const season = info.active_season ?? latestSeason(info, now);
  const from = dataDay(season?.start_at ?? info.start_at, "start");
  const to = dataDay(season?.end_at ?? info.end_at, "end");
  if (!from || !to) return null;
  const today = now.toISOString().slice(0, 10);
  return { from, to: to > today ? today : to };
}

export function regulationLabel(t: TFunction, info: RegulationInfo): string {
  const base = info.code
    ? t("regulations.set_label", { code: info.code })
    : info.label;
  const season = activeSeasonName(info);
  return season ? `${base} (${season})` : base;
}

export function formatOptionFromInfo(
  t: TFunction,
  info: RegulationInfo,
  now = new Date(),
): FormatOption {
  const status = regulationStatusAt(info, now);
  const option: FormatOption = {
    value: info.id,
    label: regulationLabel(t, info),
  };
  if (status === "upcoming") {
    option.disabled = true;
    option.badgeKey = "regulations.coming_soon";
    option.disabledTooltipKey = "regulations.regulation_start_date";
    option.disabledTooltipParams = {
      date: new Date(info.start_at).toLocaleString(),
    };
  } else if (status === "archived") {
    option.badgeKey = "regulations.archived";
  } else if (info.origin === "source_validated") {
    option.badgeKey = "regulations.source_validated";
  }
  return option;
}

export function sortRegulationOptions(
  options: FormatOption[],
  favorite: string,
  showArchived: boolean,
  now = new Date(),
  regulations: RegulationInfo[] = [],
): FormatOption[] {
  const statusById = new Map(
    regulations.map((r) => [r.id, regulationStatusAt(r, now)]),
  );
  return [...options]
    .filter((o) => showArchived || statusById.get(o.value) !== "archived")
    .sort((a, b) => {
      const rank = (o: FormatOption) => {
        if (o.value === favorite) return 0;
        if (o.disabled) return 2;
        if (statusById.get(o.value) === "active") return 1;
        return 3;
      };
      const diff = rank(a) - rank(b);
      if (diff !== 0) return diff;
      return a.label.localeCompare(b.label);
    });
}

export function activeRegulation(
  regulations: RegulationInfo[],
  now = new Date(),
): RegulationInfo | null {
  const active = regulations
    .filter((r) => regulationStatusAt(r, now) === "active")
    .sort((a, b) => b.start_at.localeCompare(a.start_at));
  if (active[0]) return active[0];
  const archived = regulations
    .filter((r) => regulationStatusAt(r, now) === "archived")
    .sort((a, b) => b.start_at.localeCompare(a.start_at));
  return archived[0] ?? regulations[0] ?? null;
}
