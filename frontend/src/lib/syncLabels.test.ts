import { describe, expect, it } from "vitest";
import type { TFunction } from "i18next";
import { regulationFromKey, settingDisplay } from "./syncLabels";

const t = ((key: string, params?: Record<string, unknown>) =>
  params && Object.keys(params).length > 0
    ? `${key}(${Object.entries(params)
        .map(([name, value]) => `${name}=${value}`)
        .join(",")})`
    : key) as TFunction;

describe("sync setting labels", () => {
  it("turns storage keys into human labels", () => {
    expect(settingDisplay("live_stream_urls", t).label).toBe(
      "settings.sync_setting_streams",
    );
    expect(settingDisplay("official_stream_url", t).label).toBe(
      "settings.sync_setting_official_stream",
    );
    expect(settingDisplay("home_country", t).label).toBe(
      "settings.sync_setting_country",
    );
  });

  it("labels regulation overrides with source and regulation, never raw keys", () => {
    const display = settingDisplay("labmaus_name::regulation-m-c", t);
    expect(display.label).toContain("Labmaus");
    expect(display.label).toContain("M-C");
    expect(display.label).not.toContain("::");
    expect(display.label).not.toContain("labmaus_name");
  });

  it("extracts readable regulation codes", () => {
    expect(regulationFromKey("smogon_slug::regulation-m-a")).toBe("M-A");
    expect(regulationFromKey("limitless_code::regulation-m-b")).toBe("M-B");
  });

  it("humanizes an unknown key instead of showing underscores", () => {
    expect(settingDisplay("some_future_setting", t).label).toBe(
      "Some Future Setting",
    );
  });
});
