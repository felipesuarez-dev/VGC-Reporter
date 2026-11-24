import { describe, expect, it } from "vitest";
import type { SyncBundle, Team } from "./types";
import { emptyTeamMember } from "./types";
import {
  filterSyncBundle,
  normalizeTeamName,
  prepareImport,
  syncTeamKey,
} from "./sync";

function team(id: number | null, name: string): Team {
  return {
    id,
    name,
    format: "regulation-m-c",
    build_mode: "champions",
    notes: null,
    members: [emptyTeamMember()],
    created_at: null,
    updated_at: null,
  };
}

const bundle: SyncBundle = {
  schema: 1,
  app_version: "0.6.0",
  exported_at: "2026-11-22T12:00:00Z",
  teams: [team(null, "Santiago Cup"), team(null, "Fresh Team")],
  settings: { language: "es" },
  ui_json: "{}",
};

const existing = [team(7, "santiago cup "), team(9, "Other")];

describe("sync conflict resolution", () => {
  it("normalizes names ignoring case and surrounding spaces", () => {
    expect(normalizeTeamName("  Santiago CUP ")).toBe("santiago cup");
  });

  it("renames conflicting teams and keeps both", () => {
    const prepared = prepareImport(bundle, existing, "rename");
    expect(prepared.conflicts).toBe(1);
    expect(prepared.deleteIds).toEqual([]);
    expect(prepared.bundle.teams).toHaveLength(2);
    expect(prepared.bundle.teams[0].name).toMatch(/^Santiago Cup · sync /);
    expect(prepared.bundle.teams[1].name).toBe("Fresh Team");
  });

  it("replaces the local team id and keeps the incoming name", () => {
    const prepared = prepareImport(bundle, existing, "replace");
    expect(prepared.deleteIds).toEqual([7]);
    expect(prepared.bundle.teams[0].name).toBe("Santiago Cup");
  });

  it("skips conflicting teams without deleting anything", () => {
    const prepared = prepareImport(bundle, existing, "skip");
    expect(prepared.deleteIds).toEqual([]);
    expect(prepared.bundle.teams.map((entry) => entry.name)).toEqual(["Fresh Team"]);
  });
});

describe("receiver-side bundle selection", () => {
  it("keeps only selected teams and settings", () => {
    const selectedKey = syncTeamKey(bundle.teams[0], 0);
    const filtered = filterSyncBundle(
      bundle,
      [selectedKey],
      ["language"],
      false,
    );
    expect(filtered.teams.map((entry) => entry.name)).toEqual(["Santiago Cup"]);
    expect(filtered.settings).toEqual({ language: "es" });
    expect(filtered.ui_json).toBe("{}");
  });

  it("can import only UI preferences", () => {
    const filtered = filterSyncBundle(bundle, [], [], true);
    expect(filtered.teams).toEqual([]);
    expect(filtered.settings).toEqual({});
    expect(filtered.ui_json).toBe(bundle.ui_json);
  });
});
