interface TopListItem {
  name: string;
  usage_percent: number;
}

interface Props {
  data: TopListItem[];
  limit?: number;
  emptyLabel?: string;
  labelFor?: (name: string) => string;
}

export function TopList({ data, limit = 10, emptyLabel = "—", labelFor }: Props) {
  const items = data.slice(0, limit);
  if (items.length === 0) {
    return <div className="text-xs text-slate-500">{emptyLabel}</div>;
  }
  const max = Math.max(...items.map((i) => i.usage_percent), 1);
  return (
    <ul className="space-y-1.5">
      {items.map((item) => {
        const width = Math.max((item.usage_percent / max) * 100, 2);
        const label = labelFor ? labelFor(item.name) : item.name;
        return (
          <li key={item.name} className="text-xs">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-slate-200">{label}</span>
              <span className="shrink-0 tabular-nums text-brand-300">
                {item.usage_percent.toFixed(1)}%
              </span>
            </div>
            <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-brand-500"
                style={{ width: `${width}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
