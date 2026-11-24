import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ExternalLink, Loader2, X } from "lucide-react";
import type { LiveStreamScreen } from "../../lib/types";
import { useIsMobile } from "../../hooks/useIsMobile";
import { openExternal } from "../../lib/openExternal";
import { usePlaybackStore } from "../../stores/playbackStore";
import { useViewTabsStore } from "../../stores/viewTabsStore";
import { LiveFallbackImage } from "../ui/LiveFallbackImage";

interface PlaybackContextValue {
  /** Active view tab. Every tab owns its own playback session. */
  tabId: string;
  /** Most recently activated stream in the current tab (compatibility). */
  active: LiveStreamScreen | null;
  /** Every stream playing in the current tab. */
  activeScreens: LiveStreamScreen[];
  /** Streams the user explicitly stopped in the current tab. */
  stopped: string[];
  ready: boolean;
  activate: (screen: LiveStreamScreen) => void;
  stop: (screenUrl?: string, markStopped?: boolean) => void;
  /** Register the visible slot where a tab's player should be drawn. */
  registerTile: (
    tabId: string,
    screenUrl: string,
    node: HTMLDivElement | null,
  ) => void;
  isPlaying: (screenUrl: string) => boolean;
}

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

const FALLBACK_TAB = "default";
const LOAD_TIMEOUT_MS = 20_000;
const EMPTY_STOPPED: string[] = [];

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Player {
  key: string;
  tabId: string;
  screen: LiveStreamScreen;
  ready: boolean;
  failed: boolean;
  attempt: number;
}

interface Viewport {
  rect: Rect | null;
  onScreen: boolean;
}

function playerKey(tabId: string, screenUrl: string): string {
  return `${tabId}::${screenUrl}`;
}

/** YouTube embeds do not autoplay unless the parameter is present. */
function autoplayUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("autoplay", "1");
    parsed.searchParams.set("playsinline", "1");
    parsed.searchParams.set("enablejsapi", "1");
    return parsed.toString();
  } catch {
    return url;
  }
}

function sameRect(rect: Rect | null, next: DOMRect): boolean {
  return Boolean(
    rect &&
      Math.abs(rect.x - next.x) < 0.5 &&
      Math.abs(rect.y - next.y) < 0.5 &&
      Math.abs(rect.width - next.width) < 0.5 &&
      Math.abs(rect.height - next.height) < 0.5,
  );
}

/**
 * Owns the YouTube players for every open view tab.
 *
 * Each tab is an independent workspace: its own active streams, its own
 * stopped tiles and its own iframe. Switching tabs only hides the previous
 * tab's players; it never reuses or stops them. Closing a tab removes its
 * players. Shared data (teams, settings, live screens) still comes from the
 * normal stores; this provider only keeps transient playback state.
 *
 * One iframe is created per active stream and reused while that stream is
 * active. Nothing is mounted until the user presses play.
 */
