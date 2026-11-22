import { BadgeCheck, Globe2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  source: string;
  className?: string;
}

/** Small source badge used by the upcoming list, the calendar and the modal. */
export function EventSourceBadge({ source, className }: Props) {
  const { t } = useTranslation();
  const official = source === "play-pokemon";
  const Icon = official ? BadgeCheck : Globe2;
  const label = official
    ? t("upcoming.source_official")
    : t("upcoming.source_limitless");
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${className ?? ""}`}
      style={{
        borderColor: official ? "var(--accent)" : "var(--border)",
        color: official ? "var(--accent)" : "var(--text-muted)",
        backgroundColor: "var(--bg-elev-strong)",
      }}
      title={label}
    >
      <Icon size={10} />
      {label}
    </span>
  );
}
