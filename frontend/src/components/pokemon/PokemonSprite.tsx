import { cn } from "../../lib/cn";

interface Props {
  url: string;
  fallbackUrl?: string | null;
  name?: string;
  size?: number;
  className?: string;
}

export function PokemonSprite({ url, fallbackUrl, name, size = 72, className }: Props) {
  return (
    <img
      src={url}
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
        } else {
          el.style.visibility = "hidden";
        }
      }}
    />
  );
}
