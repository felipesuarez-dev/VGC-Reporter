#!/usr/bin/env bun
/**
 * Falla si los ficheros de locale divergen en claves.
 *
 * `_meta.*` se ignora a proposito: es metadata de procedencia que solo llevan
 * los locales auto-traducidos (fr/it/pt), no una clave de UI.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = join(import.meta.dir, "..", "frontend", "src", "locales");
const IGNORED_PREFIX = "_meta.";

function flatten(obj: unknown, prefix = ""): Set<string> {
  const out = new Set<string>();
  if (typeof obj !== "object" || obj === null) return out;
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      for (const nested of flatten(v, key)) out.add(nested);
    } else {
      out.add(key);
    }
  }
  return out;
}

const files = readdirSync(DIR).filter((f) => f.endsWith(".json")).sort();
if (files.length === 0) {
  console.error("No se encontro ningun locale en", DIR);
  process.exit(1);
}

const keysByFile = new Map<string, Set<string>>();
for (const file of files) {
  const parsed = JSON.parse(readFileSync(join(DIR, file), "utf8"));
  const keys = new Set(
    [...flatten(parsed)].filter((k) => !k.startsWith(IGNORED_PREFIX)),
  );
  keysByFile.set(file, keys);
}

const union = new Set<string>();
for (const keys of keysByFile.values()) for (const k of keys) union.add(k);

let failed = false;
for (const [file, keys] of keysByFile) {
  const missing = [...union].filter((k) => !keys.has(k)).sort();
  const status = missing.length === 0 ? "ok" : `faltan ${missing.length}`;
  console.log(`${file.padEnd(10)} ${String(keys.size).padStart(4)} claves  ${status}`);
  if (missing.length > 0) {
    failed = true;
    for (const k of missing) console.log(`    - ${k}`);
  }
}

if (failed) {
  console.error("\nLos locales divergen. Anade las claves que faltan.");
  process.exit(1);
}
console.log("\nTodos los locales estan alineados.");
