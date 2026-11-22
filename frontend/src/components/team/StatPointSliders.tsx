import { useTranslation } from "react-i18next";
import type { StatPointSpread } from "../../lib/types";
import { statLabel, type StatKey } from "../../lib/labels";
import { SP_MAX_PER_STAT, SP_MAX_TOTAL, statPointsTotal } from "../../lib/champions";

const STAT_KEYS: (keyof StatPointSpread)[] = ["hp", "atk", "def", "spa", "spd", "spe"];

interface Props {
  value: StatPointSpread;
  onChange: (next: StatPointSpread) => void;
}

export function StatPointSliders({ value, onChange }: Props) {
  const { t } = useTranslation();
  const total = statPointsTotal(value);
  const remaining = SP_MAX_TOTAL - total;

  const update = (key: keyof StatPointSpread, raw: number) => {
    const next = { ...value };
    next[key] = Math.max(0, Math.min(SP_MAX_PER_STAT, Math.round(raw)));
    onChange(next);
  };

  return (
    <div className="space-y-1">
      {STAT_KEYS.map((key) => (
        <div key={key} className="flex items-center gap-2">
          <span
            className="w-10 text-[10px] font-semibold uppercase"
            style={{ color: "var(--text-muted)" }}
          >
            {statLabel(t, key as StatKey)}
          </span>
          <input
            type="range"
            min={0}
            max={SP_MAX_PER_STAT}
            step={1}
            value={value[key]}
            onChange={(event) => update(key, Number(event.target.value))}
            className="flex-1 accent-brand-500"
            aria-label={`${statLabel(t, key as StatKey)} SP`}
          />
          <input
            type="number"
            min={0}
            max={SP_MAX_PER_STAT}
            step={1}
            value={value[key]}
            onChange={(event) => update(key, Number(event.target.value))}
            className="w-14 rounded border px-1 py-0.5 text-right text-xs"
            style={{
              backgroundColor: "var(--bg-elev)",
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
          />
        </div>
      ))}
      <div
        className="text-right text-[10px]"
        style={{ color: remaining < 0 ? "var(--danger)" : "var(--text-dim)" }}
      >
        {total} / {SP_MAX_TOTAL}
        {remaining >= 0
          ? ` · ${t("team_builder.sp_remaining", { count: remaining })}`
          : ` · ${t("team_builder.sp_over", { count: Math.abs(remaining) })}`}
      </div>
    </div>
  );
}
