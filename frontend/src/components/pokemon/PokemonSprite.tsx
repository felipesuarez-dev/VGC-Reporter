import { cn } from "../../lib/cn";

const PLACEHOLDER_SRC = "/sprite-placeholder.svg";

interface Props {
  url: string;
  fallbackUrl?: string | null;
  name?: string;
  size?: number;
  className?: string;
}

export function PokemonSprite({ url, fallbackUrl, name, size = 72, className }: Props) {
  const initialSrc = url && url.length > 0 ? url : PLACEHOLDER_SRC;
  return (
    <img
      src={initialSrc}
      alt={name ?? "pokemon sprite"}
      width={size}
      height={size}
      data-sprite="true"
      loading="lazy"
      className={cn("select-none", className)}
      onError={(e) => {
        const el = e.currentTarget as HTMLImageElement;
        if (fallbackUrl && el.dataset.fallbackTried !== "1") {
          el.dataset.fallbackTried = "1";
          el.src = fallbackUrl;
        } else if (el.dataset.placeholderApplied !== "1") {
          el.dataset.placeholderApplied = "1";
          el.src = PLACEHOLDER_SRC;
        }
      }}
    />
  );
}
