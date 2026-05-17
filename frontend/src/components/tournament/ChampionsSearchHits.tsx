import { Trophy, User, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import type {
  ChampionsSearchHit,
  ChampionsTournament,
  SearchHitKind,
} from "../../lib/types";
import { formatDate } from "../../lib/formatDate";

interface Props {
  hits: ChampionsSearchHit[];
  isFetching: boolean;
  onOpenTournament: (tour: ChampionsTournament) => void;
}

function kindIcon(kind: SearchHitKind) {
  switch (kind) {
    case "champion":
      return <Trophy className="h-3.5 w-3.5" />;
    case "player":
      return <User className="h-3.5 w-3.5" />;
    case "pokemon":
      return <Sparkles className="h-3.5 w-3.5" />;
    default:
      return null;
  }
}

export function ChampionsSearchHits({ hits, isFetching, onOpenTournament }: Props) {
  const { t, i18n } = useTranslation();

  if (hits.length === 0 && !isFetching) return null;

  return (
    <div
      className="mt-3 rounded-md border p-3"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-elev-soft)" }}
    >
      <div
        className="mb-2 text-[11px] font-semibold uppercase tracking-wide"
        style={{ color: "var(--text-muted)" }}
      >
        {t("search.more_results")}
      </div>
      {isFetching && hits.length === 0 && (
        <p className="text-[11px]" style={{ color: "var(--text-dim)" }}>
          {t("search.indexing")}
        </p>
      )}
      <ul className="space-y-1.5">
        {hits.map((hit, idx) => {
          const showPokemon =
            hit.kind === "pokemon" || hit.kind === "player" || hit.kind === "champion";
          return (
            <li
              key={`${hit.tournament_id}-${hit.kind}-${idx}`}
              className="flex items-start justify-between gap-2"
            >
              <div className="min-w-0 flex-1">
                <div
                  className="flex items-center gap-1.5 text-xs font-medium"
                  style={{ color: "var(--text)" }}
                >
                  <span
                    className="inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] uppercase tracking-wide"
                    style={{
                      borderColor: "var(--border)",
                      color: "var(--text-muted)",
                    }}
                  >
                    {kindIcon(hit.kind)}
                    {t(`search.kind_${hit.kind}`)}
                  </span>
                  <span className="truncate">{hit.tournament_name}</span>
                </div>
                <div
                  className="mt-0.5 text-[11px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  {hit.tournament_date && (
                    <span>{formatDate(hit.tournament_date, i18n.language)}</span>
                  )}
                  {hit.kind === "tournament" && hit.matched_text && (
                    <span> · {hit.matched_text}</span>
                  )}
                  {(hit.kind === "player" || hit.kind === "champion") && hit.player_name && (
                    <span>
                      {" "}
                      · {hit.player_name}
                      {hit.player_placing != null && ` (#${hit.player_placing})`}
                    </span>
                  )}
                  {hit.kind === "pokemon" && hit.player_name && (
                    <span>
                      {" "}
                      · {t("search.match_pokemon", {
                        player: hit.player_name,
                        pokemon: hit.matched_text,
                      })}
                    </span>
                  )}
                  {showPokemon && hit.kind !== "pokemon" && hit.player_pokemon.length > 0 && (
                    <span> · {hit.player_pokemon.slice(0, 6).join(", ")}</span>
                  )}
                </div>
              </div>
              <button
                className="btn-ghost shrink-0 text-[11px]"
                onClick={() =>
                  onOpenTournament({
                    id: hit.tournament_id,
                    name: hit.tournament_name,
                    date: hit.tournament_date,
                    players: null,
                    format: null,
                    organizer_id: null,
                    champion_name: null,
                  })
                }
              >
                {t("dashboard.view_standings")}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
