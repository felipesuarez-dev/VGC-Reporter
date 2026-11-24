import { useTranslation } from "react-i18next";
import {
  CalendarRange,
  Newspaper,
  Radio,
} from "lucide-react";
import type { RegulationInfo } from "../../lib/types";
import {
  FEED_PANEL_IDS,
  useDashboardStore,
  type FeedPanelId,
} from "../../stores/dashboardStore";
import { useLiveStreams } from "../../hooks/useLiveStreams";
import { PanelBoard, type PanelBoardItem } from "../layout/PanelBoard";
import { FeedSummaryCard } from "./FeedSummaryCard";
import { LiveStreamCard } from "./LiveStreamCard";
import { RegulationNews } from "./RegulationNews";
import { PanelLoading } from "../ui/PanelLoading";

interface Props {
  info: RegulationInfo | null;
}

function OfflineBadge() {
  const { t } = useTranslation();
  return (
    <span
      className="rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wide"
      style={{
        backgroundColor: "var(--bg-elev-strong)",
        color: "var(--text-dim)",
      }}
    >
      {t("feed.offline")}
    </span>
  );
}

/**
 * The Feed is the "what is happening now" surface: regulation summary, live
 * wall and official news. Tournaments and the calendar live in the Torneos tab.
 * PanelBoard owns the layout, drag and collapse behavior.
 */
export function RegulationFeed({ info }: Props) {
  const { t } = useTranslation();
  const feedRows = useDashboardStore((s) => s.feedRows);
  const feedPanels = useDashboardStore((s) => s.feedPanels);
  const setFeedRows = useDashboardStore((s) => s.setFeedRows);
  const setFeedCollapsed = useDashboardStore((s) => s.setFeedCollapsed);
  const setAllFeedCollapsed = useDashboardStore((s) => s.setAllFeedCollapsed);
  const resetFeedLayout = useDashboardStore((s) => s.resetFeedLayout);
  const live = useLiveStreams();
  const liveIsOn = live.data?.some((screen) => screen.live) ?? false;

  if (!info) {
    return (
      <section className="card">
        <PanelLoading variant="chart" rows={6} />
      </section>
    );
  }

  const items: Record<FeedPanelId, PanelBoardItem> = {
    summary: {
      label: t("feed.panel_summary"),
      icon: <CalendarRange size={12} />,
    },
    live: {
      label: t("feed.panel_live"),
      icon: <Radio size={12} />,
      badge:
        !liveIsOn && live.isSuccess ? <OfflineBadge /> : undefined,
    },
    news: {
      label: t("feed.panel_news"),
      icon: <Newspaper size={12} />,
    },
  };

  return (
    <PanelBoard
      rows={feedRows}
      panelIds={FEED_PANEL_IDS}
      items={items}
      prefs={feedPanels}
      onRowsChange={setFeedRows}
      onToggle={setFeedCollapsed}
      onAllCollapsed={setAllFeedCollapsed}
      onReset={resetFeedLayout}
      renderPanel={(id, dragging) => {
        if (id === "summary") return <FeedSummaryCard info={info} />;
        if (id === "live") return <LiveStreamCard />;
        return <RegulationNews />;
      }}
    />
  );
}
