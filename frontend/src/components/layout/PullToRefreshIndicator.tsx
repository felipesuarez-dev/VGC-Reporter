import { useTranslation } from "react-i18next";
import { ArrowDown, Loader2 } from "lucide-react";
import {
  PULL_TO_REFRESH_THRESHOLD_PX,
  type PullToRefreshState,
} from "../../hooks/usePullToRefresh";

interface Props {
  state: PullToRefreshState;
}

export function PullToRefreshIndicator({ state }: Props) {
  const { t } = useTranslation();
  const { pullDistance, isRefreshing, isPastThreshold } = state;

  const visible = pullDistance > 0 || isRefreshing;
  const opacity = Math.min(1, pullDistance / PULL_TO_REFRESH_THRESHOLD_PX);
  const label = isRefreshing
    ? t("dashboard.refreshing")
    : isPastThreshold
      ? t("ptr.release")
      : t("ptr.pull");

  return (
    <div
      aria-hidden={!visible}
      className="pointer-events-none flex items-end justify-center overflow-hidden"
      style={{
        height: `${pullDistance}px`,
        opacity: isRefreshing ? 1 : opacity,
        transition: pullDistance === 0 ? "height 220ms ease, opacity 220ms ease" : "none",
      }}
    >
      <div
        className="mb-2 flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium shadow-sm backdrop-blur"
        style={{
          backgroundColor: "color-mix(in srgb, var(--bg-elev) 92%, transparent)",
          borderColor: "var(--border)",
          color: isPastThreshold || isRefreshing ? "var(--accent)" : "var(--text-muted)",
        }}
      >
        {isRefreshing ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <ArrowDown
            size={13}
            style={{
              transform: isPastThreshold ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 180ms ease",
            }}
          />
        )}
        <span>{label}</span>
      </div>
    </div>
  );
}
