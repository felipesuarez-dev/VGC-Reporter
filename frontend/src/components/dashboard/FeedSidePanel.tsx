import { useState } from "react";
import { CalendarClock, CalendarDays, Table2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { RegulationInfo } from "../../lib/types";
import { useUiStore } from "../../stores/uiStore";
import { QuickTables } from "../ui/QuickTables";
import { UpcomingTournamentsSection } from "./UpcomingTournamentsSection";
import { FeedCalendar } from "./FeedCalendar";

type FeedTab = "upcoming" | "calendar" | "tables";

interface Props {
  info: RegulationInfo;
}

/**
 * Upcoming events and calendar. The old "Sources" tab was removed because the
 * information lives in Regulación and Settings; this panel is for actionable
 * events (preview, map and add-to-calendar).
 */
export function FeedSidePanel({ info }: Props) {
  const { t } = useTranslation();
  const quickTablesDefaultTab = useUiStore((s) => s.quickTablesDefaultTab);
  const [tab, setTab] = useState<FeedTab>("upcoming");
  const tabs: { id: FeedTab; label: string; icon: typeof CalendarClock }[] = [
    { id: "upcoming", label: t("feed.tab_upcoming"), icon: CalendarClock },
    { id: "calendar", label: t("feed.tab_calendar"), icon: CalendarDays },
    { id: "tables", label: t("feed.tab_tables"), icon: Table2 },
  ];

  return (
    <section className="card flex min-h-[280px] flex-col">
      <div
        role="tablist"
        aria-label={t("feed.tab_upcoming")}
        className="mb-3 inline-flex self-start rounded-lg border p-0.5"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--bg-elev-strong)",
        }}
      >
        {tabs.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors"
              style={{
                backgroundColor: active ? "var(--accent-soft)" : "transparent",
                color: active ? "var(--accent)" : "var(--text-muted)",
              }}
            >
              <Icon size={12} />
              {label}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1">
        {tab === "upcoming" && (
          <UpcomingTournamentsSection
            formatCode={info.code}
            limit={8}
            className=""
          />
        )}
        {tab === "calendar" && <FeedCalendar info={info} />}
        {tab === "tables" && (
          <QuickTables embedded defaultTab={quickTablesDefaultTab} />
        )}
      </div>
    </section>
  );
}
