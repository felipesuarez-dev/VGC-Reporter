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
    ring: "ring-[var(--tier-gold-border)]",
    accent: "text-[var(--tier-gold-foreground)]",
    chip: "bg-[var(--tier-gold-bg)] text-[var(--tier-gold-foreground)] border-[var(--tier-gold-border)]",
  },
  {
    ring: "ring-[var(--tier-silver-border)]",
    accent: "text-[var(--tier-silver-foreground)]",
    chip: "bg-[var(--tier-silver-bg)] text-[var(--tier-silver-foreground)] border-[var(--tier-silver-border)]",
  },
  {
    ring: "ring-[var(--tier-bronze-border)]",
    accent: "text-[var(--tier-bronze-foreground)]",
    chip: "bg-[var(--tier-bronze-bg)] text-[var(--tier-bronze-foreground)] border-[var(--tier-bronze-border)]",
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
