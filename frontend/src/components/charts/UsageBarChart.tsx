import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslation } from "react-i18next";

export interface UsageBarItem {
  name: string;
  usage_percent: number;
  count?: number;
  sprite_url?: string;
  id?: string;
}

interface Props {
  data: UsageBarItem[];
  height?: number;
  onBarClick?: (item: UsageBarItem) => void;
}

interface TooltipRenderProps {
  active?: boolean;
  payload?: { payload: UsageBarItem }[];
}

interface SpriteTickProps {
  x?: number;
  y?: number;
  payload?: { value: string };
  data: UsageBarItem[];
}

function SpriteTick({ x = 0, y = 0, payload, data }: SpriteTickProps) {
  const item = data.find((d) => d.name === payload?.value);
  const sprite = item?.sprite_url;
  return (
    <g transform={`translate(${x},${y})`}>
      {sprite && (
        <image
          href={sprite}
          x={-174}
          y={-16}
          width={32}
          height={32}
          style={{ imageRendering: "pixelated" }}
        />
      )}
      <text
        x={-136}
        y={0}
        dy={4}
        textAnchor="start"
        fill="#94a3b8"
        fontSize={12}
      >
        {payload?.value}
      </text>
    </g>
  );
}

export function UsageBarChart({ data, height = 320, onBarClick }: Props) {
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
            <img
              src={item.sprite_url}
              alt={item.name}
              width={48}
              height={48}
              data-sprite="true"
              className="shrink-0"
            />
          )}
          <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            {item.name}
          </div>
        </div>
        <div className="mt-2 space-y-0.5 text-xs">
          <div className="flex justify-between gap-4">
            <span style={{ color: "var(--text-muted)" }}>
              {t("dashboard.usage_percent_label")}
            </span>
            <span
              className="tabular-nums"
              style={{ color: "var(--accent)" }}
            >
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
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
      >
        <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
        <XAxis type="number" stroke="#64748b" fontSize={11} unit="%" />
        <YAxis
          dataKey="name"
          type="category"
          stroke="#94a3b8"
          width={180}
          fontSize={12}
          interval={0}
          tick={(props) => <SpriteTick {...props} data={data} />}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: "rgba(43, 134, 255, 0.08)" }}
        />
        <Bar
          dataKey="usage_percent"
          fill="#2b86ff"
          radius={[0, 4, 4, 0]}
          barSize={28}
          onClick={onBarClick ? (payload) => onBarClick(payload as UsageBarItem) : undefined}
          style={onBarClick ? { cursor: "pointer" } : undefined}
        >
          <LabelList
            dataKey="usage_percent"
            position="insideRight"
            formatter={(value: number) => `${value.toFixed(1)}%`}
            fill="#ffffff"
            fontSize={12}
            fontWeight={600}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
