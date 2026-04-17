import { useTranslation } from "react-i18next";
import { useLocalize, type LocalizeKind } from "../../hooks/useTranslations";
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
  if (!name) return null;
  const label = localize(kind, name) || name;
  const kindLabel = t(`entity.${kind}`);
  const tooltip =
    label === name ? kindLabel : `${kindLabel} · ${name}`;
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
