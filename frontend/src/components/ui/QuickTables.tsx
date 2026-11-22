import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dna, Grid3x3, Maximize2 } from "lucide-react";
import { cn } from "../../lib/cn";
import { NatureTable, TypeChartTable } from "./TypeLabModal";

export type QuickTableTab = "types" | "natures";

interface Props {
  defaultTab?: QuickTableTab;
  className?: string;
  onOpenFull?: (tab: QuickTableTab) => void;
}

/**
 * Pinned quick tables for the Pokédex. The same tables are available from the
 * global TypeLab widget (Ctrl+T), but this card keeps them visible in context.
 */
export function QuickTables({ defaultTab = "types", className, onOpenFull }: Props) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<QuickTableTab>(defaultTab);
  return (
    <section className={cn("card", className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}
          >
            {tab === "types" ? <Grid3x3 size={16} /> : <Dna size={16} />}
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">{t("type_lab.quick_title")}</h2>
            <p className="text-[10px]" style={{ color: "var(--text-dim)" }}>
              {t("type_lab.quick_hint")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div
            className="flex overflow-hidden rounded-md border"
            style={{ borderColor: "var(--border)" }}
            role="tablist"
            aria-label={t("type_lab.quick_title")}
          >
            {(
              [
                ["types", Grid3x3, "type_lab.tab_table"],
                ["natures", Dna, "type_lab.tab_natures"],
              ] as const
            ).map(([id, Icon, key]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className="flex h-7 items-center gap-1 px-2.5 text-[10px] font-medium"
                style={{
                  backgroundColor:
                    tab === id ? "var(--accent-soft)" : "transparent",
                  color: tab === id ? "var(--accent)" : "var(--text-muted)",
                }}
                onClick={() => setTab(id)}
              >
                <Icon size={12} />
                {t(key)}
              </button>
            ))}
          </div>
          {onOpenFull && (
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-elev-strong)]"
              style={{ color: "var(--text-muted)" }}
              onClick={() => onOpenFull(tab)}
              title={t("type_lab.open_full")}
              aria-label={t("type_lab.open_full")}
            >
              <Maximize2 size={13} />
            </button>
          )}
        </div>
      </div>
      <div className="max-h-[420px] overflow-auto">
        {tab === "types" ? <TypeChartTable /> : <NatureTable />}
      </div>
    </section>
  );
}
