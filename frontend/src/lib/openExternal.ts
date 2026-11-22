import { openUrl } from "@tauri-apps/plugin-opener";
import {
  useExternalLinkStore,
  type ExternalLinkKind,
} from "../stores/externalLinkStore";

/**
 * Ask for confirmation before handing a URL to the operating system. The
 * dialog is rendered once in AppShell; this helper only queues the request.
 * Callers that don't await still get the confirmation because the dialog owns
 * the actual open action.
 */
export function openExternal(
  url: string,
  kind: ExternalLinkKind = "url",
): Promise<boolean> {
  if (!url) return Promise.resolve(false);
  return new Promise<boolean>((resolve) => {
    useExternalLinkStore.getState().request({ url, kind, resolve });
  });
}

/**
 * Executes the confirmed open. Kept separate from `openExternal` so the
 * dialog can await it and report a fallback failure. Tauri's opener handles
 * desktop and Android; `window.open` is only a browser-preview fallback.
 */
export async function performExternalOpen(url: string): Promise<boolean> {
  try {
    await openUrl(url);
    return true;
  } catch {
    try {
      window.open(url, "_blank", "noopener,noreferrer");
      return true;
    } catch {
      return false;
    }
  }
}
