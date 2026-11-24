import { BarChart3, BookOpen, Newspaper, Pin, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DashboardView } from "../../stores/dashboardStore";

interface Props {
  view: DashboardView;
  pinned: boolean;
  onChange: (view: DashboardView) => void;
  onPin: () => void;
}

export function DashboardViewTabs({ view, pinned, onChange, onPin }: Props) {
  const { t } = useTranslation();
  const tabs: { id: DashboardView; label: string; icon: typeof BarChart3 }[] = [
    { id: "feed", label: t("dashboard.view_feed"), icon: Newspaper },
    { id: "tournaments", label: t("dashboard.view_tournaments"), icon: Trophy },
    { id: "metrics", label: t("dashboard.view_metrics"), icon: BarChart3 },
    {
      id: "regulation",
      label: t("dashboard.view_regulation"),
      icon: BookOpen,
    },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div
        role="tablist"
        aria-label={t("dashboard.views")}
        className="inline-flex max-w-full flex-wrap rounded-xl border p-1"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--bg-elev)",
        }}
      >
        {tabs.map((tab) => {
          const active = view === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.id)}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                backgroundColor: active ? "var(--accent-soft)" : "transparent",
                color: active ? "var(--accent)" : "var(--text-muted)",
              }}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onPin}
        className="btn-ghost h-8 text-[11px]"
        title={
          pinned ? t("dashboard.view_pinned") : t("dashboard.pin_view")
        }
        aria-pressed={pinned}
      >
        <Pin
          size={13}
          className="mr-1"
          style={{ fill: pinned ? "currentColor" : "none" }}
        />
        {pinned ? t("dashboard.view_pinned") : t("dashboard.pin_view")}
      </button>
    </div>
  );
}
