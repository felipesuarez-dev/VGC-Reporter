import { PokemonSprite } from "../pokemon/PokemonSprite";
import type { UsageBarItem } from "./UsageBarChart";

interface Props {
  data: UsageBarItem[];
  onItemClick?: (item: UsageBarItem) => void;
}

export function UsageGridView({ data, onItemClick }: Props) {
  if (data.length === 0) return null;
  return (
    <div className="grid grid-cols-5 gap-2">
      {data.map((item, idx) => {
        const inner = (
          <>
            <span
              className="text-[10px] font-semibold tabular-nums"
              style={{ color: "var(--text-dim)" }}
            >
              #{idx + 1}
            </span>
            <div className="flex h-12 w-12 items-center justify-center">
              <PokemonSprite
                url={item.sprite_url ?? ""}
                fallbackUrl={item.sprite_fallback_url}
                homeUrl={item.home_sprite_url}
                name={item.name}
                size={48}
                variant="pixel"
              />
            </div>
            <span
              className="w-full truncate text-center text-[11px] font-medium leading-tight"
              style={{ color: "var(--text)" }}
            >
              {item.name}
            </span>
            <span
              className="text-xs font-semibold tabular-nums"
              style={{ color: "var(--accent)" }}
            >
              {item.usage_percent.toFixed(1)}%
            </span>
          </>
        );
        return onItemClick ? (
          <button
            key={item.id ?? item.name}
            type="button"
            onClick={() => onItemClick(item)}
            className="flex flex-col items-center gap-1 rounded-lg p-2 transition hover:bg-[var(--bg-elev-strong)]"
          >
            {inner}
          </button>
        ) : (
          <div
            key={item.id ?? item.name}
            className="flex flex-col items-center gap-1 rounded-lg p-2"
          >
            {inner}
          </div>
        );
      })}
    </div>
  );
}
