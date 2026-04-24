import { useEffect } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { useUpdaterStore } from "../stores/updaterStore";

export type CheckOutcome = "available" | "up_to_date" | "error";

export async function runUpdateCheck(): Promise<CheckOutcome> {
  const store = useUpdaterStore.getState();
  store.setChecking(true);
  store.setError(null);
  try {
    const upd = await check();
    store.recordCheck();
    if (upd) {
      store.setAvailable({ version: upd.version, notes: upd.body ?? null });
      return "available";
    }
    store.setAvailable(null);
    return "up_to_date";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    store.setError(msg);
    return "error";
  } finally {
    store.setChecking(false);
  }
}

export function useAutoUpdate() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const outcome = await runUpdateCheck();
      if (cancelled) return;
      // nothing else; the store drives the UI.
      void outcome;
    })();
    return () => {
      cancelled = true;
    };
  }, []);
}
