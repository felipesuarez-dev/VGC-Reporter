import { useMemo, useState } from "react";
import { Package } from "lucide-react";
import { itemSpriteUrls } from "../../lib/itemSprites";
import { cn } from "../../lib/cn";

interface Props {
  name: string;
  size?: number;
  className?: string;
}

/**
 * Item sprite with source fallbacks (PokéAPI → Showdown → PokémonDB) and a
 * neutral placeholder when every mirror is missing the item. The attempt is
 * keyed by name so changing items resets the fallback chain without an effect.
 */
export function ItemSprite({ name, size = 32, className }: Props) {
  const urls = useMemo(() => itemSpriteUrls(name), [name]);
  const [attempt, setAttempt] = useState({ name, index: 0 });
  const index = attempt.name === name ? attempt.index : 0;

  if (urls.length === 0 || index >= urls.length) {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded",
          className,
        )}
        style={{
          width: size,
          height: size,
          backgroundColor: "var(--bg-elev-strong)",
          color: "var(--text-dim)",
        }}
        aria-hidden
      >
        <Package size={Math.max(12, Math.round(size * 0.55))} />
      </span>
    );
  }

  return (
    <img
      src={urls[index]}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      draggable={false}
      onError={() => setAttempt({ name, index: index + 1 })}
      className={cn("shrink-0 object-contain", className)}
      style={{ width: size, height: size, imageRendering: "pixelated" }}
      aria-hidden
    />
  );
}
