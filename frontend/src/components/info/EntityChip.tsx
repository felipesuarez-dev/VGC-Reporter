import { useTranslation } from "react-i18next";
import { useLocalize, type LocalizeKind } from "../../hooks/useTranslations";
import { useDescribe } from "../../hooks/useEntityDescriptions";
import { Tooltip } from "../ui/Tooltip";
import { cn } from "../../lib/cn";

interface Props {
  kind: LocalizeKind;
  name: string | null | undefined;
  className?: string;
}

export function EntityChip({ kind, name, className }: Props) {
  const { t } = useTranslation();
  const localize = useLocalize();
  const describe = useDescribe();
  if (!name) return null;
  const label = localize(kind, name) || name;
  const kindLabel = t(`entity.${kind}`);
  const description = describe(kind, name);

  const tooltip = (
    <div className="space-y-1">
      <div className="text-[11px] font-semibold" style={{ color: "var(--text)" }}>
        {label}
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
