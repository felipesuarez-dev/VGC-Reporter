import { useTranslation } from "react-i18next";
import { ChevronDown, Database } from "lucide-react";
import { Tooltip } from "./Tooltip";
import type { SourceId, SourceProvenance } from "../../lib/types";
import { cn } from "../../lib/cn";
import { formatDate, formatDateTime } from "../../lib/formatDate";

interface Props {
  value: SourceId | null;
  onChange: (source: SourceId | null) => void;
  /** Provenance from the current snapshot, used to describe each option. */
  sources: SourceProvenance[];
  className?: string;
}

/**
 * Picks between the merged view and a single provider.
 *
 * Merging is the default because it is the better answer, but "show me only
 * labmaus" is a legitimate thing to want, and a unified number the user cannot
 * take apart is a number they have to take on faith. The option list is built
 * from the snapshot's own provenance, so it can only ever offer sources that
 * actually returned something.
 */
const ALL: readonly SourceId[] = ["labmaus", "limitless", "champteams", "smogon"];

export function SourceSelector({ value, onChange, sources, className }: Props) {
  const { t } = useTranslation();

  const byId = new Map(sources.map((s) => [s.source, s]));
  // Offer every known source, not just the ones in this snapshot: picking one
  // that returned nothing is how a user finds out it returned nothing, and the
  // Panel says so explicitly rather than silently falling back.
  const options = ALL.map((id) => ({ id, provenance: byId.get(id) }));

  const describe = (p: SourceProvenance | undefined): string => {
    if (!p) return t("sources.no_data_yet");
    const parts: string[] = [];
    if (p.source === "smogon") {
      parts.push(t("sources.monthly_ladder"));
    } else if (p.declared_regulation) {
      parts.push(p.declared_regulation);
    }
    if (p.tournaments > 0) parts.push(t("sources.tournaments", { count: p.tournaments }));
    if (p.teams > 0) parts.push(t("sources.teams", { count: p.teams }));
    if (!p.matches_active_format) parts.push(t("sources.other_regulation"));
    return parts.join(" · ");
  };

  return (
    <div className={cn("relative", className)}>
      <div
        className="flex h-10 w-full items-center gap-2 rounded-lg border px-3 transition-colors focus-within:border-[var(--accent)]"
        style={{
          backgroundColor: "var(--bg-elev)",
          borderColor: "var(--border)",
          color: "var(--text)",
        }}
      >
        <Database
          size={14}
          className="shrink-0"
          style={{ color: "var(--text-dim)" }}
          aria-hidden
        />
        <select
          className="min-w-0 flex-1 cursor-pointer appearance-none bg-transparent text-sm outline-none"
          value={value ?? "all"}
          onChange={(e) =>
            onChange(e.target.value === "all" ? null : (e.target.value as SourceId))
          }
          aria-label={t("sources.label")}
          title={
            value !== null
              ? t("sources.filtered_hint", {
                  source: t(`sources.name_${value}`),
                })
              : undefined
          }
        >
          <option value="all">{t("sources.all")}</option>
          {options.map(({ id, provenance }) => (
            <option key={id} value={id}>
              {t(`sources.name_${id}`)}
              {provenance ? ` — ${describe(provenance)}` : ""}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none shrink-0"
          style={{ color: "var(--text-muted)" }}
          aria-hidden
        />
      </div>
    </div>
  );
}

/**
 * Compact provenance strip: one chip per contributing source, showing what
 * each one claims to describe and how much of the result it carries.
 *
 * This is the honest-labelling surface. A source serving a different
 * regulation than the one selected is marked as such rather than being quietly
 * folded into a number badged with the current set.
 */
export function SourceProvenanceChips({ sources }: { sources: SourceProvenance[] }) {
  const { t, i18n } = useTranslation();
  if (sources.length === 0) return null;

  const provenanceDate = (value: string) =>
    value.includes("T")
      ? formatDateTime(value, i18n.language)
      : formatDate(value, i18n.language);

  return (
    <div className="flex flex-wrap items-center gap-1">
      {sources.map((s) => {
        const declared =
          s.source === "smogon"
            ? t("sources.monthly_ladder")
            : s.declared_regulation ?? t("sources.unknown_regulation");
        const detail = [
          declared,
          s.tournaments > 0 ? t("sources.tournaments", { count: s.tournaments }) : null,
          s.teams > 0 ? t("sources.teams", { count: s.teams }) : null,
          s.from_date && s.to_date
            ? `${provenanceDate(s.from_date)} → ${provenanceDate(s.to_date)}`
            : null,
        ]
          .filter(Boolean)
          .join(" · ");

        return (
          <Tooltip key={s.source} content={detail}>
            <span
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]"
              style={{
                borderColor: s.matches_active_format ? "var(--border)" : "var(--warning)",
                color: s.matches_active_format ? "var(--text-muted)" : "var(--warning)",
                backgroundColor: "var(--bg-elev-strong)",
              }}
            >
              {t(`sources.name_${s.source}`)}
              <span className="tabular-nums opacity-70">{Math.round(s.weight * 100)}%</span>
              {!s.matches_active_format && (
                <span aria-label={t("sources.other_regulation")}>⚠</span>
              )}
            </span>
          </Tooltip>
        );
      })}
    </div>
  );
}
