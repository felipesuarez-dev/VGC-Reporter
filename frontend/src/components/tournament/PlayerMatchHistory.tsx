import { Check, Minus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DecklistPokemon, OfficialTournamentMatch } from "../../lib/types";
import { countryFlag } from "../../lib/countries";
import { usePokedexStore } from "../../stores/pokedexStore";
import { PokemonSprite } from "../pokemon/PokemonSprite";

interface Props {
  matches: OfficialTournamentMatch[];
  swissRounds?: number | null;
  team?: DecklistPokemon[];
}

function canonicalSpeciesId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function resultStyle(result: string) {
  switch (result) {
    case "win":
      return {
        color: "var(--success)",
        border: "color-mix(in srgb, var(--success) 38%, var(--border))",
        background: "color-mix(in srgb, var(--success) 8%, var(--bg-elev))",
        icon: Check,
      };
    case "loss":
      return {
        color: "var(--danger)",
        border: "color-mix(in srgb, var(--danger) 38%, var(--border))",
        background: "color-mix(in srgb, var(--danger) 8%, var(--bg-elev))",
        icon: X,
      };
    case "tie":
      return {
        color: "var(--warning)",
        border: "color-mix(in srgb, var(--warning) 40%, var(--border))",
        background: "color-mix(in srgb, var(--warning) 9%, var(--bg-elev))",
        icon: Minus,
      };
    default:
      return {
        color: "var(--text-dim)",
        border: "var(--border)",
        background: "var(--bg-elev)",
        icon: Minus,
      };
  }
}

export function PlayerMatchHistory({ matches, swissRounds, team = [] }: Props) {
  const { t } = useTranslation();
  const openDetail = usePokedexStore((state) => state.openDetail);
  if (matches.length === 0 && team.length === 0) return null;

  const phases = [
    {
      key: "swiss",
      label: t("official.swiss"),
      rows: matches.filter((match) => match.phase !== "top-cut"),
    },
    {
      key: "top-cut",
      label: t("official.top_cut_phase"),
      rows: matches.filter((match) => match.phase === "top-cut"),
    },
  ].filter((phase) => phase.rows.length > 0);

  return (
    <div
      className="rounded-lg border p-3"
      style={{
        borderColor: "color-mix(in srgb, var(--border) 78%, transparent)",
        backgroundColor: "color-mix(in srgb, var(--bg-elev-strong) 22%, var(--bg))",
      }}
    >
      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--text-dim)" }}>
          {t("official.rounds")}
        </span>
        {swissRounds != null && (
          <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>
            · {t("official.swiss_rounds", { count: swissRounds })}
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-2 text-[10px]" style={{ color: "var(--text-dim)" }}>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--success)" }} />
            {t("official.win")}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--danger)" }} />
            {t("official.loss")}
          </span>
        </span>
      </div>

      {team.length > 0 && (
        <div className="mb-3">
          <div className="mb-1.5 flex items-center gap-2">
            <span
              className="text-[9px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: "var(--text-muted)" }}
            >
              {t("official.team_label")}
            </span>
            <span
              className="h-px flex-1"
              style={{
                background:
                  "linear-gradient(to right, color-mix(in srgb, var(--border) 72%, transparent), transparent)",
              }}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {team.map((pokemon, index) => (
              <button
                key={`${pokemon.name}-${index}`}
                type="button"
                onClick={() =>
                  openDetail(pokemon.id ?? canonicalSpeciesId(pokemon.name))
                }
                className="flex min-w-0 items-center gap-1.5 rounded-md border px-1.5 py-1 transition-colors hover:bg-[var(--bg-elev-strong)]"
                style={{
                  borderColor: "color-mix(in srgb, var(--border) 72%, transparent)",
                  backgroundColor: "var(--bg-elev)",
                }}
                title={pokemon.item ? `${pokemon.name} @ ${pokemon.item}` : pokemon.name}
              >
                <PokemonSprite
                  url={pokemon.sprite_url}
                  fallbackUrl={pokemon.sprite_fallback_url ?? undefined}
                  homeUrl={pokemon.home_sprite_url ?? undefined}
                  name={pokemon.name}
                  size={26}
                  variant="pixel"
                />
                <span
                  className="max-w-24 truncate text-[10px]"
                  style={{ color: "var(--text)" }}
                >
                  {pokemon.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {phases.map((phase) => (
          <div key={phase.key}>
            <div className="mb-1.5 flex items-center gap-2">
              <span
                className="text-[9px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: phase.key === "top-cut" ? "var(--warning)" : "var(--text-muted)" }}
              >
                {phase.label}
              </span>
              <span
                className="h-px flex-1"
                style={{
                  background:
                    "linear-gradient(to right, color-mix(in srgb, var(--border) 72%, transparent), transparent)",
                }}
              />
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
              {phase.rows.map((match) => {
                const style = resultStyle(match.result);
                const Icon = style.icon;
                return (
                  <div
                    key={`${phase.key}-${match.round}`}
                    className="flex min-w-0 items-center gap-2 rounded-md border px-2 py-1.5"
                    style={{
                      borderColor: style.border,
                      backgroundColor: style.background,
                    }}
                    title={`${t("official.round")} ${match.round}: ${match.opponent_name}`}
                  >
                    <span
                      className="w-7 shrink-0 font-mono text-[9px] font-semibold tabular-nums"
                      style={{ color: "var(--text-dim)" }}
                    >
                      R{match.round}
                    </span>
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                      style={{
                        color: style.color,
                        backgroundColor: "color-mix(in srgb, currentColor 12%, transparent)",
                      }}
                      aria-label={
                        match.result === "win"
                          ? t("official.result_win")
                          : match.result === "loss"
                            ? t("official.result_loss")
                            : match.result === "tie"
                              ? t("official.result_tie")
                              : t("official.result_bye")
                      }
                    >
                      <Icon size={11} strokeWidth={3} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[11px]" style={{ color: "var(--text)" }}>
                      <span className="mr-1">{countryFlag(match.opponent_country)}</span>
                      {match.opponent_name}
                    </span>
                    {match.opponent_place != null && (
                      <span
                        className="shrink-0 font-mono text-[9px] tabular-nums"
                        style={{ color: "var(--text-dim)" }}
                      >
                        #{match.opponent_place}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
