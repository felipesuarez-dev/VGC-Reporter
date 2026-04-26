import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useUpdaterStore } from "../../stores/updaterStore";
import { APP_VERSION } from "../../lib/version";
import { useIsMobile } from "../../hooks/useIsMobile";

function isMacOS(): boolean {
  const p = typeof navigator !== "undefined" ? navigator.platform : "";
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  return /Mac|iPhone|iPad|iPod/i.test(p) || /Mac OS X/i.test(ua);
}

const RELEASES_PAGE_URL =
  "https://github.com/felipesuarez-dev/VGC-Reporter/releases/latest";

export function UpdaterModal() {
  const { t } = useTranslation();
  const available = useUpdaterStore((s) => s.available);
  const progress = useUpdaterStore((s) => s.progress);
  const dismissed = useUpdaterStore((s) => s.dismissed);
  const setProgress = useUpdaterStore((s) => s.setProgress);
  const dismiss = useUpdaterStore((s) => s.dismiss);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const isMobile = useIsMobile();

  if (!available || dismissed) return null;

  const installNow = async () => {
    setIsInstalling(true);
    setInstallError(null);
    try {
      const upd = await check();
      if (!upd) return;
      let downloaded = 0;
      let total = 0;
      await upd.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0;
          setProgress(0);
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          if (total > 0) {
            setProgress(Math.min(99, Math.round((downloaded / total) * 100)));
          }
        } else if (event.event === "Finished") {
          setProgress(100);
        }
      });
      await relaunch();
    } catch (e) {
      setInstallError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsInstalling(false);
    }
  };

  const downloadManual = async (target: string) => {
    try {
      await openUrl(target);
    } catch {
      window.open(target, "_blank");
    }
    dismiss();
  };

  const mac = isMacOS();

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
      onClick={dismiss}
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
          type="button"
          className="absolute right-3 top-3 rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elev-strong)] hover:text-[var(--text)]"
          onClick={dismiss}
          aria-label={t("updater.later")}
        >
          <X size={16} />
        </button>
        <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>
          {t("updater.available_title")}
        </h2>
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
          {t("updater.available_body", {
            version: available.version,
            current: APP_VERSION,
          })}
        </p>
        {available.notes && (
          <div
            className="mt-3 max-h-40 overflow-y-auto rounded border p-2 text-[11px] whitespace-pre-wrap"
            style={{
              borderColor: "var(--border)",
              color: "var(--text-muted)",
              backgroundColor: "var(--bg)",
            }}
          >
            {available.notes}
          </div>
        )}
        {progress !== null && (
          <div className="mt-3">
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              {t("updater.downloading", { pct: progress })}
            </div>
            <div
              className="mt-1 h-2 overflow-hidden rounded"
              style={{ backgroundColor: "var(--bg-elev-strong)" }}
            >
              <div
                className="h-full transition-[width]"
                style={{
                  width: `${progress}%`,
                  backgroundColor: "var(--accent)",
                }}
              />
            </div>
          </div>
        )}
        {installError && (
          <p className="mt-3 text-xs" style={{ color: "var(--danger)" }}>
            {installError}
          </p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="btn-ghost text-xs"
            onClick={dismiss}
            disabled={isInstalling}
          >
            {t("updater.later")}
          </button>
          {isMobile ? (
            <button
              type="button"
              className="btn-primary text-xs"
              onClick={() =>
                void downloadManual(available.downloadUrl ?? RELEASES_PAGE_URL)
              }
            >
              {t("updater.download_update")}
            </button>
          ) : mac ? (
            <button
              type="button"
              className="btn-primary text-xs"
              onClick={() => void downloadManual(RELEASES_PAGE_URL)}
            >
              {t("updater.download_manual")}
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary text-xs"
              onClick={installNow}
              disabled={isInstalling}
            >
              {isInstalling
                ? t("updater.downloading", { pct: progress ?? 0 })
                : t("updater.install_now")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
