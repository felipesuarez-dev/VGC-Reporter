import { useTranslation } from "react-i18next";
import { Database } from "lucide-react";
import { Tooltip } from "./Tooltip";
import type { SourceId, SourceProvenance } from "../../lib/types";

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
    if (p.declared_regulation) parts.push(p.declared_regulation);
    if (p.tournaments > 0) parts.push(t("sources.tournaments", { count: p.tournaments }));
    if (p.teams > 0) parts.push(t("sources.teams", { count: p.teams }));
    if (!p.matches_active_format) parts.push(t("sources.other_regulation"));
    return parts.join(" · ");
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-1.5">
        <Database size={13} style={{ color: "var(--text-dim)" }} aria-hidden />
        <select
          className="input h-7 py-0 text-xs"
          value={value ?? "all"}
          onChange={(e) => onChange(e.target.value === "all" ? null : (e.target.value as SourceId))}
          aria-label={t("sources.label")}
        >
          <option value="all">{t("sources.all")}</option>
          {options.map(({ id, provenance }) => (
            <option key={id} value={id}>
              {t(`sources.name_${id}`)}
              {provenance ? ` — ${describe(provenance)}` : ""}
            </option>
          ))}
        </select>
      </div>

      {value !== null && (
        <p className="mt-1 text-[10px]" style={{ color: "var(--text-dim)" }}>
          {t("sources.filtered_hint", { source: t(`sources.name_${value}`) })}
        </p>
      )}
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
  const { t } = useTranslation();
  if (sources.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {sources.map((s) => {
        const detail = [
          s.declared_regulation ?? t("sources.unknown_regulation"),
          s.tournaments > 0 ? t("sources.tournaments", { count: s.tournaments }) : null,
          s.teams > 0 ? t("sources.teams", { count: s.teams }) : null,
          s.from_date && s.to_date ? `${s.from_date} → ${s.to_date}` : null,
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
