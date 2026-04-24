import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useTranslation } from "react-i18next";
import { PokemonSprite } from "../pokemon/PokemonSprite";
import type { UsageBarItem } from "./UsageBarChart";

const PALETTE = [
  "#2b86ff",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#eab308",
  "#06b6d4",
  "#84cc16",
  "#a855f7",
  "#f43f5e",
  "#22d3ee",
];

interface Props {
  data: UsageBarItem[];
  height?: number;
  onSliceClick?: (item: UsageBarItem) => void;
}

interface TooltipRenderProps {
  active?: boolean;
  payload?: { payload: UsageBarItem }[];
}

export function UsageDonutChart({ data, height = 440, onSliceClick }: Props) {
  const { t } = useTranslation();

  const CustomTooltip = ({ active, payload }: TooltipRenderProps) => {
    if (!active || !payload || payload.length === 0) return null;
    const item = payload[0].payload;
    return (
      <div
        className="rounded-lg border p-3 shadow-xl"
        style={{
          backgroundColor: "var(--bg-elev)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex items-center gap-2">
          {item.sprite_url && (
            <PokemonSprite
              url={item.sprite_url}
              fallbackUrl={item.sprite_fallback_url}
              homeUrl={item.home_sprite_url}
              name={item.name}
              size={40}
              variant="pixel"
            />
          )}
          <div
            className="text-sm font-semibold"
            style={{ color: "var(--text)" }}
          >
            {item.name}
          </div>
        </div>
        <div className="mt-2 space-y-0.5 text-xs">
          <div className="flex justify-between gap-4">
            <span style={{ color: "var(--text-muted)" }}>
              {t("dashboard.usage_percent_label")}
            </span>
            <span className="tabular-nums" style={{ color: "var(--accent)" }}>
              {item.usage_percent.toFixed(1)}%
            </span>
          </div>
          {item.count != null && (
            <div className="flex justify-between gap-4">
              <span style={{ color: "var(--text-muted)" }}>
                {t("dashboard.count_label")}
              </span>
              <span className="tabular-nums" style={{ color: "var(--text)" }}>
                {item.count}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="usage_percent"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius="55%"
          outerRadius="85%"
          paddingAngle={1}
          onClick={
            onSliceClick
              ? (payload) => onSliceClick(payload as UsageBarItem)
              : undefined
          }
          style={onSliceClick ? { cursor: "pointer" } : undefined}
        >
          {data.map((_, idx) => (
            <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          verticalAlign="bottom"
          height={36}
          wrapperStyle={{ fontSize: 11 }}
          formatter={(value: string) => (
            <span style={{ color: "var(--text-muted)" }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
