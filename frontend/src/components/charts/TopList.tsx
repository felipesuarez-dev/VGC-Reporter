import { EntityChip } from "../info/EntityChip";

interface TopListItem {
  name: string;
  usage_percent: number;
}

interface Props {
  data: TopListItem[];
  limit?: number;
  emptyLabel?: string;
  labelFor?: (name: string) => string;
  /**
   * When set, rows are rendered via `EntityChip` so hovering shows the rich
   * localized tooltip (name + TypeBadge + category icon + description). Takes
   * precedence over `labelFor`.
   */
  entityKind?: "item" | "move" | "ability";
}

export function TopList({
  data,
  limit = 10,
  emptyLabel = "—",
  labelFor,
  entityKind,
}: Props) {
  const items = data.slice(0, limit);
  if (items.length === 0) {
    return (
      <div className="text-xs" style={{ color: "var(--text-dim)" }}>
        {emptyLabel}
      </div>
    );
  }
  const max = Math.max(...items.map((i) => i.usage_percent), 1);
  return (
    <ul className="space-y-1.5">
      {items.map((item) => {
        const width = Math.max((item.usage_percent / max) * 100, 2);
        return (
          <li key={item.name} className="text-xs">
            <div className="flex items-baseline justify-between gap-2">
              {entityKind ? (
                <EntityChip kind={entityKind} name={item.name} className="truncate" />
              ) : (
                <span className="truncate" style={{ color: "var(--text)" }}>
                  {labelFor ? labelFor(item.name) : item.name}
                </span>
              )}
              <span
                className="shrink-0 tabular-nums"
                style={{ color: "var(--accent)" }}
              >
                {item.usage_percent.toFixed(1)}%
              </span>
            </div>
            <div
              className="mt-0.5 h-1 overflow-hidden rounded-full"
              style={{ backgroundColor: "var(--bg-elev-strong)" }}
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${width}%`, backgroundColor: "var(--accent)" }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
