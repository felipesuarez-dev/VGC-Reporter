import { AlertTriangle, RotateCw, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useUpdaterStore } from "../../stores/updaterStore";
import { runUpdateCheck } from "../../hooks/useAutoUpdate";

export function UpdaterErrorBanner() {
  const { t } = useTranslation();
  const error = useUpdaterStore((s) => s.error);
  const errorDismissed = useUpdaterStore((s) => s.errorDismissed);
  const isChecking = useUpdaterStore((s) => s.isChecking);
  const dismissError = useUpdaterStore((s) => s.dismissError);

  if (!error || errorDismissed) return null;

  return (
    <div
      role="alert"
      className="flex shrink-0 items-start gap-2 border-b px-3 py-1.5 text-[11px]"
      style={{
        backgroundColor: "color-mix(in srgb, var(--danger) 12%, var(--bg-elev))",
        borderColor: "var(--border)",
        color: "var(--text)",
      }}
    >
      <AlertTriangle
        size={14}
        className="mt-0.5 shrink-0"
        style={{ color: "var(--danger)" }}
      />
      <div className="min-w-0 flex-1">
        <div className="font-semibold" style={{ color: "var(--danger)" }}>
          {t("updater.check_failed")}
        </div>
        <div
          className="break-all font-mono text-[10px]"
          style={{ color: "var(--text-muted)" }}
        >
          {error}
        </div>
      </div>
      <button
        type="button"
        onClick={() => void runUpdateCheck()}
        disabled={isChecking}
        className="flex shrink-0 items-center gap-1 rounded px-2 py-0.5 text-[10px] hover:bg-[var(--bg-elev-strong)] disabled:opacity-50"
        style={{ color: "var(--text)" }}
        title={t("common.retry")}
      >
        <RotateCw size={11} className={isChecking ? "animate-spin" : ""} />
        {t("common.retry")}
      </button>
      <button
        type="button"
        onClick={dismissError}
        className="shrink-0 rounded p-0.5 hover:bg-[var(--bg-elev-strong)]"
        style={{ color: "var(--text-muted)" }}
        aria-label={t("updater.later")}
      >
        <X size={12} />
      </button>
    </div>
  );
}
