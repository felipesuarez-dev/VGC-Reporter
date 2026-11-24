/** The mobile dock is an app feature for the Android build, not a desktop
 * responsive fallback. */
export function isAndroidApp(): boolean {
  return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
}
