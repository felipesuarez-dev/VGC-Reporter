import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Download, ExternalLink, X } from "lucide-react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { listen } from "@tauri-apps/api/event";
import { openExternal } from "../../lib/openExternal";
import { ipc } from "../../lib/ipc";
import { desktopPlatformMeta, shortSignature } from "../../lib/updater";
import type { AndroidUpdateProgress } from "../../lib/types";
import { useUpdaterStore } from "../../stores/updaterStore";
import { APP_VERSION } from "../../lib/version";

function isMacOS(): boolean {
  const p = typeof navigator !== "undefined" ? navigator.platform : "";
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  return /Mac|iPhone|iPad|iPod/i.test(p) || /Mac OS X/i.test(ua);
}

function isAndroid(): boolean {
  return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
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
  const [stage, setStage] = useState<"idle" | "downloading" | "installing">("idle");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [installError, setInstallError] = useState<string | null>(null);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [desktop, setDesktop] = useState<{
    version: string;
    currentVersion: string;
    url: string | null;
    signature: string | null;
  } | null>(null);

  if (!available || dismissed) return null;

  const android = isAndroid();
  const mac = isMacOS();
  const downloadUrl = android ? available.downloadUrl : available.desktopUrl;
  const signature = android
    ? available.signature
    : available.desktopSignature ?? desktop?.signature;
  const shownUrl = downloadUrl ?? desktop?.url ?? null;

  const mapInstallError = (error: unknown): string => {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("install_permission_required")) {
      return t("updater.android_permission_required");
    }
    if (message.includes("signature_mismatch")) {
      return t("updater.android_signature_mismatch");
    }
    if (message.includes("installer_unavailable")) {
      return t("updater.android_installer_unavailable");
    }
    if (message.includes("cancelled")) {
      return t("updater.cancel_done");
    }
    return message;
  };

  const installNow = async () => {
    setIsInstalling(true);
    setInstallError(null);
    try {
      const upd = await check();
      if (!upd) return;
      const platform = desktopPlatformMeta(upd.rawJson);
      setDesktop({
        version: upd.version,
        currentVersion: upd.currentVersion,
        url: platform.url,
        signature: platform.signature,
      });
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
      setInstallError(mapInstallError(e));
    } finally {
      setIsInstalling(false);
    }
  };

  const installAndroid = async () => {
    if (!downloadUrl) {
      void openExternal(RELEASES_PAGE_URL);
      return;
    }
    if (!available.size || !available.sha256) {
      setInstallError(t("updater.android_manifest_incomplete"));
      return;
    }
    const requestIdValue =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setIsInstalling(true);
    setStage("downloading");
    setRequestId(requestIdValue);
    setInstallError(null);
    setProgress(0);
    let unlisten: (() => void) | undefined;
    try {
      unlisten = await listen<AndroidUpdateProgress>(
        "android-update-progress",
        (event) => {
          if (event.payload.request_id !== requestIdValue) return;
          setProgress(event.payload.pct);
          if (event.payload.error) setInstallError(event.payload.error);
        },
      );
      const path = await ipc.downloadAndroidUpdate(
        requestIdValue,
        downloadUrl,
        available.size,
        available.sha256,
      );
      setStage("installing");
      await ipc.installAndroidUpdate(path);
      dismiss();
    } catch (e) {
      setInstallError(mapInstallError(e));
    } finally {
      unlisten?.();
      setRequestId(null);
      setStage("idle");
      setIsInstalling(false);
    }
  };

  const cancelAndroidDownload = async () => {
    if (!requestId) return;
    await ipc.cancelAndroidUpdate(requestId);
    setInstallError(t("updater.cancel_requested"));
  };

  const downloadManual = (target: string) => {
    void openExternal(target);
  };

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
        onClick={(event) => event.stopPropagation()}
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
            <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-muted)" }}>
              <span>
                {stage === "installing"
                  ? t("updater.installing")
                  : t("updater.downloading", { pct: progress })}
              </span>
              <span className="font-mono">{progress}%</span>
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
          <p className="mt-3 break-all text-xs" style={{ color: "var(--danger)" }}>
            {installError}
          </p>
        )}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="btn-ghost text-xs"
            onClick={dismiss}
            disabled={isInstalling}
          >
            {t("updater.later")}
          </button>
          {android && stage === "downloading" ? (
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => void cancelAndroidDownload()}
            >
              {t("updater.cancel_download")}
            </button>
          ) : android ? (
            <button
              type="button"
              className="btn-primary text-xs"
              onClick={() => void installAndroid()}
              disabled={isInstalling}
            >
              {isInstalling
                ? t("updater.downloading", { pct: progress ?? 0 })
                : t("updater.download_update")}
            </button>
          ) : mac ? (
            <button
              type="button"
              className="btn-primary text-xs"
              onClick={() => downloadManual(RELEASES_PAGE_URL)}
            >
              {t("updater.download_manual")}
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary text-xs"
              onClick={() => void installNow()}
              disabled={isInstalling}
            >
              {isInstalling
                ? t("updater.downloading", { pct: progress ?? 0 })
                : t("updater.install_now")}
            </button>
          )}
        </div>
        {android && (
          <button
            type="button"
            className="btn-ghost mt-2 w-full justify-center text-[11px]"
            onClick={() => openExternal(RELEASES_PAGE_URL)}
          >
            <ExternalLink size={12} className="mr-1" />
            {t("updater.open_github_secondary")}
          </button>
        )}
        <button
          type="button"
          className="mt-3 inline-flex items-center gap-1 text-[10px]"
          style={{ color: "var(--text-dim)" }}
          onClick={() => setDiagnosticsOpen((value) => !value)}
        >
          <ChevronDown
            size={12}
            style={{ transform: diagnosticsOpen ? "rotate(180deg)" : undefined }}
          />
          {t("updater.diagnostics")}
        </button>
        {diagnosticsOpen && (
          <dl
            className="mt-2 space-y-1 rounded-lg border p-2 font-mono text-[9px]"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--bg)",
              color: "var(--text-muted)",
            }}
          >
            <div className="flex justify-between gap-2">
              <dt>{t("updater.current_version")}</dt>
              <dd>{desktop?.currentVersion ?? APP_VERSION}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>{t("updater.remote_version")}</dt>
              <dd>{desktop?.version ?? available.version}</dd>
            </div>
            <div>
              <dt>{t("updater.download_url")}</dt>
              <dd className="break-all">{shownUrl ?? "—"}</dd>
            </div>
            <div>
              <dt>{t("updater.signature")}</dt>
              <dd className="break-all">{shortSignature(signature)}</dd>
            </div>
            {android && (
              <>
                <div className="flex justify-between gap-2">
                  <dt>{t("updater.size")}</dt>
                  <dd>{available.size ?? "—"}</dd>
                </div>
                <div>
                  <dt>{t("updater.sha256")}</dt>
                  <dd className="break-all">{available.sha256 ?? "—"}</dd>
                </div>
              </>
            )}
            {installError && (
              <div>
                <dt>{t("updater.exact_error")}</dt>
                <dd className="break-all" style={{ color: "var(--danger)" }}>
                  {installError}
                </dd>
              </div>
            )}
          </dl>
        )}
        {!android && (
          <button
            type="button"
            className="btn-ghost mt-2 w-full justify-center text-[11px]"
            onClick={() => downloadManual(shownUrl ?? RELEASES_PAGE_URL)}
          >
            <Download size={12} className="mr-1" />
            {t("updater.download_msi")}
          </button>
        )}
      </div>
    </div>
  );
}
