import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, X } from "lucide-react";

interface Props {
  open: boolean;
  count: number;
  onConfirm: (dontAskAgain: boolean) => void;
  onCancel: () => void;
}

export function LoadAllTeamsConfirmModal({ open, count, onConfirm, onCancel }: Props) {
  const { t } = useTranslation();
  const [dontAsk, setDontAsk] = useState(false);

  useEffect(() => {
    if (open) setDontAsk(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-md rounded-xl border p-5 shadow-2xl"
        style={{
          backgroundColor: "var(--bg-elev)",
          borderColor: "var(--border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute right-3 top-3 rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elev-strong)] hover:text-[var(--text)]"
          onClick={onCancel}
          aria-label={t("top_teams.confirm_all_cancel")}
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
            <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
              {t("top_teams.confirm_all_title")}
            </h2>
            <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
              {t("top_teams.confirm_all_body", { count })}
            </p>
          </div>
        </div>

        <label className="mt-3 flex items-center gap-2 text-xs" style={{ color: "var(--text)" }}>
          <input
            type="checkbox"
            checked={dontAsk}
            onChange={(e) => setDontAsk(e.target.checked)}
          />
          {t("top_teams.confirm_all_dont_ask")}
        </label>

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onCancel}>
            {t("top_teams.confirm_all_cancel")}
          </button>
          <button type="button" className="btn-primary" onClick={() => onConfirm(dontAsk)}>
            {t("top_teams.confirm_all_proceed")}
          </button>
        </div>
      </div>
    </div>
  );
}
