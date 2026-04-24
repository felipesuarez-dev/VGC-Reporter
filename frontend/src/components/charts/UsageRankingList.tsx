import { PokemonSprite } from "../pokemon/PokemonSprite";
import type { UsageBarItem } from "./UsageBarChart";

interface Props {
  data: UsageBarItem[];
  onItemClick?: (item: UsageBarItem) => void;
}

export function UsageRankingList({ data, onItemClick }: Props) {
  if (data.length === 0) return null;
  const maxPct = data.reduce(
    (m, d) => (d.usage_percent > m ? d.usage_percent : m),
    0,
  );
  return (
    <ul className="space-y-1.5">
      {data.map((item, idx) => {
        const widthPct = maxPct > 0 ? (item.usage_percent / maxPct) * 100 : 0;
        const content = (
          <div className="flex items-center gap-2">
            <span
              className="w-6 shrink-0 text-right text-xs font-semibold tabular-nums"
              style={{ color: "var(--text-dim)" }}
            >
              {idx + 1}.
            </span>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center">
              <PokemonSprite
                url={item.sprite_url ?? ""}
                fallbackUrl={item.sprite_fallback_url}
                homeUrl={item.home_sprite_url}
                name={item.name}
                size={32}
                variant="pixel"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div
                className="truncate text-sm font-medium"
                style={{ color: "var(--text)" }}
              >
                {item.name}
              </div>
              <div
                className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full"
                style={{ backgroundColor: "var(--bg-elev-strong)" }}
              >
                <div
                  className="h-full rounded-full transition-[width]"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: "var(--accent)",
                  }}
                />
              </div>
            </div>
            <div
              className="shrink-0 text-right text-sm font-semibold tabular-nums"
              style={{ color: "var(--accent)" }}
            >
              {item.usage_percent.toFixed(1)}%
            </div>
          </div>
        );
        return (
          <li key={item.id ?? item.name}>
            {onItemClick ? (
              <button
                type="button"
                onClick={() => onItemClick(item)}
                className="w-full rounded-md p-1.5 text-left transition hover:bg-[var(--bg-elev-strong)]"
              >
                {content}
              </button>
            ) : (
              <div className="p-1.5">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
