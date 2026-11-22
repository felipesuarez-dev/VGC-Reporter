import { describe, expect, it } from "vitest";
import { shortVersion } from "./version";

describe("shortVersion", () => {
  it("keeps the semver and drops the date suffix", () => {
    expect(shortVersion("0.5.0.20261121-beta")).toBe("v0.5.0");
  });

  it("returns the input when there is no semver", () => {
    expect(shortVersion("dev")).toBe("dev");
  });
});
