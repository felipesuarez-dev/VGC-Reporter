import { ExternalLink, MonitorPlay, Radio, X, Youtube } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { LiveStreamScreen } from "../../lib/types";
import { openExternal } from "../../lib/openExternal";
import { channelSubscribeUrl } from "../../lib/youtube";

interface Props {
  screens: LiveStreamScreen[];
  onClose: () => void;
}

function wallColumns(count: number): string {
  if (count <= 1) return "grid-cols-1";
  if (count <= 4) return "md:grid-cols-2";
  return "md:grid-cols-2 2xl:grid-cols-3";
}

/**
 * Full-window TV wall. It turns the configured live screens into a showcase:
 * one large signal, or a grid of up to six channels.
 */
export function LiveWall({ screens, onClose }: Props) {
  const { t } = useTranslation();
  const live = screens.filter((screen) => screen.live);

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

      {live.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <Radio size={30} className="text-white/30" />
          <p className="text-sm font-medium text-white/80">
            {t("feed.no_live")}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {screens.map((screen) => (
              <button
                key={screen.source_url}
                type="button"
                className="flex items-center gap-1 rounded-md border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
                onClick={() => openExternal(screen.source_url)}
              >
                <ExternalLink size={12} />
                {screen.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className={`grid min-h-0 flex-1 gap-3 p-3 ${wallColumns(live.length)}`}>
          {live.map((screen) => (
            <div
              key={screen.source_url}
              className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-black"
            >
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-white">
                    {screen.title}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {channelSubscribeUrl(screen.source_url) && (
                    <button
                      type="button"
                      className="rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
                      onClick={() =>
                        openExternal(channelSubscribeUrl(screen.source_url)!)
                      }
                      title={t("feed.subscribe")}
                      aria-label={t("feed.subscribe")}
                    >
                      <Youtube size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
                    onClick={() => screen.url && openExternal(screen.url)}
                    title={t("upcoming.open")}
                    aria-label={t("upcoming.open")}
                  >
                    <ExternalLink size={13} />
                  </button>
                </div>
              </div>
              {screen.embed_url && (
                <iframe
                  src={screen.embed_url}
                  title={screen.title ?? screen.label}
                  className="min-h-0 w-full flex-1"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              )}
              <div className="flex flex-wrap items-center gap-1 px-3 py-1.5">
                <span className="rounded-full bg-red-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-red-400">
                  {t("feed.live_now")}
                </span>
                <span className="rounded-full border border-white/15 px-1.5 py-0.5 text-[9px] text-white/60">
                  {screen.label}
                </span>
                {screen.official && (
                  <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] text-white/60">
                    {t("feed.official")}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
