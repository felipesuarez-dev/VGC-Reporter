import { useEffect } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { useUpdaterStore } from "../stores/updaterStore";
import { ipc } from "../lib/ipc";
import { desktopPlatformMeta } from "../lib/updater";

export type CheckOutcome = "available" | "up_to_date" | "error";

function isAndroid(): boolean {
  return (
    typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent)
  );
}

async function runMobileCheck(): Promise<CheckOutcome> {
  const store = useUpdaterStore.getState();
  const info = await ipc.checkForAppUpdate();
  store.recordCheck();
  if (!info) {
    store.setAvailable(null);
    return "up_to_date";
  }
  store.setAvailable({
    version: info.version,
    notes: info.notes.length > 0 ? info.notes : null,
    downloadUrl: info.android_url,
    size: info.android_size,
    sha256: info.android_sha256,
    signature: info.android_signature,
    desktopUrl: info.desktop_url,
    desktopSignature: info.desktop_signature,
  });
  return "available";
}

async function runDesktopCheck(): Promise<CheckOutcome> {
  const store = useUpdaterStore.getState();
  const upd = await check();
  store.recordCheck();
  if (upd) {
    const platform = desktopPlatformMeta(upd.rawJson);
    store.setAvailable({
      version: upd.version,
      notes: upd.body ?? null,
      downloadUrl: null,
      signature: platform.signature,
      desktopUrl: platform.url,
      desktopSignature: platform.signature,
    });
    return "available";
  }
  store.setAvailable(null);
  return "up_to_date";
}

export async function runUpdateCheck(): Promise<CheckOutcome> {
  const store = useUpdaterStore.getState();
  store.setChecking(true);
  store.setError(null);
  try {
    return isAndroid() ? await runMobileCheck() : await runDesktopCheck();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    store.setError(msg);
    return "error";
  } finally {
    store.setChecking(false);
  }
}

export function useAutoUpdate(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      const outcome = await runUpdateCheck();
      if (cancelled) return;
      void outcome;
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);
}
