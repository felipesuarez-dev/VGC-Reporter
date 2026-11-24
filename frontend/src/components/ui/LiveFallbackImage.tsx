import { useState } from "react";
import { cn } from "../../lib/cn";

/** Bundled TV test card used while a stream loads and when it fails. */
export const LIVE_FALLBACK_IMAGE = "/live-fallback.png";

interface Props {
  src?: string | null;
  alt?: string;
  className?: string;
  loading?: "eager" | "lazy";
}

/** Image with a guaranteed local fallback; never leaves a broken thumbnail. */
export function LiveFallbackImage({
  src,
  alt = "",
  className,
  loading = "lazy",
}: Props) {
  const [failed, setFailed] = useState(false);
  const resolved = !src || failed ? LIVE_FALLBACK_IMAGE : src;
  return (
    <img
      src={resolved}
      alt={alt}
      className={cn("h-full w-full object-cover", className)}
      loading={loading}
      draggable={false}
      onError={() => {
        if (!failed) setFailed(true);
      }}
    />
  );
}
