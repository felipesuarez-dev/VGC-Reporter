import { ExternalLink, MonitorPlay, Radio, Tv, X, Youtube } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { LiveStreamScreen } from "../../lib/types";
import { openExternal } from "../../lib/openExternal";
import { channelSubscribeUrl } from "../../lib/youtube";

interface Props {
  screens: LiveStreamScreen[];
  onClose: () => void;
}

/**
 * Full-window TV wall. It is deliberately a fixed 3x3 showcase: nine slots,
 * never one giant player that stretches when only one channel is live. Live
 * signals fill first, then configured offline channels, then neutral slots.
 */
export function LiveWall({ screens, onClose }: Props) {
  const { t } = useTranslation();
  const live = screens.filter((screen) => screen.live);
  const slots = useMemo(() => {
    const ordered = [...live, ...screens.filter((screen) => !screen.live)];
    return Array.from({ length: 9 }, (_, index) => ordered[index] ?? null);
  }, [live, screens]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("feed.tv_wall")}
      className="fixed inset-0 z-[80] flex flex-col"
      style={{ backgroundColor: "#050409" }}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{
              backgroundColor: "var(--accent-soft)",
              color: "var(--accent)",
            }}
          >
            <MonitorPlay size={16} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white">
              {t("feed.tv_wall")}
            </h2>
            <p className="text-[10px] text-white/50">
              {live.length > 0
                ? t("feed.live_count", { count: live.length })
                : t("feed.no_live_short")}
              {screens.length > 9
                ? ` · ${t("feed.showing_nine", { count: screens.length })}`
                : ""}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="flex items-center gap-1 rounded-md border border-white/15 px-2.5 py-1.5 text-xs text-white/80 transition-colors hover:bg-white/10"
          onClick={onClose}
          aria-label={t("common.close")}
          title={t("common.close")}
        >
          <X size={14} />
          {t("common.close")}
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="mx-auto grid max-w-[1800px] grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {slots.map((screen, index) =>
            screen ? (
              <LiveWallTile key={screen.source_url} screen={screen} />
            ) : (
              <EmptySlot key={`empty-${index}`} />
            ),
          )}
        </div>
      </div>
    </div>
  );
}

function LiveWallTile({ screen }: { screen: LiveStreamScreen }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-black">
      <div className="flex min-h-8 items-center justify-between gap-2 px-2.5 py-1.5">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold text-white">
            {screen.title ?? screen.label}
          </p>
          <p className="truncate text-[9px] text-white/45">{screen.label}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {channelSubscribeUrl(screen.source_url) && (
            <button
              type="button"
              className="rounded-md p-1 text-white/60 hover:bg-white/10 hover:text-white"
              onClick={() => void openExternal(channelSubscribeUrl(screen.source_url)!)}
              title={t("feed.subscribe")}
              aria-label={t("feed.subscribe")}
            >
              <Youtube size={13} />
            </button>
          )}
          {screen.url && (
            <button
              type="button"
              className="rounded-md p-1 text-white/60 hover:bg-white/10 hover:text-white"
              onClick={() => void openExternal(screen.url!)}
              title={t("upcoming.open")}
              aria-label={t("upcoming.open")}
            >
              <ExternalLink size={12} />
            </button>
          )}
        </div>
      </div>
      {screen.live && screen.embed_url ? (
        <iframe
          src={screen.embed_url}
          title={screen.title ?? screen.label}
          className="aspect-video w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <div
          className="flex aspect-video w-full flex-col items-center justify-center gap-1.5 text-center"
          style={{ backgroundColor: "#0b0a14" }}
        >
          <Radio size={20} className="text-white/25" />
          <span className="text-[10px] text-white/45">
            {t("feed.screen_offline")}
          </span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1 px-2.5 py-1.5">
        {screen.live ? (
          <span className="rounded-full bg-red-500/20 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-red-400">
            {t("feed.live_now")}
          </span>
        ) : (
          <span className="rounded-full border border-white/15 px-1.5 py-0.5 text-[8px] uppercase tracking-wide text-white/45">
            {t("feed.offline")}
          </span>
        )}
        <span className="rounded-full border border-white/15 px-1.5 py-0.5 text-[8px] text-white/60">
          {screen.label}
        </span>
        {screen.official && (
          <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[8px] text-white/60">
            {t("feed.official")}
          </span>
        )}
      </div>
    </div>
  );
}

function EmptySlot() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
      <Tv size={22} className="text-white/20" />
      <span className="text-[10px] text-white/35">{t("feed.empty_tv_slot")}</span>
    </div>
  );
}
