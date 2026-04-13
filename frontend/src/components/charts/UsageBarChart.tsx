import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Props {
  data: { name: string; usage_percent: number }[];
  height?: number;
}

export function UsageBarChart({ data, height = 320 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
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
          contentStyle={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(v: number) => `${v.toFixed(1)}%`}
        />
        <Bar dataKey="usage_percent" fill="#2b86ff" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
