import {
  Bar,
  BarChart,
  CartesianGrid,
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

export function UsageBarChart({ data, height = 320, onBarClick }: Props) {
  const { t } = useTranslation();

  const CustomTooltip = ({ active, payload }: TooltipRenderProps) => {
    if (!active || !payload || payload.length === 0) return null;
    const item = payload[0].payload;
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/95 p-3 shadow-xl">
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
          <div className="text-sm font-semibold text-slate-100">{item.name}</div>
        </div>
        <div className="mt-2 space-y-0.5 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">
              {t("dashboard.usage_percent_label")}
            </span>
            <span className="tabular-nums text-brand-300">
              {item.usage_percent.toFixed(1)}%
            </span>
          </div>
          {item.count != null && (
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">
                {t("dashboard.count_label")}
              </span>
              <span className="tabular-nums text-slate-200">{item.count}</span>
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
          width={120}
          fontSize={11}
          interval={0}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: "rgba(43, 134, 255, 0.08)" }}
        />
        <Bar
          dataKey="usage_percent"
          fill="#2b86ff"
          radius={[0, 4, 4, 0]}
          onClick={onBarClick ? (payload) => onBarClick(payload as UsageBarItem) : undefined}
          style={onBarClick ? { cursor: "pointer" } : undefined}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
