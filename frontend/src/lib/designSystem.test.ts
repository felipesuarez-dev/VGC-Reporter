import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === "dist") return [];
      return walk(full);
    }
    return full.endsWith(".tsx") ? [full] : [];
  });
}

const sourceFiles = walk(resolve(process.cwd(), "src"));

describe("design system consistency", () => {
  it("does not use native radio inputs anywhere in the app", () => {
    const offenders = sourceFiles.filter((file) =>
      readFileSync(file, "utf8").includes('type="radio"'),
    );
    expect(
      offenders.map((file) => file.replace(process.cwd(), "")),
    ).toEqual([]);
  });

  it("keeps checkbox inputs inside the canonical FormControls", () => {
    const offenders = sourceFiles.filter((file) => {
      const normalized = file.replace(/\\/g, "/");
      if (normalized.endsWith("src/components/ui/FormControls.tsx")) return false;
      return readFileSync(file, "utf8").includes('type="checkbox"');
    });
    expect(
      offenders.map((file) => file.replace(process.cwd(), "")),
    ).toEqual([]);
  });
});