export function PlaybackProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const continuity = usePlaybackStore((state) => state.continuity);
  const activeId = useViewTabsStore((state) => state.activeId);
  const views = useViewTabsStore((state) => state.views);
  const tabId = activeId ?? FALLBACK_TAB;
  const tabIdRef = useRef(tabId);
  const playersRef = useRef<Record<string, Player>>({});
  const tilesRef = useRef(new Map<string, HTMLDivElement>());
  const framesRef = useRef(new Map<string, HTMLIFrameElement>());
  const timersRef = useRef(new Map<string, number>());
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [viewports, setViewports] = useState<Record<string, Viewport>>({});
  const [tileVersion, setTileVersion] = useState(0);
  const [windowSize, setWindowSize] = useState(() => ({
    width: typeof window === "undefined" ? 1280 : window.innerWidth,
    height: typeof window === "undefined" ? 800 : window.innerHeight,
  }));
  const [stoppedByTab, setStoppedByTab] = useState<Record<string, string[]>>(
    {},
  );

  useEffect(() => {
    const onResize = () =>
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    tabIdRef.current = tabId;
  }, [tabId]);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  const clearTimer = useCallback((key: string) => {
    const timer = timersRef.current.get(key);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timersRef.current.delete(key);
    }
  }, []);

  const armTimer = useCallback(
    (key: string) => {
      clearTimer(key);
      const timer = window.setTimeout(() => {
        timersRef.current.delete(key);
        setPlayers((current) => {
          const player = current[key];
          if (!player || player.ready) return current;
          return { ...current, [key]: { ...player, failed: true } };
        });
      }, LOAD_TIMEOUT_MS);
      timersRef.current.set(key, timer);
    },
    [clearTimer],
  );

  useEffect(
    () => () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current.clear();
    },
    [],
  );

  const activate = useCallback(
    (screen: LiveStreamScreen) => {
      if (!screen.embed_url) return;
      const tab = tabIdRef.current;
      const key = playerKey(tab, screen.source_url);
      setStoppedByTab((current) => {
        const list = current[tab];
        if (!list?.includes(screen.source_url)) return current;
        return {
          ...current,
          [tab]: list.filter((url) => url !== screen.source_url),
        };
      });

      const existing = playersRef.current[key];
      if (existing && !existing.failed) {
        // Already playing or loading in this tab: keep the same iframe.
        if (existing.screen.embed_url !== screen.embed_url) {
          setPlayers((current) => ({
            ...current,
            [key]: {
              ...current[key],
              screen,
              ready: false,
              failed: false,
              attempt: current[key].attempt + 1,
            },
          }));
          armTimer(key);
        } else if (existing.screen !== screen) {
          setPlayers((current) =>
            current[key]
              ? { ...current, [key]: { ...current[key], screen } }
              : current,
          );
        }
        return;
      }

      setPlayers((current) => ({
        ...current,
        [key]: {
          key,
          tabId: tab,
          screen,
          ready: false,
          failed: false,
          attempt: (current[key]?.attempt ?? -1) + 1,
        },
      }));
      setViewports((current) => ({
        ...current,
        [key]: current[key] ?? { rect: null, onScreen: false },
      }));
      armTimer(key);
    },
    [armTimer],
  );

  const stop = useCallback(
    (screenUrl?: string, markStopped = true) => {
      const tab = tabIdRef.current;
      const removed = Object.values(playersRef.current).filter(
        (player) =>
          player.tabId === tab &&
          (!screenUrl || player.screen.source_url === screenUrl),
      );
      if (removed.length === 0) {
        if (!screenUrl) {
          setStoppedByTab((current) =>
            current[tab]?.length
              ? { ...current, [tab]: [] }
              : current,
          );
        }
        return;
      }
      setPlayers((current) => {
        const next = { ...current };
        for (const player of removed) {
          delete next[player.key];
          clearTimer(player.key);
        }
        return next;
      });
      setViewports((current) => {
        const next = { ...current };
        for (const player of removed) delete next[player.key];
        return next;
      });
      setStoppedByTab((current) => {
        const list = current[tab] ?? [];
        if (!screenUrl) return { ...current, [tab]: [] };
        if (!markStopped || list.includes(screenUrl)) return current;
        return { ...current, [tab]: [...list, screenUrl] };
      });
    },
    [clearTimer],
  );

  const registerTile = useCallback(
    (tab: string, screenUrl: string, node: HTMLDivElement | null) => {
      const key = playerKey(tab, screenUrl);
      if (node) {
        if (tilesRef.current.get(key) !== node) {
          tilesRef.current.set(key, node);
          setTileVersion((version) => version + 1);
        }
        return;
      }
      if (tilesRef.current.delete(key)) {
        setTileVersion((version) => version + 1);
      }
    },
    [],
  );

  const retry = useCallback(
    (key: string) => {
      setPlayers((current) => {
        const player = current[key];
        if (!player) return current;
        return {
          ...current,
          [key]: {
            ...player,
            ready: false,
            failed: false,
            attempt: player.attempt + 1,
          },
        };
      });
      armTimer(key);
    },
    [armTimer],
  );

  const handleLoad = useCallback(
    (key: string) => {
      clearTimer(key);
      setPlayers((current) => {
        const player = current[key];
        if (!player) return current;
        if (player.ready && !player.failed) return current;
        return {
          ...current,
          [key]: { ...player, ready: true, failed: false },
        };
      });
      // Nudge YouTube to start even when the browser delayed autoplay. The
      // iframe was created by a user click, so WebView2 accepts this.
      window.setTimeout(() => {
        framesRef.current.get(key)?.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "playVideo", args: [] }),
          "*",
        );
      }, 250);
    },
    [clearTimer],
  );

  const handleError = useCallback(
    (key: string) => {
      clearTimer(key);
      setPlayers((current) => {
        const player = current[key];
        if (!player) return current;
        return { ...current, [key]: { ...player, ready: false, failed: true } };
      });
    },
    [clearTimer],
  );

  // Closing a tab removes only that tab's players. Navigating a tab away from
  // the dashboard keeps the session when the mini player is enabled; with the
  // "stop" setting, that tab's players are cleared instead. Other tabs always
  // keep their own sessions.
  useEffect(() => {
    const valid = new Set(views.map((view) => view.id));
    const dashboard = new Set(
      views
        .filter((view) => view.path === "/dashboard")
        .map((view) => view.id),
    );
    const keep = (owner: string) =>
      valid.has(owner) && (continuity === "mini" || dashboard.has(owner));
    setPlayers((current) => {
      let changed = false;
      const next = { ...current };
      for (const [key, player] of Object.entries(current)) {
        if (!keep(player.tabId)) {
          delete next[key];
          clearTimer(key);
          changed = true;
        }
      }
      return changed ? next : current;
    });
    setViewports((current) => {
      let changed = false;
      const next = { ...current };
      for (const key of Object.keys(next)) {
        const owner = key.split("::")[0];
        if (!keep(owner)) {
          delete next[key];
          changed = true;
        }
      }
      return changed ? next : current;
    });
    setStoppedByTab((current) => {
      let changed = false;
      const next = { ...current };
      for (const tab of Object.keys(next)) {
        if (!keep(tab)) {
          delete next[tab];
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [clearTimer, continuity, views]);

  // One measurement loop for every player of the active tab. It only writes
  // when a rect actually changes, so scrolling does not re-render the panel
  // tree unnecessarily.
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const currentTab = tabIdRef.current;
      setViewports((current) => {
        let changed = false;
        const next = { ...current };
        for (const player of Object.values(playersRef.current)) {
          if (player.tabId !== currentTab) continue;
          const tile = tilesRef.current.get(player.key);
          if (!tile || !tile.isConnected) {
            const previous = next[player.key];
            if (previous?.rect || previous?.onScreen) {
              next[player.key] = { rect: null, onScreen: false };
              changed = true;
            }
            continue;
          }
          const rect = tile.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) {
            const previous = next[player.key];
            if (previous?.rect || previous?.onScreen) {
              next[player.key] = { rect: null, onScreen: false };
              changed = true;
            }
            continue;
          }
          const onScreen =
            rect.bottom > 0 &&
            rect.top < window.innerHeight &&
            rect.right > 0 &&
            rect.left < window.innerWidth;
          const previous = next[player.key];
          if (
            !previous ||
            !sameRect(previous.rect, rect) ||
            previous.onScreen !== onScreen
          ) {
            next[player.key] = {
              rect: {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
              },
              onScreen,
            };
            changed = true;
          }
        }
        return changed ? next : current;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  // With the "stop" setting, a player whose tile disappeared inside the same
  // tab (for example, switching from Novedades to Torneos) must stop too. The
  // short grace period covers the first paint after switching tabs while the
  // destination page registers its tile.
  useEffect(() => {
    if (continuity !== "stop") return;
    const missing = Object.values(players).filter(
      (player) =>
        player.tabId === tabId && !tilesRef.current.has(player.key),
    );
    if (missing.length === 0) return;
    const timer = window.setTimeout(() => {
      missing.forEach((player) => {
        if (!tilesRef.current.has(player.key)) {
          stop(player.screen.source_url, false);
        }
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [continuity, players, stop, tabId, tileVersion]);

  const activePlayers = useMemo(
    () => Object.values(players).filter((player) => player.tabId === tabId),
    [players, tabId],
  );
  const activeScreens = useMemo(
    () => activePlayers.map((player) => player.screen),
    [activePlayers],
  );
  const miniPlayers = useMemo(() => {
    if (continuity !== "mini") return [];
    return activePlayers.filter(
      (player) => !tilesRef.current.has(player.key),
    );
  }, [activePlayers, continuity, tileVersion]);
  const miniIndex = useMemo(
    () => new Map(miniPlayers.map((player, index) => [player.key, index])),
    [miniPlayers],
  );
  const miniWidth = Math.max(
    200,
    Math.min(352, windowSize.width - 96),
  );
  const miniVideoHeight = Math.round((miniWidth * 9) / 16);
  const miniHeaderHeight = 32;
  const miniHeight = miniHeaderHeight + miniVideoHeight;
  const miniRight = 72;
  const miniBottom = isMobile ? 96 : 16;
  const miniGap = 8;
  const active = activeScreens.at(-1) ?? null;
  const stopped = stoppedByTab[tabId] ?? EMPTY_STOPPED;
  const ready = activePlayers.at(-1)?.ready ?? false;
  const isPlaying = useCallback(
    (screenUrl: string) =>
      activePlayers.some((player) => player.screen.source_url === screenUrl),
    [activePlayers],
  );

  const value = useMemo<PlaybackContextValue>(
    () => ({
      tabId,
      active,
      activeScreens,
      stopped,
      ready,
      activate,
      stop,
      registerTile,
      isPlaying,
    }),
    [
      tabId,
      active,
      activeScreens,
      stopped,
      ready,
      activate,
      stop,
      registerTile,
      isPlaying,
    ],
  );

  return (
    <PlaybackContext.Provider value={value}>
      {children}
      {Object.values(players).map((player) => {
        const viewport = viewports[player.key];
        const currentTab = player.tabId === tabId;
        const miniSlot = miniIndex.get(player.key);
        const mini = miniSlot !== undefined;
        const tileVisible = Boolean(
          currentTab && !mini && viewport?.rect && viewport.onScreen,
        );
        const visible = mini || tileVisible;
        const slot = miniSlot ?? 0;
        const rect = mini
          ? {
              x: windowSize.width - miniRight - miniWidth,
              y:
                windowSize.height -
                miniBottom -
                (slot + 1) * miniHeight -
                slot * miniGap,
              width: miniWidth,
              height: miniHeight,
            }
          : (viewport?.rect ?? null);
        return (
          <div
            key={player.key}
            aria-hidden={!visible}
            data-mini={mini ? "true" : undefined}
            data-testid={`playback-viewport-${player.tabId}-${player.screen.source_url}`}
            style={{
              position: "fixed",
              left: visible && rect ? rect.x : -9999,
              top: visible && rect ? rect.y : -9999,
              width: rect?.width ?? 640,
              height: rect?.height ?? 360,
              zIndex: mini ? 39 : visible ? 25 : 0,
              opacity: visible ? 1 : 0,
              pointerEvents: visible ? "auto" : "none",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              borderRadius: mini ? 12 : 8,
              border: mini ? "1px solid var(--border)" : undefined,
              backgroundColor: mini ? "var(--bg-elev)" : "#000",
              boxShadow: mini ? "0 18px 45px -18px #000" : undefined,
            }}
          >
            <div
              className={
                mini
                  ? "flex h-8 shrink-0 items-center justify-between gap-2 px-2"
                  : "hidden"
              }
              style={{
                borderBottom: mini ? "1px solid var(--border)" : undefined,
              }}
            >
              <span
                className="truncate text-[10px] font-semibold"
                style={{ color: "var(--text)" }}
              >
                {player.screen.title ?? player.screen.label}
              </span>
              <div className="flex shrink-0 items-center gap-0.5">
                {player.screen.url && (
                  <button
                    type="button"
                    className="rounded p-1"
                    style={{ color: "var(--text-muted)" }}
                    onClick={() => void openExternal(player.screen.url!)}
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
                  onClick={() => stop(player.screen.source_url, true)}
                  title={t("feed.stop_stream")}
                  aria-label={t("feed.stop_stream")}
                >
                  <X size={13} />
                </button>
              </div>
            </div>
            <div
              className="relative min-h-0 w-full flex-1"
              style={{ backgroundColor: "#000" }}
            >
              <iframe
                key={`${player.key}-${player.attempt}`}
                ref={(node) => {
                  if (node) framesRef.current.set(player.key, node);
                  else framesRef.current.delete(player.key);
                }}
                src={autoplayUrl(player.screen.embed_url!)}
                title={player.screen.title ?? player.screen.label}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                onLoad={() => handleLoad(player.key)}
                onError={() => handleError(player.key)}
              />
              {currentTab && (!player.ready || player.failed) && (
                <div
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 overflow-hidden px-3 text-center"
                  aria-live="polite"
                >
                  <LiveFallbackImage
                    src={null}
                    alt={t("feed.stream_fallback")}
                    loading="eager"
                    className="absolute inset-0 opacity-45"
                  />
                  <div className="absolute inset-0 bg-black/45" />
                  <div className="relative z-10 flex flex-col items-center justify-center gap-2">
                    {player.failed ? (
                      <>
                        <AlertTriangle
                          size={30}
                          style={{ color: "var(--warning)" }}
                        />
                        <span
                          className="text-[11px] font-semibold"
                          style={{ color: "#fff" }}
                        >
                          {t("feed.stream_fallback")}
                        </span>
                        <button
                          type="button"
                          className="btn-ghost mt-1 h-7 text-[10px]"
                          onClick={() => retry(player.key)}
                        >
                          {t("common.retry")}
                        </button>
                      </>
                    ) : (
                      <>
                        <Loader2
                          size={46}
                          className="animate-spin"
                          style={{ color: "var(--accent)" }}
                        />
                        <span className="text-[10px]" style={{ color: "#fff" }}>
                          {t("feed.loading_video")}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </PlaybackContext.Provider>
  );
}

export function usePlayback(): PlaybackContextValue {
  const context = useContext(PlaybackContext);
  if (!context) {
    throw new Error("usePlayback must be used inside PlaybackProvider");
  }
  return context;
}

/** Placeholder that tells the provider where to draw the tab's player. */
export function PlaybackHost({ screen }: { screen: LiveStreamScreen }) {
  const { tabId, isPlaying, registerTile } = usePlayback();
  const registrationRef = useRef<{ tabId: string; url: string } | null>(null);
  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        registrationRef.current = { tabId, url: screen.source_url };
        registerTile(tabId, screen.source_url, node);
        return;
      }
      const previous = registrationRef.current;
      registrationRef.current = null;
      if (previous) {
        registerTile(previous.tabId, previous.url, null);
      }
    },
    [registerTile, screen.source_url, tabId],
  );
  if (!isPlaying(screen.source_url)) return null;
  return (
    <div
      ref={setRef}
      className="aspect-video w-full bg-black"
      data-testid={`playback-host-${screen.source_url}`}
    />
  );
}
