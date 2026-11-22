import { BadgeCheck, Globe2, MapPin, Sparkles, Swords } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/cn";

type Tier = "world" | "international" | "regional" | "special" | "local" | "community";

const STYLES: Record<Tier, { color: string; icon: typeof Globe2 }> = {
  world: { color: "#f5c542", icon: Globe2 },
  international: { color: "#a78bfa", icon: BadgeCheck },
  regional: { color: "#2dd4bf", icon: MapPin },
  special: { color: "#fb923c", icon: Sparkles },
  local: { color: "var(--text-muted)", icon: MapPin },
  community: { color: "#2b86ff", icon: Swords },
};

/** Shared accent used by highlighted rows, dots and calendar cells. */
export function tournamentTierColor(tier?: string | null): string | null {
  if (!tier || !(tier in STYLES)) return null;
  return STYLES[tier as Tier].color;
}

const LABEL_KEYS: Record<Tier, string> = {
  world: "upcoming.tier_world",
  international: "upcoming.tier_international",
  regional: "upcoming.tier_regional",
  special: "upcoming.tier_special",
  local: "upcoming.tier_local",
  community: "upcoming.tier_community",
};

/** Compact badge for the event level: Worlds, International, Regional… */
export function TournamentTierBadge({
  tier,
  className,
}: {
  tier?: string | null;
  className?: string;
}) {
  const { t } = useTranslation();
  // The source badge already says "Limitless community"; a second
  // "Community" tier badge would repeat the same information.
  if (!tier || tier === "community" || !(tier in STYLES)) return null;
  const key = tier as Tier;
  const style = STYLES[key];
  const Icon = style.icon;
  const label = t(LABEL_KEYS[key]);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold",
        className,
      )}
      style={{
        borderColor: style.color,
        color: style.color,
        backgroundColor: `color-mix(in srgb, ${style.color} 13%, var(--bg-elev-strong))`,
      }}
      title={label}
      data-tier={tier}
    >
      <Icon size={10} />
      {label}
    </span>
  );
}
