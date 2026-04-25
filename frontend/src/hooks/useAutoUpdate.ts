import { useEffect } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { useUpdaterStore } from "../stores/updaterStore";
import { APP_VERSION } from "../lib/version";
import {
  fetchLatestJson,
  isNewerVersion,
  pickAndroidUrl,
} from "../lib/manualUpdater";

export type CheckOutcome = "available" | "up_to_date" | "error";

function isMobileEnv(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 767px)").matches
  );
}

async function runMobileCheck(): Promise<CheckOutcome> {
  const store = useUpdaterStore.getState();
  const latest = await fetchLatestJson();
  store.recordCheck();
  const localShort = APP_VERSION.split(".").slice(0, 3).join(".");
  if (!isNewerVersion(latest.version, localShort)) {
    store.setAvailable(null);
    return "up_to_date";
  }
  store.setAvailable({
    version: latest.version,
    notes: latest.notes ?? null,
    downloadUrl: pickAndroidUrl(latest),
  });
  return "available";
}

async function runDesktopCheck(): Promise<CheckOutcome> {
  const store = useUpdaterStore.getState();
  const upd = await check();
  store.recordCheck();
  if (upd) {
    store.setAvailable({
      version: upd.version,
      notes: upd.body ?? null,
      downloadUrl: null,
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
    return isMobileEnv() ? await runMobileCheck() : await runDesktopCheck();
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
