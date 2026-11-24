import { ChevronDown, ExternalLink, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import type {
  OfficialTournamentTeam,
  OfficialTournamentTeams,
} from "../../lib/types";
import { countryFlag } from "../../lib/countries";
import { openExternal } from "../../lib/openExternal";
import { PlacingBadge, TeamPokemonGrid } from "./TeamPokemonGrid";

interface Props {
  data: OfficialTournamentTeams;
}

function TeamCard({ team }: { team: OfficialTournamentTeam }) {
  const { t } = useTranslation();
  return (
    <article
      className="rounded-lg border p-2.5"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--bg)",
      }}
    >
      <div className="mb-2 flex min-w-0 items-center gap-2">
        <PlacingBadge placing={team.placing} label={team.placing_label} />
        <span className="shrink-0 text-[11px]">{countryFlag(team.country)}</span>
        <span className="min-w-0 flex-1 truncate text-[11px] font-semibold" style={{ color: "var(--text)" }}>
          {team.player_name}
        </span>
        {team.record && (
          <span className="shrink-0 font-mono text-[9px]" style={{ color: "var(--text-dim)" }}>
            {team.record}
          </span>
        )}
      </div>

      <TeamPokemonGrid pokemon={team.pokemon} />
      <span className="sr-only">{t("official.team_of", { player: team.player_name })}</span>
    </article>
  );
}

/**
 * PokéBase top-cut teams for an official event. Collapsible to keep the result
 * sheet compact; the grid mirrors the existing team cards used across the app.
 */
export function OfficialTeamsSection({ data }: Props) {
  const { t } = useTranslation();
  if (data.teams.length === 0) return null;
  const sourceLabel = data.source === "pokedata" ? "PokéData" : "PokéBase";
  const sourceNote =
    data.source === "pokedata"
      ? t("official.pokedata_teams_note")
      : t("official.pokebase_note");

  return (
    <details
      open
      className="group mt-4 overflow-hidden rounded-xl border"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--bg-elev)",
      }}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 transition-colors hover:bg-[var(--bg-elev-strong)] [&::-webkit-details-marker]:hidden">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
          style={{
            color: "var(--accent)",
            backgroundColor: "var(--accent-soft)",
          }}
        >
          <Users size={13} />
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-semibold" style={{ color: "var(--text)" }}>
            {t("official.teams_title")}
          </span>
          <span className="block text-[10px]" style={{ color: "var(--text-dim)" }}>
            {t("official.teams_count", { count: data.teams.length })}
          </span>
        </span>
        <span
          className="ml-auto hidden items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide sm:inline-flex"
          style={{
            color: "var(--text-muted)",
            backgroundColor: "var(--bg)",
            border: "1px solid var(--border)",
          }}
        >
          {sourceLabel}
        </span>
        <ChevronDown
          size={14}
          className="shrink-0 transition-transform group-open:rotate-180"
          style={{ color: "var(--text-dim)" }}
        />
      </summary>

      <div className="border-t p-3" style={{ borderColor: "var(--border)" }}>
        <div className="grid gap-2 xl:grid-cols-2">
          {data.teams.map((team) => (
            <TeamCard
              key={`${team.placing ?? "x"}-${team.player_name}`}
              team={team}
            />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>
            {sourceNote}
          </span>
          <button
            type="button"
            className="btn-ghost text-[10px]"
            onClick={() => void openExternal(data.source_url)}
          >
            <ExternalLink size={10} className="mr-1" />
            {t("official.view_source", { source: sourceLabel })}
          </button>
        </div>
      </div>
    </details>
  );
}
