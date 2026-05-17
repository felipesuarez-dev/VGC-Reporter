import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, Tooltip, Treemap } from "recharts";
import { ipc } from "../../lib/ipc";
import { queryKeys } from "../../lib/queryKeys";
import { canonicalSpeciesId, type PokemonType } from "../../lib/types";
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

interface CellDatum {
  name: string;
  size: number;
  color: string;
  payload: UsageBarItem;
}

type CellProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: CellDatum;
  onClick?: (item: UsageBarItem) => void;
};

function TreemapCell(props: CellProps) {
  const { x = 0, y = 0, width = 0, height = 0, payload, onClick } = props;
  if (!payload || width <= 0 || height <= 0) return null;
  const showLabel = width > 60 && height > 28;
  return (
    <g
      onClick={() => onClick?.(payload.payload)}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={payload.color}
        fillOpacity={0.78}
        stroke="var(--bg-elev)"
        strokeWidth={1}
      />
      {showLabel && (
        <>
          <text
            x={x + 6}
            y={y + 16}
            fill="#ffffff"
            fontSize={11}
            fontWeight={600}
            style={{ pointerEvents: "none" }}
          >
            {payload.name.length > 18
              ? payload.name.slice(0, 17) + "…"
              : payload.name}
          </text>
          <text
            x={x + 6}
            y={y + height - 6}
            fill="#ffffffd0"
            fontSize={10}
            style={{ pointerEvents: "none" }}
          >
            {payload.payload.usage_percent.toFixed(1)}%
          </text>
        </>
      )}
    </g>
  );
}

interface TooltipPayload {
  payload?: CellDatum;
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
  if (!datum) return null;
  return (
    <div
      className="rounded-md border px-2 py-1 text-xs shadow-md"
      style={{
        backgroundColor: "var(--bg-elev-strong)",
        borderColor: "var(--border)",
        color: "var(--text)",
      }}
    >
      <div className="font-semibold">{datum.name}</div>
      <div style={{ color: "var(--text-muted)" }}>
        {datum.payload.usage_percent.toFixed(2)}%
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

  const treemapData: CellDatum[] = useMemo(() => {
    return data
      .filter((d) => d.usage_percent > 0)
      .map((d) => {
        const ttype = typeBySpecies.get(canonicalSpeciesId(d.name)) ?? "Normal";
        return {
          name: d.name,
          size: Math.max(0.1, d.usage_percent),
          color: TYPE_HEX[ttype],
          payload: d,
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
