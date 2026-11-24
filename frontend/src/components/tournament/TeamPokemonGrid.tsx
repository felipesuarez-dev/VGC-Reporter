import type { DecklistPokemon } from "../../lib/types";
import { useTranslation } from "react-i18next";
import { useLocalize } from "../../hooks/useTranslations";
import { usePokedexStore } from "../../stores/pokedexStore";
import { PokemonSprite } from "../pokemon/PokemonSprite";
import { Tooltip } from "../ui/Tooltip";

function canonicalSpeciesId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function placingBadgeStyle(placing: number | null) {
  if (placing === 1) {
    return {
      color: "var(--warning)",
      border: "color-mix(in srgb, var(--warning) 48%, var(--border))",
      background: "color-mix(in srgb, var(--warning) 12%, transparent)",
    };
  }
  if (placing === 2) {
    return {
      color: "var(--text)",
      border: "color-mix(in srgb, var(--text-muted) 50%, var(--border))",
      background: "color-mix(in srgb, var(--text-muted) 12%, transparent)",
    };
  }
  if (placing === 3) {
    return {
      color: "#d99a63",
      border: "color-mix(in srgb, #d99a63 45%, var(--border))",
      background: "color-mix(in srgb, #d99a63 12%, transparent)",
    };
  }
  return {
    color: "var(--text-muted)",
    border: "var(--border)",
    background: "var(--bg)",
  };
}

export function PlacingBadge({
  placing,
  label,
}: {
  placing: number | null;
  label?: string | null;
}) {
  const style = placingBadgeStyle(placing);
  return (
    <span
      className="inline-flex h-5 shrink-0 items-center rounded px-1.5 font-mono text-[9px] font-semibold"
      style={{
        color: style.color,
        border: `1px solid ${style.border}`,
        backgroundColor: style.background,
      }}
    >
      {label ?? (placing != null ? `#${placing}` : "—")}
    </span>
  );
}

/**
 * The six-Pokémon grid shared by official Top 8 teams and community decklists.
 * Keeping one component guarantees the same sprite size, card shape, item line
 * and click-to-detail behavior even when the community source is incomplete.
 */
export function TeamPokemonGrid({ pokemon }: { pokemon: DecklistPokemon[] }) {
  const { t } = useTranslation();
  const localize = useLocalize();
  const openDetail = usePokedexStore((state) => state.openDetail);
  if (pokemon.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
      {pokemon.map((entry, index) => {
        const item = entry.item ? localize("item", entry.item) : null;
        const ability = entry.ability
          ? localize("ability", entry.ability)
          : null;
        const moves = entry.moves.map((move) => localize("move", move));
        return (
          <Tooltip
            key={`${entry.name}-${index}`}
            className="w-full"
            maxWidth={280}
            content={
              <span className="block space-y-0.5">
                <span className="block font-semibold">{entry.name}</span>
                {item && (
                  <span className="block">
                    {t("top_teams.item")}: {item}
                  </span>
                )}
                {ability && (
                  <span className="block">
                    {t("top_teams.ability")}: {ability}
                  </span>
                )}
                {moves.length > 0 && (
                  <span className="block">{moves.join(" · ")}</span>
                )}
              </span>
            }
          >
            <button
              type="button"
              onClick={() =>
                openDetail(entry.id ?? canonicalSpeciesId(entry.name))
              }
              className="flex w-full min-w-0 flex-col items-center rounded-md border px-1 py-1 transition-colors hover:bg-[var(--bg-elev-strong)]"
              style={{
                borderColor:
                  "color-mix(in srgb, var(--border) 72%, transparent)",
                backgroundColor: "var(--bg-elev)",
              }}
            >
              <PokemonSprite
                url={entry.sprite_url}
                fallbackUrl={entry.sprite_fallback_url ?? undefined}
                homeUrl={entry.home_sprite_url ?? undefined}
                name={entry.name}
                size={30}
                variant="pixel"
              />
              <span
                className="mt-0.5 w-full truncate text-center text-[8px] font-medium"
                style={{ color: "var(--text)" }}
              >
                {entry.name}
              </span>
              {item && (
                <span
                  className="w-full truncate text-center text-[8px]"
                  style={{ color: "var(--text-dim)" }}
                >
                  {item}
                </span>
              )}
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
