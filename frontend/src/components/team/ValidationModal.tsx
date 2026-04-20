import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, X } from "lucide-react";
import type { Violation } from "../../lib/types";
import { formatViolation } from "../../lib/labels";

interface Props {
  open: boolean;
  violations: Violation[];
  onClose: () => void;
}

export function ValidationModal({ open, violations, onClose }: Props) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-xl border p-5 shadow-2xl"
        style={{
          backgroundColor: "var(--bg-elev)",
          borderColor: "var(--border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute right-3 top-3 rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elev-strong)] hover:text-[var(--text)]"
          onClick={onClose}
          aria-label={t("pokemon_detail.close")}
        >
          <X size={16} />
        </button>

        <div className="mb-3 flex items-start gap-2">
          <AlertTriangle
            size={18}
            className="mt-0.5 shrink-0"
            style={{ color: "var(--accent)" }}
          />
          <div>
            <h2
              className="text-base font-semibold"
              style={{ color: "var(--text)" }}
            >
              {t("validation.modal_title")}
            </h2>
            <p
              className="mt-1 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              {t("validation.modal_body")}
            </p>
          </div>
        </div>

        {violations.length > 0 && (
          <ul
            className="mt-3 max-h-64 list-disc space-y-0.5 overflow-y-auto pl-5 text-xs"
            style={{ color: "var(--text)" }}
          >
            {violations.map((v, i) => (
              <li key={i}>{formatViolation(t, v)}</li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-primary" onClick={onClose}>
            {t("validation.modal_dismiss")}
          </button>
        </div>
      </div>
    </div>
  );
}
