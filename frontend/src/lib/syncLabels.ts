import type { TFunction } from "i18next";

const OVERRIDE_SOURCES: Record<string, string> = {
  labmaus_name: "Labmaus",
  limitless_code: "Limitless",
  smogon_slug: "Smogon",
};

export function regulationFromKey(key: string): string {
  const raw = key.split("::")[1] ?? "";
  const match = raw.match(/regulation-([a-z])-([a-z])/i);
  if (match) return `${match[1].toUpperCase()}-${match[2].toUpperCase()}`;
  return raw
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/**
 * Human labels for sync keys; never show raw `live_stream_urls`-style codes in
 * the sender/receiver lists. Unknown keys are still humanized as a fallback.
 */
export function settingDisplay(
  key: string,
  t: TFunction,
): { label: string; hint: string } {
  if (key.includes("::")) {
    const sourceKey = key.split("::")[0];
    return {
      label: t("settings.sync_setting_override", {
        source: OVERRIDE_SOURCES[sourceKey] ?? sourceKey,
        regulation: regulationFromKey(key),
      }),
      hint: t("settings.sync_setting_override_hint"),
    };
  }
  switch (key) {
    case "language":
      return {
        label: t("settings.sync_setting_language"),
        hint: t("settings.sync_setting_language_hint"),
      };
    case "timezone":
      return {
        label: t("settings.sync_setting_timezone"),
        hint: t("settings.sync_setting_timezone_hint"),
      };
    case "home_country":
      return {
        label: t("settings.sync_setting_country"),
        hint: t("settings.sync_setting_country_hint"),
      };
    case "live_stream_urls":
      return {
        label: t("settings.sync_setting_streams"),
        hint: t("settings.sync_setting_streams_hint"),
      };
    case "official_stream_url":
      return {
        label: t("settings.sync_setting_official_stream"),
        hint: t("settings.sync_setting_official_stream_hint"),
      };
    default:
      return {
        label: key
          .replace(/[_:]+/g, " ")
          .replace(/\b\w/g, (letter) => letter.toUpperCase()),
        hint: "",
      };
  }
}
