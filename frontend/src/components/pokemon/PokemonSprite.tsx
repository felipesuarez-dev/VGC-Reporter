import { useState } from "react";
import { cn } from "../../lib/cn";

interface Props {
  url: string;
  fallbackUrl?: string | null;
  name?: string;
  size?: number;
  className?: string;
}

export function PokemonSprite({ url, fallbackUrl, name, size = 72, className }: Props) {
  const hasUrl = Boolean(url && url.length > 0);
  const [currentUrl, setCurrentUrl] = useState<string>(hasUrl ? url : "");
  const [fallbackTried, setFallbackTried] = useState(false);
  const [failed, setFailed] = useState(!hasUrl);

  if (failed) {
    return (
      <PlaceholderSprite
        size={size}
        name={name}
        className={className}
      />
    );
  }

  return (
    <img
      src={currentUrl}
      alt={name ?? "pokemon sprite"}
      width={size}
      height={size}
      data-sprite="true"
      loading="lazy"
      className={cn("select-none", className)}
      onError={() => {
        if (fallbackUrl && !fallbackTried) {
          setFallbackTried(true);
          setCurrentUrl(fallbackUrl);
        } else {
          setFailed(true);
        }
      }}
    />
  );
}

function PlaceholderSprite({
  size,
  name,
  className,
}: {
  size: number;
  name?: string;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 96 96"
      width={size}
      height={size}
      aria-label={name ?? "sprite placeholder"}
      role="img"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("select-none", className)}
      style={{ color: "var(--text-muted)" }}
    >
      <circle cx="48" cy="48" r="34" opacity="0.45" />
      <path d="M14 48h22" opacity="0.45" />
      <path d="M60 48h22" opacity="0.45" />
      <circle cx="48" cy="48" r="8" />
      <circle cx="48" cy="48" r="3" fill="currentColor" opacity="0.75" />
    </svg>
  );
}
