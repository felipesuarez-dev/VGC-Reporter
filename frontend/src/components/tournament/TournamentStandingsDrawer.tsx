import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { ipc } from "../../lib/ipc";
import { queryKeys } from "../../lib/queryKeys";
import type {
  ChampionsTournament,
  DecklistPokemon,
  TournamentStanding,
} from "../../lib/types";
import { PokemonSprite } from "../pokemon/PokemonSprite";

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

export function TournamentStandingsDrawer({ tournament, onClose }: Props) {
  const { t } = useTranslation();

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
        className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute right-3 top-3 rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          onClick={onClose}
          aria-label={t("pokemon_detail.close")}
        >
          <X size={18} />
        </button>

        <header className="mb-4 pr-8">
          <h2 className="text-xl font-bold text-slate-100">{tournament.name}</h2>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
            {tournament.date && <span>{tournament.date}</span>}
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
          <div className="text-slate-400">{t("tournament.loading")}</div>
        )}
        {standings.isError && (
          <div className="text-red-400">{t("common.error")}</div>
        )}
        {standings.data && standings.data.length === 0 && (
          <div className="text-slate-500">{t("tournament.no_standings")}</div>
        )}

        {winner && (
          <section className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
              {t("tournament.winner")}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-base">{flag(winner.country)}</span>
              <span className="text-lg font-bold text-slate-100">
                {winner.player_name ?? winner.player_id ?? "—"}
              </span>
              {winner.record && (
                <span className="text-sm text-slate-400">{winner.record}</span>
              )}
            </div>
            <div className="mt-3">
              <StandingDecklist decklist={winner.decklist} />
            </div>
          </section>
        )}

        {top.length > 1 && (
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t("tournament.standings")}
            </h3>
            {top.slice(1).map((s, i) => (
              <StandingRow key={`${s.player_id ?? s.player_name ?? i}-${i}`} standing={s} />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

function StandingRow({ standing }: { standing: TournamentStanding }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="w-6 shrink-0 text-right text-xs text-slate-500">
            #{standing.placing ?? "—"}
          </span>
          <span className="text-base">{flag(standing.country)}</span>
          <span className="font-semibold text-slate-100">
            {standing.player_name ?? standing.player_id ?? "—"}
          </span>
        </div>
        {standing.record && (
          <span className="text-xs text-slate-400">{standing.record}</span>
        )}
      </div>
      <div className="mt-2">
        <StandingDecklist decklist={standing.decklist} />
      </div>
    </div>
  );
}

function StandingDecklist({ decklist }: { decklist: DecklistPokemon[] }) {
  if (decklist.length === 0) {
    return <p className="text-[11px] text-slate-600">—</p>;
  }
  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {decklist.map((p, i) => (
        <li
          key={`${p.id ?? p.name}-${i}`}
          className="flex flex-col items-center rounded border border-slate-800 bg-slate-900 p-2"
          title={[p.item, p.ability, p.tera_type ? `Tera ${p.tera_type}` : null, ...p.moves]
            .filter(Boolean)
            .join(" · ")}
        >
          <PokemonSprite
            url={p.sprite_url}
            fallbackUrl={p.sprite_fallback_url}
            name={p.name}
            size={48}
          />
          <span className="mt-1 truncate text-[10px] font-medium text-slate-200">
            {p.name}
          </span>
          {p.item && (
            <span className="truncate text-[9px] text-slate-500">{p.item}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
