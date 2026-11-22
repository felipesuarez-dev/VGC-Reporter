import {
  AlertTriangle,
  ExternalLink,
  Eye,
  EyeOff,
  History,
  Info,
  Loader2,
  Maximize2,
  Minimize2,
  MonitorPlay,
  PanelBottom,
  PanelRight,
  Pin,
  Play,
  Radio,
  RefreshCw,
  Settings2,
  Square,
  Youtube,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useLiveStreams } from "../../hooks/useLiveStreams";
import { useUiStore } from "../../stores/uiStore";
import type { LiveStreamScreen, OfficialLiveStream } from "../../lib/types";
import { openExternal } from "../../lib/openExternal";
import { channelSubscribeUrl } from "../../lib/youtube";
import { LiveWall } from "./LiveWall";
import { PlaybackHost, usePlayback } from "../playback/PlaybackProvider";

interface Props {
  className?: string;
  /** Disable the iframes while a drag is in progress so drop targets work. */
  dragging?: boolean;
}

/**
 * TV wall of the configured YouTube screens. The official channel and YukS
 * VGC are the defaults; the user can add more URLs in Settings. When nobody is
 * live the panel stays visible and tells which channels are offline.
 */
export function LiveStreamCard({
  className = "card",
  dragging = false,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const streams = useLiveStreams();
  const [wallOpen, setWallOpen] = useState(false);
  const [featuredUrl, setFeaturedUrl] = useState<string | null>(null);
  const [featuredView, setFeaturedView] = useState<"featured" | "equal">(
    "featured",
  );
  const [featuredLayout, setFeaturedLayout] = useState<"side" | "below">(
    "side",
  );
  const hiddenScreens = useUiStore((s) => s.hiddenLiveScreens);
  const toggleHidden = useUiStore((s) => s.toggleLiveScreenHidden);
  const playback = usePlayback();
  // Per-session stop state. Stopping unmounts only that iframe; the screen
  // stays configured and can be resumed with Play. It is intentionally not
  // persisted: reopening the app starts every configured stream fresh.
  const [stoppedScreens, setStoppedScreens] = useState<string[]>([]);
  const toggleStopped = (url: string) =>
    setStoppedScreens((current) =>
      current.includes(url)
        ? current.filter((entry) => entry !== url)
        : [...current, url],
    );

  const screens = streams.data ?? [];
  const visibleScreens = screens.filter(
    (screen) => !hiddenScreens.includes(screen.source_url),
  );
  const allLive = screens.filter((screen) => screen.live);
  const live = visibleScreens.filter((screen) => screen.live);
  const hiddenLive = screens.filter(
    (screen) =>
      screen.live && hiddenScreens.includes(screen.source_url),
  );
  const recentStreams = screens
    .filter((screen) => !screen.live && screen.recent)
    .map((screen) => ({ screen, stream: screen.recent! }));
  const showRecent = allLive.length === 0 && recentStreams.length > 0;
  const featured =
    featuredView === "featured" && live.length > 1
      ? (live.find((screen) => screen.source_url === featuredUrl) ?? live[0])
      : null;
  const featureScreen = (url: string) => {
    setFeaturedUrl(url);
    setFeaturedView("featured");
  };
  const showEqual = () => setFeaturedView("equal");

  // If the kept stream goes offline (or disappears from the list while the
  // app is open), stop its audio instead of leaving it playing in a hidden
  // host.
  useEffect(() => {
    if (!playback.active || streams.isLoading || !streams.data) return;
    const stillLive = streams.data.some(
      (screen) =>
        screen.source_url === playback.active?.source_url && screen.live,
    );
    if (!stillLive) playback.stop();
  }, [playback, streams.data, streams.isLoading]);

  const controls = (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
      {featured && (
        <div
          className="flex items-center overflow-hidden rounded-md border"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center"
            style={{
              backgroundColor:
                featuredLayout === "side"
                  ? "var(--accent-soft)"
                  : "transparent",
              color:
                featuredLayout === "side"
                  ? "var(--accent)"
                  : "var(--text-dim)",
            }}
            onClick={() => setFeaturedLayout("side")}
            title={t("feed.layout_side")}
            aria-label={t("feed.layout_side")}
          >
            <PanelRight size={13} />
          </button>
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center"
            style={{
              backgroundColor:
                featuredLayout === "below"
                  ? "var(--accent-soft)"
                  : "transparent",
              color:
                featuredLayout === "below"
                  ? "var(--accent)"
                  : "var(--text-dim)",
            }}
            onClick={() => setFeaturedLayout("below")}
            title={t("feed.layout_below")}
            aria-label={t("feed.layout_below")}
          >
            <PanelBottom size={13} />
          </button>
        </div>
      )}
      <button
        type="button"
        className="flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold transition-colors"
        style={{
          borderColor: "var(--accent)",
          backgroundColor: "var(--accent-soft)",
          color: "var(--accent)",
        }}
        onClick={() => setWallOpen(true)}
        title={t("feed.tv_wall_hint")}
      >
        <MonitorPlay size={12} />
        {t("feed.tv_wall")}
      </button>
      <button
        type="button"
        className="btn-ghost text-xs"
        onClick={() => streams.refetch()}
        disabled={streams.isFetching}
        aria-label={t("dashboard.refresh")}
        title={t("dashboard.refresh")}
      >
        <RefreshCw
          size={13}
          className={streams.isFetching ? "animate-spin" : undefined}
        />
      </button>
      <button
        type="button"
        className="btn-ghost text-xs"
        onClick={() => navigate("/settings")}
        aria-label={t("feed.configure_stream")}
        title={t("feed.configure_stream")}
      >
        <Settings2 size={13} />
      </button>
    </div>
  );

  if (streams.isLoading) {
    return <LiveLoading className={className} />;
  }

  if (streams.isError) {
    return (
      <section className={`${className} flex flex-col gap-3`}>
        <div className="flex items-start gap-2">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--danger) 14%, transparent)",
              color: "var(--danger)",
            }}
          >
            <AlertTriangle size={15} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              {t("feed.stream_error")}
            </p>
            <p className="text-[10px]" style={{ color: "var(--text-dim)" }}>
              {t("feed.stream_error_hint")}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="btn-ghost self-start text-xs"
          onClick={() => streams.refetch()}
          disabled={streams.isFetching}
        >
          <RefreshCw
            size={12}
            className={`mr-1 ${streams.isFetching ? "animate-spin" : ""}`}
          />
          {t("common.retry")}
        </button>
      </section>
    );
  }

  const wall = wallOpen ? (
    <LiveWall screens={visibleScreens} onClose={() => setWallOpen(false)} />
  ) : null;

  if (live.length === 0) {
    return (
      <>
        <section className={`${className} flex flex-col gap-3`}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: "var(--bg-elev-strong)",
                  color: "var(--text-dim)",
                }}
              >
                {showRecent ? <History size={15} /> : <Radio size={15} />}
              </span>
              <div className="min-w-0">
                <p
                  className="text-sm font-semibold"
                  style={{ color: "var(--text)" }}
                >
                  {hiddenLive.length > 0
                    ? t("feed.all_hidden")
                    : showRecent
                      ? t("feed.recent_streams")
                      : t("feed.no_live_available")}
                </p>
                <p className="text-[10px]" style={{ color: "var(--text-dim)" }}>
                  {hiddenLive.length > 0
                    ? t("feed.all_hidden_hint")
                    : showRecent
                      ? t("feed.recent_hint")
                      : t("feed.no_live_hint")}
                </p>
              </div>
            </div>
            {controls}
          </div>

          {showRecent && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {recentStreams.slice(0, 6).map(({ screen, stream }) => (
                <RecentStream
                  key={`${screen.source_url}-${stream.video_id}`}
                  screen={screen}
                  stream={stream}
                />
              ))}
            </div>
          )}

          {(hiddenLive.length > 0 ||
            screens.some((screen) => !screen.live)) && (
            <div className="flex flex-wrap gap-1.5">
              {hiddenLive.map((screen) => (
                <HiddenLiveChannel
                  key={screen.source_url}
                  screen={screen}
                  onShow={() => toggleHidden(screen.source_url)}
                />
              ))}
              {screens
                .filter((screen) => !screen.live)
                .map((screen) => (
                  <OffscreenChannel key={screen.source_url} screen={screen} />
                ))}
            </div>
          )}

          <p
            className="flex items-start gap-1 text-[10px]"
            style={{ color: "var(--text-dim)" }}
          >
            <Info size={11} className="mt-0.5 shrink-0" />
            {t("feed.stream_disclaimer")}
          </p>
        </section>
        {wall}
      </>
    );
  }

  return (
    <>
      <section className={`${className} flex flex-col gap-3`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{
                backgroundColor:
                  "color-mix(in srgb, var(--danger) 16%, transparent)",
                color: "var(--danger)",
              }}
            >
              <Radio size={15} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h2
                  className="text-sm font-semibold"
                  style={{ color: "var(--text)" }}
                >
                  {t("feed.live_now")}
                </h2>
                <span
                  className="h-1.5 w-1.5 animate-pulse rounded-full"
                  style={{ backgroundColor: "var(--danger)" }}
                />
                {live.length > 1 && (
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                    style={{
                      backgroundColor: "var(--bg-elev-strong)",
                      color: "var(--text-muted)",
                    }}
                  >
                    {t("feed.live_count", { count: live.length })}
                  </span>
                )}
              </div>
              <p className="text-[10px]" style={{ color: "var(--text-dim)" }}>
                {t("feed.live_hint_multi")}
              </p>
            </div>
          </div>
          {controls}
        </div>

        {/* One stable grid: every tile is a sibling with a stable key.
            Featuring or hiding a stream only changes classes / removes that
            one tile, so React never remounts the other iframes. */}
        <div
          className={`grid gap-3 ${
            featured && featuredLayout === "side"
              ? "lg:grid-cols-4"
              : live.length > 1
                ? "lg:grid-cols-2"
                : "mx-auto w-full max-w-5xl"
          }`}
        >
          {live.map((screen) => {
            const isFeatured =
              Boolean(featured) && featured?.source_url === screen.source_url;
            const span =
              isFeatured && featuredLayout === "side"
                ? "order-first lg:col-span-3 lg:row-span-2"
                : isFeatured
                  ? "order-first lg:col-span-2"
                  : "";
            return (
              <div key={screen.source_url} className={span}>
                <LiveTile
                  screen={screen}
                  dragging={dragging}
                  featured={isFeatured}
                  stopped={stoppedScreens.includes(screen.source_url)}
                  onToggleStop={() => toggleStopped(screen.source_url)}
                  kept={playback.active?.source_url === screen.source_url}
                  onKeep={() => playback.activate(screen)}
                  onUnkeep={() => playback.stop()}
                  onFeature={
                    live.length > 1
                      ? () => featureScreen(screen.source_url)
                      : undefined
                  }
                  onReset={isFeatured ? showEqual : undefined}
                  onHide={() => {
                    if (playback.active?.source_url === screen.source_url) {
                      playback.stop();
                    }
                    toggleHidden(screen.source_url);
                  }}
                />
              </div>
            );
          })}
        </div>

        {(hiddenLive.length > 0 ||
          screens.some((screen) => !screen.live)) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {hiddenLive.map((screen) => (
              <HiddenLiveChannel
                key={screen.source_url}
                screen={screen}
                onShow={() => toggleHidden(screen.source_url)}
              />
            ))}
            {screens
              .filter((screen) => !screen.live)
              .map((screen) => (
                <OffscreenChannel key={screen.source_url} screen={screen} />
              ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            className="flex items-start gap-1 text-[10px]"
            style={{ color: "var(--text-dim)" }}
          >
            <Info size={11} className="mt-0.5 shrink-0" />
            {t("feed.stream_disclaimer")}
          </span>
        </div>
      </section>
      {wall}
    </>
  );
}

function LiveTile({
  screen,
  dragging,
  featured = false,
  stopped = false,
  kept = false,
  onToggleStop,
  onKeep,
  onUnkeep,
  onFeature,
  onReset,
  onHide,
}: {
  screen: LiveStreamScreen;
  dragging: boolean;
  featured?: boolean;
  stopped?: boolean;
  kept?: boolean;
  onToggleStop?: () => void;
  onKeep?: () => void;
  onUnkeep?: () => void;
  onFeature?: () => void;
  onReset?: () => void;
  onHide?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            className="line-clamp-2 text-xs font-semibold"
            style={{ color: "var(--text)" }}
          >
            {screen.title}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
          {(onKeep || onUnkeep) && (
            <button
              type="button"
              className="flex items-center gap-1 rounded-md border px-1.5 py-1 text-[10px] font-medium"
              style={{
                borderColor: kept ? "var(--accent)" : "var(--border)",
                backgroundColor: kept ? "var(--accent-soft)" : "transparent",
                color: kept ? "var(--accent)" : "var(--text-muted)",
              }}
              onClick={kept ? onUnkeep : onKeep}
              title={kept ? t("feed.unkeep_stream") : t("feed.keep_stream")}
              aria-label={kept ? t("feed.unkeep_stream") : t("feed.keep_stream")}
              aria-pressed={kept}
            >
              <Pin size={11} />
              <span className="hidden sm:inline">
                {kept ? t("feed.unkeep") : t("feed.keep")}
              </span>
            </button>
          )}
          {onToggleStop && (
            <button
              type="button"
              className="flex items-center gap-1 rounded-md border px-1.5 py-1 text-[10px] font-medium"
              style={{
                borderColor: stopped ? "var(--accent)" : "var(--border)",
                backgroundColor: stopped ? "var(--accent-soft)" : "transparent",
                color: stopped ? "var(--accent)" : "var(--text-muted)",
              }}
              onClick={onToggleStop}
              title={stopped ? t("feed.resume_stream") : t("feed.stop_stream")}
              aria-label={stopped ? t("feed.resume_stream") : t("feed.stop_stream")}
              aria-pressed={stopped}
              data-testid={`live-stop-${screen.source_url}`}
            >
              {stopped ? <Play size={11} /> : <Square size={11} />}
              <span className="hidden sm:inline">
                {stopped ? t("feed.resume") : t("feed.stop")}
              </span>
            </button>
          )}
          {onHide && (
            <button
              type="button"
              className="btn-ghost text-[10px]"
              onClick={onHide}
              title={t("feed.hide_stream")}
              aria-label={t("feed.hide_stream")}
            >
              <Eye size={12} />
            </button>
          )}
          {featured ? (
            <button
              type="button"
              className="flex items-center gap-1 rounded-md border px-1.5 py-1 text-[10px] font-medium"
              style={{
                borderColor: "var(--border)",
                color: "var(--text-muted)",
              }}
              onClick={onReset}
              title={t("feed.unfeature")}
            >
              <Minimize2 size={11} />
              {t("feed.unfeature")}
            </button>
          ) : (
            onFeature && (
              <button
                type="button"
                className="flex items-center gap-1 rounded-md border px-1.5 py-1 text-[10px] font-semibold"
                style={{
                  borderColor: "var(--accent)",
                  backgroundColor: "var(--accent-soft)",
                  color: "var(--accent)",
                }}
                onClick={onFeature}
                title={t("feed.feature_hint")}
              >
                <Maximize2 size={11} />
                {t("feed.feature")}
              </button>
            )
          )}
          {channelSubscribeUrl(screen.source_url) && (
            <button
              type="button"
              className="btn-ghost text-[10px]"
              onClick={() =>
                openExternal(channelSubscribeUrl(screen.source_url)!)
              }
              title={t("feed.subscribe")}
            >
              <Youtube size={11} className="mr-0.5" />
              {t("feed.subscribe")}
            </button>
          )}
          <button
            type="button"
            className="btn-ghost text-[10px]"
            onClick={() => screen.url && openExternal(screen.url)}
            title={t("upcoming.open")}
          >
            <ExternalLink size={11} className="mr-0.5" />
            {t("upcoming.open")}
          </button>
        </div>
      </div>
      <div
        className="relative w-full overflow-hidden rounded-lg border"
        style={{ borderColor: "var(--border)" }}
      >
        {kept ? (
          <PlaybackHost screen={screen} />
        ) : stopped ? (
          <div
            className="flex aspect-video w-full flex-col items-center justify-center gap-2"
            style={{ backgroundColor: "var(--bg)" }}
          >
            <span className="text-[11px]" style={{ color: "var(--text-dim)" }}>
              {t("feed.stream_stopped")}
            </span>
            {onToggleStop && (
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={onToggleStop}
              >
                <Play size={12} className="mr-1" />
                {t("feed.resume_stream")}
              </button>
            )}
          </div>
        ) : (
          <iframe
            src={screen.embed_url ?? ""}
            title={screen.title ?? screen.label}
            className="aspect-video w-full"
            style={{ pointerEvents: dragging ? "none" : undefined }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <span
          className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--danger) 16%, transparent)",
            color: "var(--danger)",
          }}
        >
          {t("feed.live_now")}
        </span>
        <span
          className="rounded-full border px-1.5 py-0.5 text-[9px]"
          style={{
            borderColor: "var(--border)",
            color: "var(--text-muted)",
          }}
        >
          {screen.label}
        </span>
        {screen.official && (
          <span
            className="rounded-full px-1.5 py-0.5 text-[9px]"
            style={{
              backgroundColor: "var(--accent-soft)",
              color: "var(--accent)",
            }}
          >
            {t("feed.official")}
          </span>
        )}
      </div>
    </div>
  );
}

function LiveLoading({ className = "card" }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <section
      className={`${className} flex flex-col gap-3`}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{
            backgroundColor: "var(--accent-soft)",
            color: "var(--accent)",
          }}
        >
          <Loader2 size={15} className="animate-spin" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            {t("feed.loading_streams")}
          </p>
          <p className="text-[10px]" style={{ color: "var(--text-dim)" }}>
            {t("feed.loading_streams_hint")}
          </p>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {[0, 1].map((index) => (
          <div
            key={index}
            className="overflow-hidden rounded-lg border"
            style={{ borderColor: "var(--border)" }}
          >
            <div
              className="aspect-video w-full animate-pulse"
              style={{
                background:
                  "linear-gradient(110deg, var(--bg-elev-strong) 8%, var(--bg-elev) 18%, var(--bg-elev-strong) 33%)",
                backgroundSize: "200% 100%",
              }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function RecentStream({
  screen,
  stream,
}: {
  screen: LiveStreamScreen;
  stream: OfficialLiveStream;
}) {
  const { t } = useTranslation();
  const url = stream.url ?? screen.source_url;
  return (
    <button
      type="button"
      className="group min-w-0 text-left"
      onClick={() => openExternal(url)}
      title={`${stream.title} · ${screen.label}`}
    >
      <div
        className="relative aspect-video overflow-hidden rounded-lg border"
        style={{ borderColor: "var(--border)" }}
      >
        <img
          src={stream.thumbnail_url}
          alt=""
          className="h-full w-full object-cover opacity-85 transition-opacity group-hover:opacity-100"
          loading="lazy"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/20">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(0,0,0,0.62)" }}
          >
            <Play size={16} className="ml-0.5 text-white" fill="white" />
          </span>
        </span>
        <span
          className="absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide"
          style={{
            backgroundColor: "var(--accent-soft)",
            color: "var(--accent)",
          }}
        >
          {t("feed.last_stream")}
        </span>
      </div>
      <p
        className="mt-1 line-clamp-2 text-[11px] font-medium"
        style={{ color: "var(--text)" }}
      >
        {stream.title}
      </p>
      <p className="text-[9px]" style={{ color: "var(--text-dim)" }}>
        {screen.label}
      </p>
    </button>
  );
}

function HiddenLiveChannel({
  screen,
  onShow,
}: {
  screen: LiveStreamScreen;
  onShow: () => void;
}) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] transition-colors hover:bg-[var(--bg-elev-strong)]"
      style={{
        borderColor: "color-mix(in srgb, var(--danger) 45%, var(--border))",
        color: "var(--text-muted)",
      }}
      onClick={onShow}
      title={t("feed.show_stream")}
      aria-label={t("feed.show_stream")}
    >
      <EyeOff size={11} />
      <span
        className="rounded-full px-1 py-0.5 text-[8px] font-semibold uppercase tracking-wide"
        style={{
          backgroundColor:
            "color-mix(in srgb, var(--danger) 16%, transparent)",
          color: "var(--danger)",
        }}
      >
        {t("feed.live_now")}
      </span>
      <span className="max-w-[9rem] truncate">{screen.label}</span>
    </button>
  );
}

function OffscreenChannel({ screen }: { screen: LiveStreamScreen }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] transition-colors hover:bg-[var(--bg-elev-strong)]"
      style={{
        borderColor: "var(--border)",
        color: "var(--text-dim)",
      }}
      onClick={() => openExternal(screen.source_url)}
      title={`${screen.label} · ${t("feed.screen_offline")}`}
    >
      <Radio size={10} />
      <span className="max-w-[10rem] truncate">{screen.label}</span>
      <span style={{ color: "var(--text-muted)" }}>
        · {t("feed.screen_offline")}
      </span>
    </button>
  );
}
