import { CalendarClock, CalendarDays, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Format, RegulationInfo } from "../../lib/types";
import {
  TOURNAMENT_PANEL_IDS,
  useDashboardStore,
  type TournamentPanelId,
} from "../../stores/dashboardStore";
import { PanelBoard, type PanelBoardItem } from "../layout/PanelBoard";
import { PanelLoading } from "../ui/PanelLoading";
import { FeedCalendar } from "./FeedCalendar";
import { RecentTournamentsSection } from "./RecentTournamentsSection";
import { UpcomingTournamentsSection } from "./UpcomingTournamentsSection";

interface Props {
  format: Format;
  info: RegulationInfo | null;
}

/**
 * Tournaments is its own Dashboard tab: upcoming events, recent results and the
 * calendar share the same dynamic board as Novedades/Métricas/Regulación.
 */
export function TournamentsView({ format, info }: Props) {
  const { t } = useTranslation();
  const rows = useDashboardStore((s) => s.tournamentRows);
  const panels = useDashboardStore((s) => s.tournamentPanels);
  const setRows = useDashboardStore((s) => s.setTournamentRows);
  const setCollapsed = useDashboardStore((s) => s.setTournamentCollapsed);
  const setAllCollapsed = useDashboardStore(
    (s) => s.setAllTournamentCollapsed,
  );
  const resetLayout = useDashboardStore((s) => s.resetTournamentLayout);

  const items: Record<TournamentPanelId, PanelBoardItem> = {
    upcoming: {
      label: t("upcoming.title"),
      icon: <CalendarClock size={12} />,
    },
    recent: {
      label: t("dashboard.recent_tournaments"),
      icon: <Trophy size={12} />,
    },
    calendar: {
      label: t("calendar.widget_title"),
      icon: <CalendarDays size={12} />,
    },
  };

  return (
    <PanelBoard
      rows={rows}
      panelIds={TOURNAMENT_PANEL_IDS}
      items={items}
      prefs={panels}
      onRowsChange={setRows}
      onToggle={setCollapsed}
      onAllCollapsed={setAllCollapsed}
      onReset={resetLayout}
      renderPanel={(id) => {
        if (id === "upcoming") {
          return (
            <UpcomingTournamentsSection
              formatCode={info?.code ?? null}
              className="card"
            />
          );
        }
        if (id === "recent") {
          return <RecentTournamentsSection format={format} />;
        }
        if (!info) {
          return (
            <section className="card">
              <PanelLoading variant="calendar" rows={4} />
            </section>
          );
        }
        return (
          <section className="card">
            <FeedCalendar info={info} />
          </section>
        );
      }}
    />
  );
}
