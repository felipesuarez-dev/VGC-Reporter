import { BadgeCheck, CalendarDays, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { RegulationInfo } from "../../lib/types";
import { formatDate, formatDateTime } from "../../lib/formatDate";
import { dataDay } from "../../lib/regulations";

interface Props {
  info: RegulationInfo;
}

/**
 * Regulation summary that opens the Feed. It is a normal draggable panel so
 * the user can move or collapse it like the broadcast, events and news.
 *
 * Official instants are shown in the user's timezone. The second line shows
 * the UTC calendar days actually used by the metrics pipeline: the season
 * switches at 02:00 UTC (23:00 in Chile), so the first full tournament day is
 * the next date.
 */
export function FeedSummaryCard({ info }: Props) {
  const { t, i18n } = useTranslation();
  const season =
    info.active_season ?? info.seasons[info.seasons.length - 1] ?? null;
  const seasonStart = season?.start_at ?? info.start_at;
  const seasonEnd = season?.end_at ?? info.end_at;
  const dataFrom = dataDay(seasonStart, "start");
  const dataTo = dataDay(seasonEnd, "end");
  const sourceValidated = info.warnings.find(
    (warning) => warning.kind === "source_validated",
  );

  return (
    <section className="card">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>
              {t("regulations.set_label", { code: info.code })}
            </h2>
            <span
              className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
            >
              <BadgeCheck size={11} />
              {info.origin === "official"
                ? t("feed.official")
                : t("regulations.source_validated")}
            </span>
          </div>
          <p className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
            {season ? `${t("feed.season")} ${season.name} · ` : ""}
            {formatDateTime(seasonStart, i18n.language)} →{" "}
            {seasonEnd
              ? formatDateTime(seasonEnd, i18n.language)
              : t("feed.ongoing")}
          </p>
        </div>

        {dataFrom && (
          <p
            className="flex shrink-0 items-start gap-1 text-[10px] sm:max-w-[18rem] sm:text-right"
            style={{ color: "var(--text-dim)" }}
            title={t("feed.data_days_hint")}
          >
            <CalendarDays size={11} className="mt-0.5 shrink-0" />
            <span>
              {t("feed.data_days", {
                from: formatDate(dataFrom, i18n.language),
                to: dataTo
                  ? formatDate(dataTo, i18n.language)
                  : t("feed.ongoing"),
              })}
            </span>
          </p>
        )}
      </div>

      <p
        className="mt-1.5 flex items-start gap-1 text-[10px]"
        style={{ color: "var(--text-dim)" }}
      >
        <Info size={11} className="mt-0.5 shrink-0" />
        {t("feed.season_time_hint")}
      </p>

      {sourceValidated && sourceValidated.kind === "source_validated" && (
        <p
          className="mt-2 rounded-lg border px-3 py-2 text-[11px]"
          style={{
            borderColor: "var(--warning)",
            color: "var(--warning)",
            backgroundColor: "color-mix(in srgb, var(--warning) 8%, transparent)",
          }}
        >
          {t("regulations.source_validated_banner", {
            teams: sourceValidated.teams,
            count: sourceValidated.source_count,
          })}
        </p>
      )}
    </section>
  );
}
