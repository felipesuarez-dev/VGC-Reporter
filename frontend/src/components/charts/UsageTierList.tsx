import { useTranslation } from "react-i18next";
import { PokemonSprite } from "../pokemon/PokemonSprite";
import { Tooltip } from "../ui/Tooltip";
import type { UsageBarItem } from "./UsageBarChart";
import type { Tier } from "../../lib/types";

interface Props {
  data: UsageBarItem[];
  onItemClick?: (item: UsageBarItem) => void;
}

/**
 * Tier view of the meta.
 *
 * Deliberately plain DOM rather than Recharts: the tier list is a grid of
 * sprites grouped into rows, so an SVG renderer buys nothing and costs the
 * class of crash that took the Dashboard down when the treemap was added
 * (see Regla 1 in CLAUDE.md).
 *
 * The tier itself is computed in Rust and arrives on the payload. The frontend
 * never derives it, so the Panel and any other consumer cannot disagree.
 */
const ORDER: Tier[] = ["S", "A", "B", "C", "D"];

const STYLES: Record<Tier, { chip: string; ring: string }> = {
  S: {
    chip: "bg-[var(--tier-s-bg)] text-[var(--tier-s-foreground)] border-[var(--tier-s-border)]",
    ring: "border-[var(--tier-s-border)]",
  },
  A: {
    chip: "bg-[var(--tier-a-bg)] text-[var(--tier-a-foreground)] border-[var(--tier-a-border)]",
    ring: "border-[var(--tier-a-border)]",
  },
  B: {
    chip: "bg-[var(--tier-b-bg)] text-[var(--tier-b-foreground)] border-[var(--tier-b-border)]",
    ring: "border-[var(--tier-b-border)]",
  },
  C: {
    chip: "bg-[var(--tier-c-bg)] text-[var(--tier-c-foreground)] border-[var(--tier-c-border)]",
    ring: "border-[var(--tier-c-border)]",
  },
  D: {
    chip: "bg-[var(--tier-d-bg)] text-[var(--tier-d-foreground)] border-[var(--tier-d-border)]",
    ring: "border-[var(--tier-d-border)]",
  },
};

export function UsageTierList({ data, onItemClick }: Props) {
  const { t } = useTranslation();
  if (data.length === 0) return null;

  const grouped = new Map<Tier, UsageBarItem[]>();
  // A species with no tier means the backend could not score it (too little
  // data). Dropping it silently would make the view disagree with the other
  // three, so it is collected and shown apart.
  const unranked: UsageBarItem[] = [];
  for (const item of data) {
    const tier = item.tier;
    if (tier && ORDER.includes(tier)) {
      const bucket = grouped.get(tier);
      if (bucket) bucket.push(item);
      else grouped.set(tier, [item]);
    } else {
      unranked.push(item);
    }
  }

  const rows = ORDER.filter((tier) => (grouped.get(tier)?.length ?? 0) > 0);
  if (rows.length === 0 && unranked.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px]" style={{ color: "var(--text-dim)" }}>
        {t("dashboard.tier_explain")}
      </p>

      {rows.map((tier) => (
        <TierRow
          key={tier}
          label={tier}
          hint={t(`dashboard.tier_${tier.toLowerCase()}`)}
          items={grouped.get(tier) ?? []}
          styles={STYLES[tier]}
          onItemClick={onItemClick}
        />
      ))}

      {unranked.length > 0 && (
        <TierRow
          label="?"
          hint={t("dashboard.tier_unranked")}
          items={unranked}
          styles={STYLES.D}
          onItemClick={onItemClick}
        />
      )}
    </div>
  );
}

interface RowProps {
  label: string;
  hint: string;
  items: UsageBarItem[];
  styles: { chip: string; ring: string };
  onItemClick?: (item: UsageBarItem) => void;
}

function TierRow({ label, hint, items, styles, onItemClick }: RowProps) {
  return (
    <div
      className={`flex items-stretch gap-3 rounded-lg border p-2 ${styles.ring}`}
      style={{ backgroundColor: "var(--bg-elev)" }}
    >
      <Tooltip content={hint}>
        <div
          className={`flex w-12 shrink-0 items-center justify-center rounded-md border text-lg font-bold ${styles.chip}`}
          aria-label={hint}
        >
          {label}
        </div>
      </Tooltip>
      <div className="flex flex-1 flex-wrap gap-1">
        {items.map((item) => (
          <TierEntry key={item.id ?? item.name} item={item} onItemClick={onItemClick} />
        ))}
      </div>
    </div>
  );
}

function TierEntry({
  item,
  onItemClick,
}: {
  item: UsageBarItem;
  onItemClick?: (item: UsageBarItem) => void;
}) {
  const { t } = useTranslation();
  const detail = [
    `${(item.usage_percent ?? 0).toFixed(1)}%`,
    item.win_rate != null ? `${t("dashboard.win_rate")} ${item.win_rate.toFixed(1)}%` : null,
    item.meta_score != null ? `${t("dashboard.meta_score")} ${item.meta_score.toFixed(0)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const inner = (
    <>
      <PokemonSprite
        url={item.sprite_url ?? ""}
        fallbackUrl={item.sprite_fallback_url}
        homeUrl={item.home_sprite_url}
        name={item.name}
        size={40}
        variant="pixel"
      />
      <span
        className="max-w-[72px] truncate text-center text-[10px] leading-tight"
        style={{ color: "var(--text-muted)" }}
      >
        {item.name}
      </span>
    </>
  );

  const className =
    "flex w-[76px] flex-col items-center gap-0.5 rounded-md p-1 transition hover:bg-[var(--bg-elev-strong)]";

  return (
    <Tooltip content={`${item.name} — ${detail}`}>
      {onItemClick ? (
        <button type="button" onClick={() => onItemClick(item)} className={className}>
          {inner}
        </button>
      ) : (
        <div className={className}>{inner}</div>
      )}
    </Tooltip>
  );
}
