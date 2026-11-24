import { AlertTriangle, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useModalBack } from "../../hooks/useModalBack";

interface Props {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

/** Shared confirmation dialog for destructive actions. */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  danger = false,
}: Props) {
  const { t } = useTranslation();
  useModalBack(open, onCancel);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/65 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-xl border shadow-2xl"
        style={{
          backgroundColor: "var(--bg-elev)",
          borderColor: "var(--border)",
        }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-start gap-3 p-5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{
              backgroundColor: danger
                ? "color-mix(in srgb, var(--danger) 14%, transparent)"
                : "var(--accent-soft)",
              color: danger ? "var(--danger)" : "var(--accent)",
            }}
          >
            <AlertTriangle size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
              {title}
            </h2>
            <p
              className="mt-1 text-xs leading-relaxed"
              style={{ color: "var(--text-muted)" }}
            >
              {body}
            </p>
          </div>
          <button
            type="button"
            className="rounded p-1"
            style={{ color: "var(--text-muted)" }}
            onClick={onCancel}
            aria-label={t("common.close")}
          >
            <X size={16} />
          </button>
        </div>
        <div
          className="flex justify-end gap-2 border-t px-5 py-3"
          style={{ borderColor: "var(--border)" }}
        >
          <button type="button" className="btn-ghost text-xs" onClick={onCancel}>
            {cancelLabel ?? t("common.cancel")}
          </button>
          <button
            type="button"
            className={danger ? "btn-danger text-xs" : "btn-primary text-xs"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
