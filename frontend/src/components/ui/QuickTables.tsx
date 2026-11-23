import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, Dna, Grid3x3, Maximize2, X } from "lucide-react";
import { cn } from "../../lib/cn";
import { NatureTable, TypeChartTable } from "./TypeLabModal";

export type QuickTableTab = "types" | "natures";

interface Props {
  defaultTab?: QuickTableTab;
  className?: string;
  embedded?: boolean;
  collapsible?: boolean;
}

interface QuickTablesBodyProps {
  tab: QuickTableTab;
  landscape?: boolean;
}

function QuickTablesBody({ tab, landscape = false }: QuickTablesBodyProps) {
  return tab === "types" ? (
    <TypeChartTable landscape={landscape} />
  ) : (
    <NatureTable landscape={landscape} />
  );
}

/**
 * The quick tables are a single component reused in three places: the Feed
 * tab, the Pokédex card and the floating widget. The landscape modal uses the
 * same body with larger cells instead of duplicating the matrices.
 */
export function QuickTables({
  defaultTab = "types",
  className,
  embedded = false,
  collapsible = false,
}: Props) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<QuickTableTab>(defaultTab);
  const [collapsed, setCollapsed] = useState(false);
  const [large, setLarge] = useState(false);

  useEffect(() => {
    setTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    if (!large) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLarge(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [large]);

  return (
    <>
      <section className={cn(embedded ? "space-y-3" : "card space-y-3", className)}>
        <div className="flex flex-wrap items-center justify-between gap-2">
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
                  className="flex h-8 items-center gap-1 px-2.5 text-[10px] font-medium"
                  style={{
                    backgroundColor: tab === id ? "var(--accent-soft)" : "transparent",
                    color: tab === id ? "var(--accent)" : "var(--text-muted)",
                  }}
                  onClick={() => {
                    setTab(id);
                    setCollapsed(false);
                  }}
                >
                  <Icon size={12} />
                  {t(key)}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-elev-strong)]"
              style={{ color: "var(--text-muted)" }}
              onClick={() => setLarge(true)}
              title={t("type_lab.landscape")}
              aria-label={t("type_lab.landscape")}
            >
              <Maximize2 size={13} />
            </button>
            {collapsible && (
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-elev-strong)]"
                style={{ color: "var(--text-muted)" }}
                onClick={() => setCollapsed((value) => !value)}
                title={collapsed ? t("feed.expand") : t("feed.collapse")}
                aria-label={collapsed ? t("feed.expand") : t("feed.collapse")}
                aria-expanded={!collapsed}
              >
                {collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
              </button>
            )}
          </div>
        </div>
        {!collapsed && (
          <div className="max-h-[520px] overflow-auto">
            <QuickTablesBody tab={tab} />
          </div>
        )}
      </section>

      {large && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("type_lab.landscape")}
          className="fixed inset-0 z-[75] flex flex-col bg-black/75 p-2 sm:p-4"
          onClick={() => setLarge(false)}
        >
          <div
            className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border shadow-2xl"
            style={{ backgroundColor: "var(--bg-elev)", borderColor: "var(--border)" }}
            onClick={(event) => event.stopPropagation()}
          >
            <header
              className="flex items-center justify-between gap-2 border-b px-3 py-2"
              style={{
                borderColor: "var(--border)",
                paddingTop: "max(env(safe-area-inset-top, 0px), 0.5rem)",
              }}
            >
              <div className="flex items-center gap-2">
                <Grid3x3 size={15} style={{ color: "var(--accent)" }} />
                <h2 className="text-sm font-semibold">{t("type_lab.landscape")}</h2>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex overflow-hidden rounded-md border" style={{ borderColor: "var(--border)" }}>
                  {(
                    [
                      ["types", "type_lab.tab_table"],
                      ["natures", "type_lab.tab_natures"],
                    ] as const
                  ).map(([id, key]) => (
                    <button
                      key={id}
                      type="button"
                      className="px-2.5 py-1 text-[11px] font-medium"
                      style={{
                        backgroundColor: tab === id ? "var(--accent-soft)" : "transparent",
                        color: tab === id ? "var(--accent)" : "var(--text-muted)",
                      }}
                      onClick={() => setTab(id)}
                    >
                      {t(key)}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="rounded p-1"
                  style={{ color: "var(--text-muted)" }}
                  onClick={() => setLarge(false)}
                  aria-label={t("common.close")}
                  title={t("common.close")}
                >
                  <X size={16} />
                </button>
              </div>
            </header>
            <div className="min-h-0 flex-1 overflow-auto p-2 sm:p-3">
              <QuickTablesBody tab={tab} landscape />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
