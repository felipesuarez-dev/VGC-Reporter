import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ExternalLink, X } from "lucide-react";
import type { LiveStreamScreen } from "../../lib/types";
import { usePlaybackStore } from "../../stores/playbackStore";
import { openExternal } from "../../lib/openExternal";

interface PlaybackContextValue {
  active: LiveStreamScreen | null;
  activate: (screen: LiveStreamScreen) => void;
  stop: () => void;
  attach: (host: HTMLDivElement | null) => void;
}

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

/**
 * Owns exactly one YouTube iframe for the stream the user asked to keep.
 * The iframe is never recreated when React changes route or tile: it is moved
 * between a hidden host and the visible host with `appendChild`, which keeps
 * the browsing context (and playback) alive.
 */
export function PlaybackProvider({ children }: { children: ReactNode }) {
  const hiddenHostRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [active, setActive] = useState<LiveStreamScreen | null>(null);

  const attach = useCallback((host: HTMLDivElement | null) => {
    const frame = frameRef.current;
    if (!frame) return;
    const target = host ?? hiddenHostRef.current;
    if (target && frame.parentElement !== target) {
      target.appendChild(frame);
    }
  }, []);

  const activate = useCallback((screen: LiveStreamScreen) => {
    if (!screen.embed_url) return;
    if (!frameRef.current) {
      const frame = document.createElement("iframe");
      frame.className = "h-full w-full";
      frame.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      frame.allowFullscreen = true;
      frame.referrerPolicy = "strict-origin-when-cross-origin";
      frame.title = screen.title ?? screen.label;
      frame.src = screen.embed_url;
      // Park it off-screen immediately. The tile's PlaybackHost will claim it
      // on mount; parking it here avoids a flash before that commit.
      hiddenHostRef.current?.appendChild(frame);
      frameRef.current = frame;
    } else if (frameRef.current.src !== screen.embed_url) {
      frameRef.current.src = screen.embed_url;
      frameRef.current.title = screen.title ?? screen.label;
    }
    setActive(screen);
  }, []);

  const stop = useCallback(() => {
    const frame = frameRef.current;
    if (frame) {
      frame.src = "about:blank";
      frame.remove();
      frameRef.current = null;
    }
    setActive(null);
  }, []);

  useEffect(() => () => stop(), [stop]);

  return (
    <PlaybackContext.Provider value={{ active, activate, stop, attach }}>
      <div ref={hiddenHostRef} aria-hidden className="pointer-events-none fixed h-0 w-0 overflow-hidden opacity-0" />
      {children}
    </PlaybackContext.Provider>
  );
}

export function usePlayback(): PlaybackContextValue {
  const context = useContext(PlaybackContext);
  if (!context) throw new Error("usePlayback must be used inside PlaybackProvider");
  return context;
}

/** Slot used by a live tile when that screen is the kept stream. */
export function PlaybackHost({ screen }: { screen: LiveStreamScreen }) {
  const { active, attach } = usePlayback();
  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      if (active?.source_url === screen.source_url) attach(node);
    },
    [active?.source_url, attach, screen.source_url],
  );
  if (active?.source_url !== screen.source_url) return null;
  return (
    <div
      ref={ref}
      className="aspect-video w-full overflow-hidden bg-black"
      data-testid={`playback-host-${screen.source_url}`}
    />
  );
}

/**
 * Docked mini player used outside Novedades. With `stop` mode the provider is
 * cleared on route change; with `mini` the same iframe is moved here.
 */
export function MiniPlayback() {
  const { t } = useTranslation();
  const location = useLocation();
  const { active, stop, attach } = usePlayback();
  const continuity = usePlaybackStore((s) => s.continuity);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const awayFromDashboard = location.pathname !== "/dashboard";

  useEffect(() => {
    if (!active) return;
    if (!awayFromDashboard) {
      // The tile owns the iframe while Novedades is visible. Do not steal it:
      // the PlaybackHost ref runs before this effect and may have just
      // attached it to the grid.
      return;
    }
    if (continuity === "stop") {
      stop();
      return;
    }
    attach(hostRef.current);
  }, [active, attach, awayFromDashboard, continuity, stop]);

  const visible =
    Boolean(active) && awayFromDashboard && continuity === "mini";

  return (
    <div
      className={
        visible
          ? "fixed bottom-4 right-4 z-[60] w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border shadow-2xl"
          : "hidden"
      }
      aria-hidden={!visible}
      style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-elev)" }}
    >
      <div className="flex items-center justify-between gap-2 px-2 py-1.5">
        <span className="truncate text-[10px] font-semibold" style={{ color: "var(--text)" }}>
          {active?.title ?? active?.label ?? ""}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {active?.url && (
            <button
              type="button"
              className="rounded p-1"
              style={{ color: "var(--text-muted)" }}
              onClick={() => void openExternal(active.url!)}
              title={t("upcoming.open")}
              aria-label={t("upcoming.open")}
            >
              <ExternalLink size={11} />
            </button>
          )}
          <button
            type="button"
            className="rounded p-1"
            style={{ color: "var(--text-muted)" }}
            onClick={stop}
            title={t("feed.stop_stream")}
            aria-label={t("feed.stop_stream")}
          >
            <X size={13} />
          </button>
        </div>
      </div>
      <div ref={hostRef} className="aspect-video w-full bg-black" />
    </div>
  );
}
