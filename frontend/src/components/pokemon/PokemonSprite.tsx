import { useEffect, useState } from "react";
import { cn } from "../../lib/cn";

export type SpriteVariant = "pixel" | "hd" | "home";

interface Props {
  url: string;
  fallbackUrl?: string | null;
  homeUrl?: string | null;
  name?: string;
  size?: number;
  variant?: SpriteVariant;
  className?: string;
}

export function PokemonSprite({
  url,
  fallbackUrl,
  homeUrl,
  name,
  size = 72,
  variant = "pixel",
  className,
}: Props) {
  const chain = buildChain(url, fallbackUrl, homeUrl, variant);
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(chain.length === 0);

  useEffect(() => {
    setIdx(0);
    setFailed(chain.length === 0);
  }, [chain[0], chain[1], chain[2]]);

  if (failed) {
    return <PlaceholderSprite size={size} name={name} className={className} />;
  }

  const currentUrl = chain[idx];

  return (
    <span
      className={cn("sprite-frame", className)}
      style={{ width: size, height: size }}
    >
      <img
        src={currentUrl}
        alt={name ?? "pokemon sprite"}
        data-sprite="true"
        loading="lazy"
        className="select-none"
        onError={() => {
          if (idx + 1 < chain.length) {
            setIdx(idx + 1);
          } else {
            setFailed(true);
          }
        }}
      />
    </span>
  );
}

function buildChain(
  url: string,
  fallbackUrl: string | null | undefined,
  homeUrl: string | null | undefined,
  variant: SpriteVariant,
): string[] {
  const primary = url && url.length > 0 ? url : null;
  const hd = fallbackUrl && fallbackUrl.length > 0 ? fallbackUrl : null;
  const home = homeUrl && homeUrl.length > 0 ? homeUrl : null;

  const order =
    variant === "home"
      ? [home, hd, primary]
      : variant === "hd"
        ? [hd, primary, home]
        : [primary, hd, home];

  return order.filter((u): u is string => Boolean(u));
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
