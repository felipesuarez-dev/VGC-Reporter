import { useTranslation } from "react-i18next";
import { Medal } from "lucide-react";
import type { MovesetUsage } from "../../lib/types";
import { EntityChip } from "../info/EntityChip";
import { cn } from "../../lib/cn";

interface Props {
  moveset: MovesetUsage;
  rank: number;
}

const TIER_STYLES = [
  {
    ring: "ring-amber-400/60",
    accent: "text-amber-300",
    chip: "bg-amber-500/15 text-amber-200 border-amber-500/40",
  },
  {
    ring: "ring-slate-300/60",
    accent: "text-slate-200",
    chip: "bg-slate-400/15 text-slate-200 border-slate-400/40",
  },
  {
    ring: "ring-amber-700/60",
    accent: "text-amber-600",
    chip: "bg-amber-800/20 text-amber-300 border-amber-800/40",
  },
];

function tierFor(rank: number) {
  return TIER_STYLES[rank] ?? null;
}

export function MovesetTierCard({ moveset, rank }: Props) {
  const { t } = useTranslation();
  const tier = tierFor(rank);
  const isTier = tier !== null;

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition",
        isTier && "ring-1",
        tier?.ring,
      )}
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--bg-elev)",
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            tier?.chip ??
              "border-[var(--border)] text-[var(--text-muted)]",
          )}
        >
          {isTier && <Medal size={10} aria-hidden />}
          {t("detail.movesets.rank", { n: rank + 1 })}
        </span>
        <span
          className={cn(
            "text-sm font-bold tabular-nums",
            tier?.accent ?? "text-[var(--accent)]",
          )}
        >
          {moveset.usage_percent.toFixed(1)}%
        </span>
      </div>
      <ul className="grid grid-cols-1 gap-x-3 gap-y-1 text-xs sm:grid-cols-2">
        {moveset.moves.map((mv) => (
          <li key={mv} className="truncate">
            <EntityChip kind="move" name={mv} />
          </li>
        ))}
      </ul>
    </div>
  );
}
