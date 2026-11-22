import { useEffect, useRef, useState } from "react";
import { Loader2, Newspaper } from "lucide-react";
import { cn } from "../../lib/cn";

interface Props {
  src: string | null | undefined;
  className?: string;
}

/**
 * News banner with a skeleton + shimmer while the remote image loads. The
 * image fades/scales in when ready and falls back to a neutral news glyph if
 * the banner 404s, so the list never shows a broken-image icon.
 */
export function NewsThumbnail({ src, className }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  useEffect(() => {
    const image = imgRef.current;
    if (image?.complete && image.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [src]);

  const frame = cn(
    "relative h-14 w-24 shrink-0 overflow-hidden rounded-md border",
    className,
  );
  const border = { borderColor: "var(--border)" };

  if (!src || failed) {
    return (
      <div
        className={cn(frame, "flex items-center justify-center")}
        style={{
          ...border,
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--accent-soft) 65%, transparent), var(--bg-elev-strong))",
          color: "var(--accent)",
        }}
        aria-hidden
      >
        <Newspaper size={18} />
      </div>
    );
  }

  return (
    <div
      className={frame}
      style={{ ...border, backgroundColor: "var(--bg-elev-strong)" }}
    >
      {!loaded && (
        <div
          className="absolute inset-0 flex items-center justify-center overflow-hidden"
          style={{ backgroundColor: "var(--bg-elev-strong)" }}
          aria-hidden
        >
          <span
            className="news-shimmer absolute inset-y-0 left-0 w-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, color-mix(in srgb, var(--text) 12%, transparent), transparent)",
            }}
          />
          <Loader2
            size={14}
            className="relative animate-spin"
            style={{ color: "var(--text-dim)" }}
          />
        </div>
      )}
      <img
        ref={imgRef}
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={cn(
          "h-full w-full object-cover transition-all duration-300",
          loaded ? "scale-100 opacity-100" : "scale-105 opacity-0",
        )}
      />
    </div>
  );
}
