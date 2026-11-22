import { BadgeCheck, Swords } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  source: string;
  className?: string;
}

/** Small source badge used by the upcoming list, the calendar and the modal. */
export function EventSourceBadge({ source, className }: Props) {
  const { t } = useTranslation();
  const official = source === "play-pokemon";
  const Icon = official ? BadgeCheck : Swords;
  const label = official
    ? t("upcoming.source_official")
    : t("upcoming.source_limitless");
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${className ?? ""}`}
      style={{
        borderColor: official ? "var(--accent)" : "#2b86ff",
        color: official ? "var(--accent)" : "#2b86ff",
        backgroundColor: official
          ? "var(--bg-elev-strong)"
          : "color-mix(in srgb, #2b86ff 12%, var(--bg-elev-strong))",
      }}
      title={label}
      data-source={source}
    >
      <Icon size={10} />
      {label}
    </span>
  );
}
