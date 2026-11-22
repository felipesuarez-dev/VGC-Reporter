import { Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ChampionsTournament } from "../../lib/types";
import { PokemonSprite } from "../pokemon/PokemonSprite";
import { ItemSprite } from "../items/ItemSprite";
import { useLocalize } from "../../hooks/useTranslations";
import { Tooltip } from "../ui/Tooltip";

/**
 * Compact champion-team trigger. The team itself never takes space in the
 * tournament row; hovering the label opens a viewport-clamped tooltip with
 * the full six-Pokémon set.
 */
export function ChampionTeam({
  tournament,
}: {
  tournament: ChampionsTournament;
}) {
  const { t } = useTranslation();
  const localize = useLocalize();
  const team = tournament.champion_team ?? [];
  const champion = tournament.champion_name?.trim();

  if (team.length === 0) {
    return champion ? (
      <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>
        <Trophy size={10} className="mr-1 inline" />
        {t("dashboard.champion_team")}: {champion}
      </span>
    ) : null;
  }

  const content = (
    <div
      className="max-h-[70vh] w-[500px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border p-3 shadow-2xl"
      style={{
        backgroundColor: "var(--bg-elev)",
        borderColor: "var(--accent)",
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span
          className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: "var(--accent)" }}
        >
          <Trophy size={11} />
          {t("dashboard.champion_team")}
        </span>
        {champion && (
          <span
            className="truncate text-[10px]"
            style={{ color: "var(--text-muted)" }}
          >
            {champion}
          </span>
        )}
      </div>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {team.slice(0, 6).map((pokemon, index) => (
          <li
            key={`${pokemon.name}-${index}`}
            className="rounded-lg border p-1.5"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--bg-elev-strong)",
            }}
          >
            <div className="flex items-center gap-1.5">
              <PokemonSprite
                url={pokemon.sprite_url}
                fallbackUrl={pokemon.sprite_fallback_url}
                homeUrl={pokemon.home_sprite_url}
                name={pokemon.name}
                size={30}
                variant="pixel"
              />
              <div className="min-w-0">
                <p
                  className="truncate text-[11px] font-semibold"
                  style={{ color: "var(--text)" }}
                >
                  {pokemon.name}
                </p>
                <p
                  className="truncate text-[9px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  {pokemon.item ? (
                    <>
                      <ItemSprite name={pokemon.item} size={11} />{" "}
                      {localize("item", pokemon.item)}
                    </>
                  ) : (
                    t("dashboard.no_item")
                  )}
                  {pokemon.ability
                    ? ` · ${localize("ability", pokemon.ability)}`
                    : ""}
                  {pokemon.tera_type ? ` · Tera ${pokemon.tera_type}` : ""}
                </p>
              </div>
            </div>
            {pokemon.moves.length > 0 && (
              <p
                className="mt-1 line-clamp-2 text-[9px] leading-tight"
                style={{ color: "var(--text-dim)" }}
              >
                {pokemon.moves
                  .map((move) => localize("move", move))
                  .join(" · ")}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <span data-champion-team className="inline-flex">
      <Tooltip content={content} placement="bottom" maxWidth={540}>
        <span
          className="inline-flex cursor-help items-center gap-1 text-[10px] font-medium transition-colors hover:text-[var(--accent)]"
          style={{ color: "var(--text-muted)" }}
        >
          <Trophy size={11} />
          {t("dashboard.champion_team")}
          {champion && (
            <span
              className="max-w-[10rem] truncate"
              style={{ color: "var(--text-dim)" }}
            >
              · {champion}
            </span>
          )}
        </span>
      </Tooltip>
    </span>
  );
}
