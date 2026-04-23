import { useEffect } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { useUpdaterStore } from "../stores/updaterStore";

export function useAutoUpdate() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const upd = await check();
        if (cancelled) return;
        if (upd) {
          useUpdaterStore.getState().setAvailable({
            version: upd.version,
            notes: upd.body ?? null,
          });
        }
      } catch (e) {
        if (cancelled) return;
        useUpdaterStore
          .getState()
          .setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
}
