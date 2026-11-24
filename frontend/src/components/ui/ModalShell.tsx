import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useModalBack } from "../../hooks/useModalBack";
import { cn } from "../../lib/cn";

interface Props {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  icon?: ReactNode;
  maxWidth?: string;
  height?: string;
  className?: string;
  bodyClassName?: string;
  zIndex?: number;
}

/**
 * Shared modal frame: fixed header/footer, only the body scrolls, and the
 * scrollbar stays invisible until the user actually scrolls or hovers.
 */
export function ModalShell({
  open,
  title,
  onClose,
  children,
  footer,
  icon,
  maxWidth = "max-w-2xl",
  height = "max-h-[88vh]",
  className,
  bodyClassName,
  zIndex = 74,
}: Props) {
  const { t } = useTranslation();
  useModalBack(open, onClose);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, open]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/65 p-3 sm:p-4"
      style={{ zIndex }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn(
          "flex w-full flex-col overflow-hidden rounded-xl border shadow-2xl",
          maxWidth,
          height,
          className,
        )}
        style={{ backgroundColor: "var(--bg-elev)", borderColor: "var(--border)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <header
          className="flex items-center justify-between gap-3 border-b px-4 py-3"
          style={{ borderColor: "var(--border)" }}
        >
          <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
            {icon && (
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}
              >
                {icon}
              </span>
            )}
            <span className="min-w-0 truncate">{title}</span>
          </h2>
          <button
            type="button"
            className="rounded p-1 transition-colors hover:bg-[var(--bg-elev-strong)]"
            style={{ color: "var(--text-muted)" }}
            onClick={onClose}
            aria-label={t("common.close")}
          >
            <X size={16} />
          </button>
        </header>
        <div className={cn("modal-scroll min-h-0 flex-1 overflow-y-auto p-4", bodyClassName)}>
          {children}
        </div>
        {footer && (
          <footer
            className="flex flex-wrap justify-end gap-2 border-t px-4 py-3"
            style={{ borderColor: "var(--border)" }}
          >
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
