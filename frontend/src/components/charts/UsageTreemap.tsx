import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, Tooltip, Treemap } from "recharts";
import { ipc } from "../../lib/ipc";
import { queryKeys } from "../../lib/queryKeys";
import { canonicalSpeciesId, type PokemonType } from "../../lib/types";
import {
  treemapLabelLayout,
  treemapTextColor,
} from "../../lib/treemap";
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
  const sprite =
    entry.item?.sprite_url ||
    entry.item?.sprite_fallback_url ||
    entry.item?.home_sprite_url ||
    "";
  const layout = treemapLabelLayout(width, height, Boolean(sprite));
  const textColor = treemapTextColor(entry.color);
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
        fillOpacity={0.82}
        stroke="var(--bg-elev)"
        strokeWidth={1}
      />
      {layout.showLabel && (
        <foreignObject
          x={x}
          y={y}
          width={width}
          height={height}
          style={{ pointerEvents: "none", overflow: "hidden" }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              boxSizing: "border-box",
              padding: width >= 90 ? "6px 7px" : "4px 5px",
              display: "flex",
              flexDirection: layout.showSprite ? "row" : "column",
              alignItems: layout.showSprite ? "flex-start" : "stretch",
              justifyContent: "space-between",
              gap: "4px",
              color: textColor,
              overflow: "hidden",
              textShadow:
                textColor === "#ffffff"
                  ? "0 1px 2px rgba(0,0,0,0.65)"
                  : "0 1px 1px rgba(255,255,255,0.35)",
            }}
          >
            {layout.showSprite && (
              <img
                src={sprite}
                alt=""
                draggable={false}
                style={{
                  width: Math.min(34, Math.max(20, height - 18)),
                  height: Math.min(34, Math.max(20, height - 18)),
                  objectFit: "contain",
                  imageRendering: "pixelated",
                  flexShrink: 0,
                }}
              />
            )}
            <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
              <div
                style={{
                  fontSize: width >= 100 ? 12 : 11,
                  fontWeight: 700,
                  lineHeight: 1.15,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {entry.name}
              </div>
              {layout.showPercent && (
                <div
                  style={{
                    marginTop: 1,
                    fontSize: 10,
                    fontWeight: 600,
                    opacity: 0.85,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {usagePercent.toFixed(1)}%
                </div>
              )}
            </div>
          </div>
        </foreignObject>
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
