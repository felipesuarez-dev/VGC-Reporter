#!/usr/bin/env bun
/**
 * Build the GitHub release body from commit subjects.
 *
 * The release commit itself carries the version bump and, in this repo, often
 * the only description of the fix. The old workflow discarded every `[release]`
 * commit, which is why v0.4.1 and v0.4.2 shipped with the fallback
 * "- vX release" body. This script keeps the descriptive part of a release
 * subject and only drops empty/CI entries.
 */
import { spawnSync } from "node:child_process";

export function buildReleaseNotes(subjects: string[], tag: string): string {
  const changes: string[] = [];
  const fixes: string[] = [];

  for (const subject of subjects) {
    if (!subject.trim() || /^\[ci\]/i.test(subject)) continue;

    let text = subject;
    const release = text.match(
      /^\[release\]\s*(?:v?\d+\.\d+\.\d+(?:\.\d{8})?(?:-beta)?\s*[—–-]\s*)?(.*)$/i,
    );
    if (release) {
      text = release[1].trim();
      if (!text) continue;
    } else {
      text = text.replace(/^\[[^\]]+\]\s*/, "").trim();
    }
    if (!text) continue;
    text = text.charAt(0).toUpperCase() + text.slice(1);

    if (/\b(fix(es|ed)?|bug|hotfix|resolve[sd]?)\b/i.test(text)) {
      fixes.push(`- ${text}`);
    } else {
      changes.push(`- ${text}`);
    }
  }

  const parts: string[] = [];
  if (changes.length) parts.push(`## Changes\n\n${changes.join("\n")}`);
  if (fixes.length) parts.push(`## Fixes\n\n${fixes.join("\n")}`);
  return parts.join("\n\n") || `## Changes\n\n- ${tag} release`;
}

function arg(name: string): string | null {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] ?? null : null;
}

function git(args: string[]): string {
  const res = spawnSync("git", args, { encoding: "utf8" });
  if (res.status !== 0) {
    throw new Error(res.stderr || `git ${args.join(" ")} failed`);
  }
  return res.stdout;
}

if (import.meta.main) {
  const tag = arg("--tag");
  if (!tag) {
    console.error("Uso: bun scripts/release-notes.ts --tag <tag> [--prev <tag>]");
    process.exit(1);
  }
  let prev = arg("--prev");
  if (!prev) {
    const res = spawnSync("git", ["describe", "--tags", "--abbrev=0", `${tag}^`], {
      encoding: "utf8",
    });
    if (res.status === 0) prev = res.stdout.trim();
  }
  const range = prev ? `${prev}..${tag}` : tag;
  const subjects = git(["log", "--pretty=%s", range])
    .split(/\r?\n/)
    .filter(Boolean);
  process.stdout.write(buildReleaseNotes(subjects, tag));
}
