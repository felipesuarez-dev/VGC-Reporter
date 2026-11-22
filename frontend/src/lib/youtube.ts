/**
 * YouTube does not allow an embedded player to subscribe or like on the
 * viewer's behalf (that needs Google OAuth). A channel URL with
 * `sub_confirmation=1` still gives a one-click subscribe confirmation in the
 * user's browser, which is the closest safe shortcut from the app.
 */
export function channelSubscribeUrl(sourceUrl: string): string | null {
  try {
    const url = new URL(sourceUrl);
    const host = url.hostname.replace(/^www\./, "");
    if (host !== "youtube.com" && host !== "m.youtube.com") return null;
    const handle = url.pathname.match(/^\/@([^/]+)/);
    if (handle) {
      return `https://www.youtube.com/@${handle[1]}?sub_confirmation=1`;
    }
    const channel = url.pathname.match(/^\/channel\/([^/]+)/);
    if (channel) {
      return `https://www.youtube.com/channel/${channel[1]}?sub_confirmation=1`;
    }
    return null;
  } catch {
    return null;
  }
}
