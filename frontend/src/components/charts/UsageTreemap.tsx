import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, Tooltip, Treemap } from "recharts";
import { ipc } from "../../lib/ipc";
import { queryKeys } from "../../lib/queryKeys";
import { canonicalSpeciesId, type PokemonType } from "../../lib/types";
import { PokemonSprite } from "../pokemon/PokemonSprite";
import type { UsageBarItem } from "./UsageBarChart";

interface Props {
  data: UsageBarItem[];
  height?: number;
  onItemClick?: (item: UsageBarItem) => void;
}

// Hex colors keyed by primary type. Tailwind utility classes don't survive into
// the Recharts SVG renderer, so map directly to the same VGC palette here.
const TYPE_HEX: Record<PokemonType, string> = {
  Normal: "#9aa0a6",
  Fire: "#f97316",
  Water: "#3b82f6",
  Electric: "#facc15",
  Grass: "#22c55e",
  Ice: "#67e8f9",
  Fighting: "#b91c1c",
  Poison: "#9333ea",
  Ground: "#a16207",
  Flying: "#38bdf8",
  Psychic: "#ec4899",
  Bug: "#65a30d",
  Rock: "#78716c",
  Ghost: "#4338ca",
  Dragon: "#6d28d9",
  Dark: "#1e293b",
  Steel: "#64748b",
  Fairy: "#f9a8d4",
  Stellar: "#a855f7",
};

interface TreemapEntry {
  name: string;
  size: number;
  color: string;
  rank: number;
  item: UsageBarItem;
}

// Recharts spreads each datum's fields onto the cell content's props AND
// also forwards the original datum under `payload`. We accept both shapes
// and read fields defensively. The synthetic root node (depth === 0) does
// NOT carry our data, so we must short-circuit it; otherwise accessing
// `props.item` or `props.payload.item` throws "cannot read properties of
// undefined" — which is exactly the v0.2.0 crash.
type CellProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  depth?: number;
  name?: string;
  color?: string;
  item?: UsageBarItem;
  payload?: TreemapEntry;
  onClick?: (item: UsageBarItem) => void;
};

function readEntry(props: CellProps): TreemapEntry | null {
  if (props.item && props.name && props.color) {
    return {
      name: props.name,
      size: 0,
      color: props.color,
      rank: props.payload?.rank ?? 0,
      item: props.item,
    };
  }
  if (props.payload && props.payload.item) {
    return props.payload;
  }
  return null;
}

function TreemapCell(props: CellProps) {
  const { x = 0, y = 0, width = 0, height = 0, depth, onClick } = props;
  // Skip the synthetic root and any cell without our data.
  if (depth === 0 || width <= 0 || height <= 0) return null;
  const entry = readEntry(props);
  if (!entry) return null;
  const usagePercent = entry.item?.usage_percent ?? 0;
  const showLabel = width > 54 && height > 24;
  const showSprite = width >= 96 && height >= 62 && Boolean(entry.item?.sprite_url);
  const maxChars = Math.max(6, Math.floor((width - 12) / 6.2));
  const label =
    entry.name.length > maxChars
      ? `${entry.name.slice(0, Math.max(1, maxChars - 1))}…`
      : entry.name;
  return (
    <g
      onClick={() => onClick?.(entry.item)}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <title>
        {entry.name} · {usagePercent.toFixed(2)}%
      </title>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={entry.color}
        fillOpacity={0.78}
        stroke="var(--bg-elev)"
        strokeWidth={1}
      />
      {showSprite && (
        <image
          href={entry.item.sprite_url}
          x={x + 5}
          y={y + 5}
          width={Math.min(32, height - 20)}
          height={Math.min(32, height - 20)}
          preserveAspectRatio="xMidYMid meet"
          style={{ pointerEvents: "none", imageRendering: "pixelated" }}
        />
      )}
      {showLabel && (
        <>
          <text
            x={x + (showSprite ? 42 : 6)}
            y={y + 16}
            fill="#ffffff"
            fontSize={11}
            fontWeight={600}
            style={{ pointerEvents: "none" }}
          >
            {label}
          </text>
          <text
            x={x + (showSprite ? 42 : 6)}
            y={showSprite ? y + 32 : y + height - 6}
            fill="#ffffffd0"
            fontSize={10}
            style={{ pointerEvents: "none" }}
          >
            {usagePercent.toFixed(1)}%
          </text>
        </>
      )}
    </g>
  );
}

interface TooltipPayload {
  payload?: TreemapEntry;
  name?: string;
}

function TooltipContent({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const datum = payload[0]?.payload;
  // Tooltip can also be invoked for the synthetic root — bail if our fields
  // aren't present.
  if (!datum || !datum.item) return null;
  return (
    <div
      className="flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs shadow-lg"
      style={{
        backgroundColor: "var(--bg-elev-strong)",
        borderColor: "var(--border)",
        color: "var(--text)",
      }}
    >
      <PokemonSprite
        url={datum.item.sprite_url ?? ""}
        fallbackUrl={datum.item.sprite_fallback_url}
        homeUrl={datum.item.home_sprite_url}
        name={datum.name}
        size={40}
        variant="pixel"
      />
      <div className="min-w-0">
        <div className="font-semibold">{datum.name}</div>
        <div style={{ color: "var(--accent)" }}>
          {(datum.item.usage_percent ?? 0).toFixed(2)}%
        </div>
        {datum.rank > 0 && (
          <div className="text-[10px]" style={{ color: "var(--text-dim)" }}>
            #{datum.rank}
          </div>
        )}
      </div>
    </div>
  );
}

export function UsageTreemap({ data, height = 400, onItemClick }: Props) {
  const { data: pokedex } = useQuery({
    queryKey: queryKeys.pokedex.all,
    queryFn: () => ipc.listPokemon(),
    staleTime: 60 * 60 * 1000,
  });

  const typeBySpecies = useMemo(() => {
    const map = new Map<string, PokemonType>();
    pokedex?.forEach((p) => {
      if (p.types.length > 0) map.set(canonicalSpeciesId(p.name), p.types[0]);
    });
    return map;
  }, [pokedex]);

  const treemapData: TreemapEntry[] = useMemo(() => {
    return data
      .filter((d) => d != null && typeof d.usage_percent === "number" && d.usage_percent > 0)
      .map((d, index) => {
        const ttype = typeBySpecies.get(canonicalSpeciesId(d.name)) ?? "Normal";
        return {
          name: d.name,
          size: Math.max(0.1, d.usage_percent),
          color: TYPE_HEX[ttype],
          rank: index + 1,
          item: d,
        };
      });
  }, [data, typeBySpecies]);

  if (treemapData.length === 0) return null;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={treemapData}
          dataKey="size"
          nameKey="name"
          stroke="var(--bg-elev)"
          isAnimationActive={false}
          content={<TreemapCell onClick={onItemClick} />}
        >
          <Tooltip content={<TooltipContent />} />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}
