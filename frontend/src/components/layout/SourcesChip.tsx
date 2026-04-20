import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { openUrl } from "@tauri-apps/plugin-opener";
import { formatDate } from "../../lib/formatDate";

const MAIN_SOURCES: { label: string; url: string }[] = [
  { label: "Labmaus", url: "https://labmaus.net/" },
  { label: "Limitless", url: "https://play.limitlesstcg.com/tournaments?game=VGC" },
  { label: "Pikalytics", url: "https://www.pikalytics.com/" },
];

async function openExternal(url: string) {
  try {
    await openUrl(url);
  } catch {
    window.open(url, "_blank");
  }
}

export interface SourcesChipProps {
  tournamentsUsed: number;
  battlesAnalyzed?: number;
  fromDate?: string | null;
  toDate?: string | null;
  totalEntries?: number;
  prefix?: ReactNode;
}

export function SourcesChip({
  tournamentsUsed,
  battlesAnalyzed,
  fromDate,
  toDate,
  totalEntries,
  prefix,
}: SourcesChipProps) {
  const { t, i18n } = useTranslation();
  return (
    <span
      className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-full border px-2.5 py-1 text-xs"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--bg-elev)",
        color: "var(--text-muted)",
      }}
    >
      {prefix && (
        <>
          <span style={{ color: "var(--text)" }}>{prefix}</span>
          <span style={{ color: "var(--text-dim)" }}>•</span>
        </>
      )}
      <span>
        {t("dashboard.meta_tooltip_count", { count: tournamentsUsed })}
      </span>
      {battlesAnalyzed != null && battlesAnalyzed > 0 && (
        <>
          <span style={{ color: "var(--text-dim)" }}>•</span>
          <span>
            {t("dashboard.meta_tooltip_battles", { count: battlesAnalyzed })}
          </span>
        </>
      )}
      {fromDate && toDate ? (
        <>
          <span style={{ color: "var(--text-dim)" }}>•</span>
          <span>
            {t("dashboard.meta_tooltip_range", {
              from: formatDate(fromDate, i18n.language),
              to: formatDate(toDate, i18n.language),
            })}
          </span>
        </>
      ) : totalEntries != null ? (
        <>
          <span style={{ color: "var(--text-dim)" }}>•</span>
          <span>
            {t("dashboard.total_entries")}: {totalEntries}
          </span>
        </>
      ) : null}
      <span style={{ color: "var(--text-dim)" }}>|</span>
      <span>{t("dashboard.sources_label")}:</span>
      {MAIN_SOURCES.map((s, i) => (
        <span key={s.label} className="inline-flex items-center gap-1">
          {i > 0 && <span style={{ color: "var(--text-dim)" }}>/</span>}
          <button
            type="button"
            onClick={() => void openExternal(s.url)}
            className="hover:underline"
            style={{ color: "var(--text-muted)" }}
          >
            {s.label}
          </button>
        </span>
      ))}
    </span>
  );
}
