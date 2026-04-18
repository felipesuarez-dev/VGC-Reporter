import { useTranslation } from "react-i18next";
import { Swords, Sparkles, Wrench } from "lucide-react";
import { useLocalize, type LocalizeKind } from "../../hooks/useTranslations";
import { useDescribe } from "../../hooks/useEntityDescriptions";
import { useMoveSummary } from "../../hooks/useMoveCatalog";
import type { MoveCategory } from "../../lib/types";
import { TypeBadge } from "../pokemon/TypeBadge";
import { Tooltip } from "../ui/Tooltip";
import { cn } from "../../lib/cn";

interface Props {
  kind: LocalizeKind;
  name: string | null | undefined;
  className?: string;
}

function CategoryIcon({ category }: { category: MoveCategory }) {
  const cls = "h-3 w-3";
  switch (category) {
    case "Physical":
      return <Swords className={cls} aria-hidden />;
    case "Special":
      return <Sparkles className={cls} aria-hidden />;
    case "Status":
      return <Wrench className={cls} aria-hidden />;
  }
}

export function EntityChip({ kind, name, className }: Props) {
  const { t } = useTranslation();
  const localize = useLocalize();
  const describe = useDescribe();
  const moveSummary = useMoveSummary();
  if (!name) return null;
  const label = localize(kind, name) || name;
  const kindLabel = t(`entity.${kind}`);
  const description = describe(kind, name);
  const summary = kind === "move" ? moveSummary(name) : null;

  const tooltip = (
    <div className="space-y-1">
      <div
        className="flex items-center gap-1.5 text-[11px] font-semibold"
        style={{ color: "var(--text)" }}
      >
        <span>{label}</span>
        {summary && <TypeBadge type={summary.type_} />}
        {summary && (
          <span
            className="inline-flex items-center gap-0.5 rounded-full border px-1 py-[1px] text-[9px] uppercase tracking-wide"
            style={{
              color: "var(--text-muted)",
              borderColor: "var(--border)",
            }}
            title={t(`tooltip.move_category.${summary.category.toLowerCase()}`)}
          >
            <CategoryIcon category={summary.category} />
            {t(`tooltip.move_category.${summary.category.toLowerCase()}`)}
          </span>
        )}
      </div>
      <div
        className="text-[10px] uppercase tracking-wide"
        style={{ color: "var(--text-dim)" }}
      >
        {kindLabel}
      </div>
      {description && (
        <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          {description}
        </div>
      )}
    </div>
  );

  return (
    <Tooltip content={tooltip}>
      <span
        className={cn(
          "cursor-help underline decoration-dotted decoration-[var(--text-dim)] underline-offset-2",
          className,
        )}
      >
        {label}
      </span>
    </Tooltip>
  );
}
