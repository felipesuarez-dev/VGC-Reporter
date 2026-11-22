import { describe, expect, it } from "bun:test";
import { buildReleaseNotes } from "./release-notes";

describe("buildReleaseNotes", () => {
  it("keeps the descriptive part of the release commit", () => {
    const body = buildReleaseNotes(
      ["[release] v0.4.2.20260921-beta — fix startup crash from migration 007"],
      "v0.4.2.20260921-beta",
    );
    expect(body).toContain("## Fixes");
    expect(body).toContain("Fix startup crash from migration 007");
    expect(body).not.toContain("v0.4.2.20260921-beta release");
  });

  it("classifies normal commits and skips ci", () => {
    const body = buildReleaseNotes(
      ["[backend] add dynamic catalog", "[ci] bump actions", "[frontend] fix slots"],
      "v0.5.0.20261121-beta",
    );
    expect(body).toContain("- Add dynamic catalog");
    expect(body).toContain("- Fix slots");
    expect(body).not.toContain("bump actions");
  });

  it("falls back only when there are no usable subjects", () => {
    const body = buildReleaseNotes([], "v0.5.0.20261121-beta");
    expect(body).toBe("## Changes\n\n- v0.5.0.20261121-beta release");
  });

  it("does not emit an empty Fixes section", () => {
    const body = buildReleaseNotes(["[backend] add x"], "v0.5.0");
    expect(body).not.toContain("## Fixes");
  });
});
