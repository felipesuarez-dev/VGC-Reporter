import { openUrl } from "@tauri-apps/plugin-opener";

/**
 * Open an external URL in the system browser. Tauri's opener handles desktop
 * and Android; `window.open` is only a browser-preview fallback.
 */
export async function openExternal(url: string) {
  try {
    await openUrl(url);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
