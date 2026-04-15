import { useTranslation } from "react-i18next";
import type { PokemonSet } from "../../lib/types";
import { useLocalize } from "../../hooks/useTranslations";
import { statLabel, type StatKey } from "../../lib/labels";

const STAT_KEYS: (keyof PokemonSet["evs"])[] = ["hp", "atk", "def", "spa", "spd", "spe"];

export function PokemonSetCard({ set }: { set: PokemonSet }) {
  const { t } = useTranslation();
  const localize = useLocalize();
  const evs = STAT_KEYS.filter((k) => set.evs[k] > 0);
  return (
    <article
      className="rounded-lg border p-3"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--bg-elev)",
      }}
    >
      <header className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
          {set.name}
        </h4>
        {set.tera_types.length > 0 && (
          <span
            className="text-[10px] uppercase tracking-wide"
            style={{ color: "var(--accent)" }}
          >
            Tera: {set.tera_types.join(" / ")}
          </span>
        )}
      </header>

      <dl
        className="mb-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs"
        style={{ color: "var(--text-muted)" }}
      >
        {set.item && (
          <>
            <dt style={{ color: "var(--text-dim)" }}>Item</dt>
            <dd>{localize("item", set.item)}</dd>
          </>
        )}
        {set.ability && (
          <>
            <dt style={{ color: "var(--text-dim)" }}>Ability</dt>
            <dd>{localize("ability", set.ability)}</dd>
          </>
        )}
        {set.nature && (
          <>
            <dt style={{ color: "var(--text-dim)" }}>Nature</dt>
            <dd>{set.nature}</dd>
          </>
        )}
      </dl>

      {evs.length > 0 && (
        <div className="mb-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
          EVs:{" "}
          <span style={{ color: "var(--text)" }}>
            {evs.map((k) => `${set.evs[k]} ${statLabel(t, k as StatKey)}`).join(" / ")}
          </span>
        </div>
      )}

      <ul className="grid grid-cols-2 gap-1">
        {set.moves.map((m, i) => (
          <li
            key={`${m}-${i}`}
            className="rounded px-2 py-0.5 text-xs"
            style={{
              backgroundColor: "var(--bg-elev-strong)",
              color: "var(--text)",
            }}
          >
            {localize("move", m)}
          </li>
        ))}
      </ul>
    </article>
  );
}
