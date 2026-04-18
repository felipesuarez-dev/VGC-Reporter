import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useNavigate } from "react-router-dom";
import { ClipboardCopy, X } from "lucide-react";
import { ipc } from "../../lib/ipc";
import { queryKeys } from "../../lib/queryKeys";
import { formatDateTime } from "../../lib/formatDate";
import type {
  ChampionsTournament,
  DecklistPokemon,
  Team,
  TeamMember,
  TournamentStanding,
} from "../../lib/types";
import { emptyTeamMember } from "../../lib/types";
import { PokemonSprite } from "../pokemon/PokemonSprite";
import { Tooltip } from "../ui/Tooltip";
import { useLocalize } from "../../hooks/useTranslations";
import { useTeamBuilder } from "../../stores/teamBuilderStore";
import { computeMissingFields } from "../team/TopTeamDetailModal";

interface Props {
  tournament: ChampionsTournament | null;
  onClose: () => void;
}

const flag = (code: string | null | undefined): string => {
  if (!code || code.length !== 2) return "";
  return String.fromCodePoint(
    ...code.toUpperCase().split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
};

function standingToDraftTeam(
  standing: TournamentStanding,
  tournamentName: string,
): Team {
  const validMembers = standing.decklist.filter(
    (p) => p && p.name && p.name.length > 0,
  );
  const members: TeamMember[] = Array.from({ length: 6 }, (_, i) => {
    const p = validMembers[i];
    if (!p) return emptyTeamMember();
    return {
      species: p.name,
      item: p.item ?? null,
      ability: p.ability ?? null,
      nature: null,
      tera_type: null,
      moves: (p.moves ?? []).filter((mv) => mv && mv.length > 0),
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    };
  });
  const player = standing.player_name ?? standing.player_id ?? "?";
  return {
    id: null,
    name: `${player} — ${tournamentName}`,
    format: "regulation-m-a",
    notes: null,
    members,
    created_at: null,
    updated_at: null,
  };
}

export function TournamentStandingsDrawer({ tournament, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const setPendingImport = useTeamBuilder((s) => s.setPendingImport);
  const setPendingImportMissing = useTeamBuilder(
    (s) => s.setPendingImportMissing,
  );

  useEffect(() => {
    if (!tournament) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [tournament, onClose]);

  const standings = useQuery({
    queryKey: queryKeys.tournamentStandings(tournament?.id ?? ""),
    queryFn: () => ipc.getTournamentStandings(tournament!.id),
    enabled: Boolean(tournament),
  });

  if (!tournament) return null;

  const copyStandingToBuilder = (standing: TournamentStanding) => {
    const draft = standingToDraftTeam(standing, tournament.name);
    setPendingImport(draft);
    setPendingImportMissing(computeMissingFields(draft, t));
    onClose();
    navigate("/team-builder");
  };

  const winner = standings.data?.[0];
  const top = standings.data?.slice(0, 8) ?? [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl border p-5 shadow-2xl"
        style={{
          backgroundColor: "var(--bg-elev)",
          borderColor: "var(--border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute right-3 top-3 rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elev-strong)] hover:text-[var(--text)]"
          onClick={onClose}
          aria-label={t("pokemon_detail.close")}
        >
          <X size={18} />
        </button>

        <header className="mb-4 pr-8">
          <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>
            {tournament.name}
          </h2>
          <div
            className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            {tournament.date && (
              <span>{formatDateTime(tournament.date, i18n.language)}</span>
            )}
            {tournament.format && <span>{tournament.format}</span>}
            {tournament.players != null && (
              <span>
                {tournament.players} {t("dashboard.players")}
              </span>
            )}
            {tournament.organizer_id && (
              <span>
                {t("tournament.organizer")}: {tournament.organizer_id}
              </span>
            )}
          </div>
        </header>

        {standings.isLoading && (
          <div style={{ color: "var(--text-muted)" }}>{t("tournament.loading")}</div>
        )}
        {standings.isError && (
          <div style={{ color: "var(--danger)" }}>{t("common.error")}</div>
        )}
        {standings.data && standings.data.length === 0 && (
          <div style={{ color: "var(--text-dim)" }}>{t("tournament.no_standings")}</div>
        )}

        {winner && (
          <section className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                {t("tournament.winner")}
              </div>
              <CopyStandingButton
                t={t}
                onClick={() => copyStandingToBuilder(winner)}
              />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-base">{flag(winner.country)}</span>
              <span className="text-lg font-bold" style={{ color: "var(--text)" }}>
                {winner.player_name ?? winner.player_id ?? "—"}
              </span>
              {winner.record && (
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {winner.record}
                </span>
              )}
            </div>
            <div className="mt-3">
              <StandingDecklist decklist={winner.decklist} />
            </div>
          </section>
        )}

        {top.length > 1 && (
          <section className="space-y-3">
            <h3
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: "var(--text-muted)" }}
            >
              {t("tournament.standings")}
            </h3>
            {top.slice(1).map((s, i) => (
              <StandingRow
                key={`${s.player_id ?? s.player_name ?? i}-${i}`}
                standing={s}
                onCopy={() => copyStandingToBuilder(s)}
              />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

function CopyStandingButton({
  t,
  onClick,
}: {
  t: TFunction;
  onClick: () => void;
}) {
  const label = t("top_teams.copy_to_builder");
  return (
    <Tooltip content={label}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="btn-ghost flex items-center gap-1 text-xs"
        aria-label={label}
      >
        <ClipboardCopy size={14} />
      </button>
    </Tooltip>
  );
}

function StandingRow({
  standing,
  onCopy,
}: {
  standing: TournamentStanding;
  onCopy: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="rounded-lg border p-3"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--bg)",
      }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span
            className="w-6 shrink-0 text-right text-xs"
            style={{ color: "var(--text-dim)" }}
          >
            #{standing.placing ?? "—"}
          </span>
          <span className="text-base">{flag(standing.country)}</span>
          <span className="font-semibold" style={{ color: "var(--text)" }}>
            {standing.player_name ?? standing.player_id ?? "—"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {standing.record && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {standing.record}
            </span>
          )}
          <CopyStandingButton t={t} onClick={onCopy} />
        </div>
      </div>
      <div className="mt-2">
        <StandingDecklist decklist={standing.decklist} />
      </div>
    </div>
  );
}

function StandingDecklist({ decklist }: { decklist: DecklistPokemon[] }) {
  const { t } = useTranslation();
  const localize = useLocalize();
  if (decklist.length === 0) {
    return <p className="text-[11px]" style={{ color: "var(--text-dim)" }}>—</p>;
  }
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {decklist.map((p, i) => (
        <li
          key={`${p.id ?? p.name}-${i}`}
          className="flex gap-2 rounded border p-2"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--bg-elev)",
          }}
        >
          <PokemonSprite
            url={p.sprite_url}
            fallbackUrl={p.sprite_fallback_url ?? undefined}
            homeUrl={p.home_sprite_url ?? undefined}
            name={p.name}
            size={48}
          />
          <div className="min-w-0 flex-1 text-[10px]">
            <div
              className="truncate text-[11px] font-semibold"
              style={{ color: "var(--text)" }}
            >
              {p.name}
            </div>
            {p.item && (
              <div style={{ color: "var(--text-muted)" }}>
                <span style={{ color: "var(--text-dim)" }}>
                  {t("top_teams.item")}:
                </span>{" "}
                {localize("item", p.item)}
              </div>
            )}
            {p.ability && (
              <div style={{ color: "var(--text-muted)" }}>
                <span style={{ color: "var(--text-dim)" }}>
                  {t("top_teams.ability")}:
                </span>{" "}
                {localize("ability", p.ability)}
              </div>
            )}
            {p.moves.length > 0 && (
              <div className="mt-0.5" style={{ color: "var(--text)" }}>
                {p.moves.map((mv) => localize("move", mv)).join(" · ")}
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
