import { useEffect, useMemo, useRef, useState } from "react";
import { useModalBack } from "../../hooks/useModalBack";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useNavigate } from "react-router-dom";
import { ClipboardCopy, X } from "lucide-react";
import { ipc } from "../../lib/ipc";
import { queryKeys } from "../../lib/queryKeys";
import { formatDateTime } from "../../lib/formatDate";
import { SearchTextInput } from "../filters/SearchTextInput";
import { CountryFilter } from "../filters/CountryFilter";
import { PokemonMultiSelect } from "../filters/PokemonMultiSelect";
import type { Pokemon } from "../../lib/types";
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

  useModalBack(Boolean(tournament), onClose);

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
  const pokedexQ = useQuery({
    queryKey: queryKeys.pokedex.all,
    queryFn: () => ipc.listPokemon(),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const pokedex: Pokemon[] = pokedexQ.data ?? [];

  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState<string[]>([]);
  const [pokemonFilter, setPokemonFilter] = useState<string[]>([]);
  const [visibleRows, setVisibleRows] = useState(8);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tournament) {
      setSearch("");
      setCountryFilter([]);
      setPokemonFilter([]);
      setVisibleRows(8);
    }
  }, [tournament]);

  const countryOptions = useMemo(() => {
    const list = standings.data ?? [];
    return Array.from(
      new Set(list.map((s) => s.country).filter((c): c is string => !!c && c.length === 2)),
    );
  }, [standings.data]);

  const filteredStandings = useMemo(() => {
    const list = standings.data ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((s) => {
      if (q) {
        const hay = `${s.player_name ?? ""} ${s.player_id ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (countryFilter.length > 0) {
        if (!s.country || !countryFilter.includes(s.country.toUpperCase())) return false;
      }
      if (pokemonFilter.length > 0) {
        const ids = new Set(
          s.decklist.map((p) => (p.id ?? p.name).toLowerCase().replace(/[^a-z0-9]/g, "")),
        );
        if (!pokemonFilter.every((id) => ids.has(id))) return false;
      }
      return true;
    });
  }, [standings.data, search, countryFilter, pokemonFilter]);

  if (!tournament) return null;

  const copyStandingToBuilder = (standing: TournamentStanding) => {
    const draft = standingToDraftTeam(standing, tournament.name);
    setPendingImport(draft);
    setPendingImportMissing(computeMissingFields(draft, t));
    onClose();
    navigate("/team-builder");
  };

  const hasFilters =
    search.trim().length > 0 || countryFilter.length > 0 || pokemonFilter.length > 0;
  const displayList = hasFilters ? filteredStandings : standings.data ?? [];
  const winner = hasFilters ? undefined : standings.data?.[0];
  const rest = hasFilters ? displayList : displayList.slice(1);
  const visibleRest = rest.slice(0, visibleRows);
  const canShowMore = rest.length > visibleRows;
  const canShowLess = visibleRows > 8;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        ref={containerRef}
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

        {standings.data && standings.data.length > 0 && (
          <div className="mb-4 space-y-3">
            <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="label">{t("common.search")}</label>
                <SearchTextInput
                  value={search}
                  onChange={setSearch}
                  placeholder={t("common.filter_search_player")}
                />
              </div>
              <div className="space-y-1">
                <label className="label">{t("common.filter_country")}</label>
                <CountryFilter
                  options={countryOptions}
                  selected={countryFilter}
                  onChange={setCountryFilter}
                  placeholder={t("common.filter_country_placeholder")}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="label">{t("top_teams.filter_by_pokemon")}</label>
              <PokemonMultiSelect
                pokedex={pokedex}
                selected={pokemonFilter}
                onChange={setPokemonFilter}
              />
            </div>
          </div>
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

        {visibleRest.length > 0 && (
          <section className="space-y-3">
            <h3
              className="flex items-baseline gap-2 text-xs font-semibold uppercase tracking-wide"
              style={{ color: "var(--text-muted)" }}
            >
              {t("tournament.standings")}
              <span className="font-normal normal-case tracking-normal" style={{ color: "var(--text-dim)" }}>
                {visibleRest.length} / {rest.length}
              </span>
            </h3>
            {visibleRest.map((s, i) => (
              <StandingRow
                key={`${s.player_id ?? s.player_name ?? i}-${i}`}
                standing={s}
                onCopy={() => copyStandingToBuilder(s)}
              />
            ))}
            {(canShowMore || canShowLess) && (
              <div className="flex justify-center gap-2 pt-1">
                {canShowMore && (
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    onClick={() => setVisibleRows((n) => n + 8)}
                  >
                    {t("common.see_more")}
                  </button>
                )}
                {canShowMore && (
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    onClick={() => {
                      setVisibleRows(rest.length);
                      containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    {t("common.see_all")}
                  </button>
                )}
                {canShowLess && (
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    onClick={() => setVisibleRows(8)}
                  >
                    {t("common.see_less")}
                  </button>
                )}
              </div>
            )}
          </section>
        )}
        {hasFilters && displayList.length === 0 && (
          <div className="text-xs" style={{ color: "var(--text-dim)" }}>
            {t("common.empty")}
          </div>
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
