import { cn } from "../../lib/cn";

interface Props {
  url: string;
  name?: string;
  size?: number;
  className?: string;
}

export function PokemonSprite({ url, name, size = 72, className }: Props) {
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
        (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
      }}
    />
  );
}
