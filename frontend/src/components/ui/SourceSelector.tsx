import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Database, Star } from "lucide-react";
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
  /** Starred source; `null` pins "all sources". */
  favorite?: SourceId | null;
  onFavoriteChange?: (source: SourceId | null) => void;
}

/**
 * Picks between the merged view and a single provider.
 *
 * The list is rendered as a real popover instead of a native `<select>`:
 * native options inherit the OS white palette and broke the dark themes. The
 * star is the same affordance used by the regulation picker.
 */
const ALL: readonly SourceId[] = ["labmaus", "limitless", "champteams", "smogon"];

export function SourceSelector({
  value,
  onChange,
  sources,
  className,
  favorite = null,
  onFavoriteChange,
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const byId = new Map(sources.map((s) => [s.source, s]));

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const describe = (p: SourceProvenance | undefined): string => {
    if (!p) return t("sources.no_data_yet");
    const parts: string[] = [];
    if (p.source === "smogon") parts.push(t("sources.monthly_ladder"));
    else if (p.declared_regulation) parts.push(p.declared_regulation);
    if (p.tournaments > 0) parts.push(t("sources.tournaments", { count: p.tournaments }));
    if (p.teams > 0) parts.push(t("sources.teams", { count: p.teams }));
    if (!p.matches_active_format) parts.push(t("sources.other_regulation"));
    return parts.join(" · ");
  };

  const labelFor = (id: SourceId | null) =>
    id === null ? t("sources.all") : t(`sources.name_${id}`);

  const options: Array<{ id: SourceId | null; provenance?: SourceProvenance }> = [
    { id: null },
    ...ALL.map((id) => ({ id, provenance: byId.get(id) })),
  ];

  const pick = (id: SourceId | null) => {
    onChange(id);
    setOpen(false);
  };

  const toggleFavorite = (id: SourceId | null) => {
    if (!onFavoriteChange) return;
    onFavoriteChange(id);
    onChange(id);
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        className="input flex h-10 items-center justify-between gap-2 text-left"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("sources.label")}
        title={
          value !== null
            ? t("sources.filtered_hint", { source: t(`sources.name_${value}`) })
            : undefined
        }
      >
        <span className="flex min-w-0 items-center gap-2">
          <Database size={14} className="shrink-0" style={{ color: "var(--text-dim)" }} />
          <span className="truncate">{labelFor(value)}</span>
          {favorite !== null && (
            <Star size={12} className="shrink-0 fill-amber-300 text-amber-300" />
          )}
        </span>
        <ChevronDown size={16} className="shrink-0" style={{ color: "var(--text-muted)" }} />
      </button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-1 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border shadow-xl"
          style={{ backgroundColor: "var(--bg-elev)", borderColor: "var(--border)" }}
        >
          <ul role="listbox" className="py-1">
            {options.map(({ id, provenance }) => {
              const selected = (value ?? null) === id;
              const isFavorite = favorite === id;
              return (
                <li key={id ?? "all"} className="flex items-center">
                  {onFavoriteChange && (
                    <button
                      type="button"
                      className="flex h-9 w-9 shrink-0 items-center justify-center hover:text-amber-300"
                      style={{ color: "var(--text-muted)" }}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleFavorite(id);
                      }}
                      title={t("sources.favorite_source")}
                      aria-label={t("sources.favorite_source")}
                      aria-pressed={isFavorite}
                    >
                      <Star
                        className={cn("h-4 w-4", isFavorite && "fill-amber-300 text-amber-300")}
                      />
                    </button>
                  )}
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => pick(id)}
                    className={cn(
                      "flex flex-1 items-center justify-between gap-2 px-2 py-2 text-left text-sm hover:bg-[var(--bg-elev-strong)]",
                      selected && "bg-[var(--accent-soft)]",
                    )}
                    style={{ color: "var(--text)" }}
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{labelFor(id)}</span>
                      {id !== null && (
                        <span
                          className="mt-0.5 block truncate text-[10px]"
                          style={{ color: "var(--text-dim)" }}
                        >
                          {describe(provenance)}
                        </span>
                      )}
                    </span>
                    {selected && <Check size={14} style={{ color: "var(--accent)" }} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Compact provenance strip: one chip per contributing source. */
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
            ? `${provenanceDate(s.from_date)} · ${provenanceDate(s.to_date)}`
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
                <span aria-label={t("sources.other_regulation")}>?</span>
              )}
            </span>
          </Tooltip>
        );
      })}
    </div>
  );
}
