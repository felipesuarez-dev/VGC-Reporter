import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributeReferrerPolicy,
} from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LiveFallbackImage } from "./LiveFallbackImage";

interface Props {
  src: string;
  title: string;
  className?: string;
  style?: CSSProperties;
  referrerPolicy?: HTMLAttributeReferrerPolicy;
}

/**
 * A YouTube iframe is expensive: each one loads a full player. Mounting several
 * at once when Novedades opens made the route feel frozen. This wrapper waits
 * until the slot is near the viewport and then shows the bundled TV test card
 * with a large spinner until the player reports `load`. If the player never
 * loads (or errors), the same image becomes the fallback with a retry button.
 */
export function LazyVideoFrame({
  src,
  title,
  className,
  style,
  referrerPolicy = "strict-origin-when-cross-origin",
}: Props) {
  const { t } = useTranslation();
  const holderRef = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const node = holderRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setNearViewport(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  useEffect(() => {
    if (!nearViewport || loaded) return;
    const timer = window.setTimeout(() => setFailed(true), 20000);
    return () => window.clearTimeout(timer);
  }, [nearViewport, loaded, src, attempt]);

  const retry = () => {
    setFailed(false);
    setLoaded(false);
    setAttempt((value) => value + 1);
  };

  const showOverlay = !loaded || failed;

  return (
    <div
      ref={holderRef}
      className={`relative overflow-hidden bg-black ${className ?? ""}`}
      style={style}
    >
      {nearViewport && (
        <iframe
          key={`${src}-${attempt}`}
          src={src}
          title={title}
          className={`h-full w-full transition-opacity duration-200 ${
            loaded && !failed ? "opacity-100" : "opacity-0"
          }`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy={referrerPolicy}
          loading="lazy"
          onLoad={() => {
            setLoaded(true);
            setFailed(false);
          }}
          onError={() => setFailed(true)}
        />
      )}
      {showOverlay && (
        <>
          <LiveFallbackImage
            src={null}
            alt={t("feed.stream_fallback")}
            loading="eager"
            className="absolute inset-0 opacity-45"
          />
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/45 px-3 text-center"
            aria-live="polite"
          >
            {failed ? (
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
                  onClick={retry}
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
        </>
      )}
    </div>
  );
}
