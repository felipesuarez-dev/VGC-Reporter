import { useState } from "react";
import { useModalBack } from "../../hooks/useModalBack";
import {
  AlertTriangle,
  Check,
  ExternalLink,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { openUrl } from "@tauri-apps/plugin-opener";
import { APP_VERSION } from "../../lib/version";
import { useUpdaterStore } from "../../stores/updaterStore";
import { runUpdateCheck, type CheckOutcome } from "../../hooks/useAutoUpdate";

interface Props {
  open: boolean;
  onClose: () => void;
}

const REPO_URL = "https://github.com/felipesuarez-dev/VGC-Reporter";

export function AboutModal({ open, onClose }: Props) {
  const { t } = useTranslation();
  useModalBack(open, onClose);
  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
  const isChecking = useUpdaterStore((s) => s.isChecking);
  const lastCheckedAt = useUpdaterStore((s) => s.lastCheckedAt);
  const error = useUpdaterStore((s) => s.error);
  const available = useUpdaterStore((s) => s.available);
  const [lastOutcome, setLastOutcome] = useState<CheckOutcome | null>(null);

  if (!open) return null;

  const openRepo = async () => {
    try {
      await openUrl(REPO_URL);
    } catch {
      window.open(REPO_URL, "_blank");
    }
  };

  const handleCheck = async () => {
    const outcome = await runUpdateCheck();
    setLastOutcome(outcome);
  };

  const statusBlock = (() => {
    if (isChecking) {
      return (
        <span
          className="inline-flex items-center gap-1"
          style={{ color: "var(--text-muted)" }}
        >
          <Loader2 size={12} className="animate-spin" />
          {t("about.checking")}
        </span>
      );
    }
    if (error && lastOutcome === "error") {
      return (
        <span
          className="inline-flex items-center gap-1 break-all"
          style={{ color: "var(--danger)" }}
        >
          <AlertTriangle size={12} />
          <span className="font-mono text-[10px]">{error}</span>
        </span>
      );
    }
    if (available) {
      return (
        <span
          className="inline-flex items-center gap-1"
          style={{ color: "var(--accent)" }}
        >
          <RefreshCw size={12} />
          {t("about.update_available", { version: available.version })}
        </span>
      );
    }
    if (lastOutcome === "up_to_date") {
      return (
        <span
          className="inline-flex items-center gap-1"
          style={{ color: "var(--accent)" }}
        >
          <Check size={12} />
          {t("about.up_to_date")}
        </span>
      );
    }
    if (lastCheckedAt) {
      return (
        <span style={{ color: "var(--text-dim)" }}>
          {t("about.last_checked", {
            when: new Date(lastCheckedAt).toLocaleString(),
          })}
        </span>
      );
    }
    return (
      <span style={{ color: "var(--text-dim)" }}>{t("about.never_checked")}</span>
    );
  })();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("about.title")}</h2>
          <button
            className="btn-ghost p-1"
            onClick={onClose}
            aria-label={t("pokemon_detail.close")}
          >
            <X size={14} />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="PumaSoft"
            className="h-14 w-14 shrink-0 rounded-full"
          />
          <div className="min-w-0">
            <div className="text-base font-bold">{t("app.name")}</div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              {t("app.tagline")}
            </div>
          </div>
        </div>
        <dl className="mt-4 space-y-1 text-xs">
          <div className="flex justify-between">
            <dt style={{ color: "var(--text-muted)" }}>
              {t("app.version")}
            </dt>
            <dd>{APP_VERSION}</dd>
          </div>
          <div className="flex justify-between">
            <dt style={{ color: "var(--text-muted)" }}>{t("about.author")}</dt>
            <dd>PumaSoft</dd>
          </div>
          <div className="flex justify-between">
            <dt style={{ color: "var(--text-muted)" }}>{t("about.year")}</dt>
            <dd>2026</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
          {t("about.description")}
        </p>
        {!isMobile && (
          <div
            className="mt-4 rounded-md border p-3"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--text-muted)" }}
              >
                {t("about.updates")}
              </span>
              <button
                type="button"
                onClick={() => void handleCheck()}
                disabled={isChecking}
                className="btn-ghost flex items-center gap-1 text-xs"
              >
                {isChecking ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <RefreshCw size={12} />
                )}
                {t("about.check_for_updates")}
              </button>
            </div>
            <div className="mt-2 text-[11px]">{statusBlock}</div>
          </div>
        )}
        <button
          type="button"
          onClick={openRepo}
          className="btn-ghost mt-3 w-full justify-center text-xs"
        >
          <ExternalLink size={12} className="mr-1" />
          {t("about.view_repo")}
        </button>
      </div>
    </div>
  );
}
