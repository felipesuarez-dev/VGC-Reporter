#!/usr/bin/env bun
/**
 * Unica fuente de verdad para la version. Escribe (o verifica) los sitios que
 * hasta v0.3.1 se mantenian a mano, uno por uno.
 *
 *   bun scripts/bump-version.ts 0.4.0.20260920-beta   # escribe
 *   bun scripts/bump-version.ts --check               # verifica coherencia
 *
 * Dos formatos conviven: el semver corto (`0.4.0`) que exigen Cargo/tauri.conf/
 * package.json, y el largo con fecha (`0.4.0.20260920-beta`) que se muestra en
 * la UI y se usa como tag. `regenerate-latest-json.yml` deriva el semver del
 * TAG, asi que un desajuste entre tag y tauri.conf rompe el auto-updater.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const FULL_RE = /^(\d+)\.(\d+)\.(\d+)\.(\d{8})-beta$/;

const arg = process.argv[2];
const checkOnly = arg === "--check";

function readFull(): string {
  const src = readFileSync(join(ROOT, "frontend/src/lib/version.ts"), "utf8");
  const m = src.match(/APP_VERSION\s*=\s*"([^"]+)"/);
  if (!m) throw new Error("No se pudo leer APP_VERSION de version.ts");
  return m[1];
}

const full = checkOnly ? readFull() : arg;
if (!full || !FULL_RE.test(full)) {
  console.error(`Version invalida: ${full ?? "(ninguna)"}\nEsperado X.Y.Z.YYYYMMDD-beta`);
  process.exit(1);
}
const semver = full.split(".").slice(0, 3).join(".");

/** path -> [regex con 1 grupo de captura para el valor, valor esperado] */
const RULES: Array<[string, RegExp, string]> = [
  ["src-tauri/tauri.conf.json", /("version":\s*")([^"]+)(")/, semver],
  ["src-tauri/Cargo.toml", /(^version\s*=\s*")([^"]+)(")/m, semver],
  ["package.json", /("version":\s*")([^"]+)(")/, semver],
  ["frontend/package.json", /("version":\s*")([^"]+)(")/, semver],
  ["frontend/src/lib/version.ts", /(APP_VERSION\s*=\s*")([^"]+)(")/, full],
  ["CLAUDE.md", /(\*\*Versi[^:]*:\*\*\s*)([0-9][^\s]*)()/, full],
];

let failed = false;

for (const [rel, re, want] of RULES) {
  const path = join(ROOT, rel);
  const src = readFileSync(path, "utf8");
  const m = src.match(re);
  if (!m) {
    console.error(`  ${rel}: patron no encontrado`);
    failed = true;
    continue;
  }
  const got = m[2];
  if (checkOnly) {
    const ok = got === want;
    console.log(`  ${ok ? "ok  " : "MAL "} ${rel.padEnd(34)} ${got}${ok ? "" : `  (esperado ${want})`}`);
    if (!ok) failed = true;
  } else if (got !== want) {
    writeFileSync(path, src.replace(re, `$1${want}$3`));
    console.log(`  ${rel.padEnd(34)} ${got} -> ${want}`);
  } else {
    console.log(`  ${rel.padEnd(34)} ya en ${want}`);
  }
}

// README: badge + tabla de descarga. Varias ocurrencias, dos formatos.
{
  const rel = "README.md";
  const path = join(ROOT, rel);
  let src = readFileSync(path, "utf8");
  const before = src;
  const badgeWant = full.replace(/-/g, "--");

  const subs: Array<[RegExp, string]> = [
    // badge shields.io: los guiones van escapados
    [/(version-)(\d+\.\d+\.\d+\.\d{8}--beta)(-)/g, `$1${badgeWant}$3`],
    // tag completo en prosa y en el nombre del APK
    [/v\d+\.\d+\.\d+\.\d{8}-beta/g, `v${full}`],
    // semver en los nombres de fichero de los instaladores
    [/(VGC\.Reporter_)\d+\.\d+\.\d+(_)/g, `$1${semver}$2`],
    [/(vgc-reporter_)\d+\.\d+\.\d+(_)/g, `$1${semver}$2`],
  ];
  for (const [re, to] of subs) src = src.replace(re, to);

  if (checkOnly) {
    const stale = [...before.matchAll(/\d+\.\d+\.\d+\.\d{8}-{1,2}beta/g)]
      .map((m) => m[0])
      .filter((v) => v.replace(/--/g, "-") !== full);
    const ok = stale.length === 0 && before === src;
    console.log(`  ${ok ? "ok  " : "MAL "} ${rel.padEnd(34)} ${ok ? full : `desincronizado (${[...new Set(stale)].join(", ") || "semver en tabla"})`}`);
    if (!ok) failed = true;
  } else if (src !== before) {
    writeFileSync(path, src);
    console.log(`  ${rel.padEnd(34)} actualizado a ${full} / ${semver}`);
  } else {
    console.log(`  ${rel.padEnd(34)} ya en ${full}`);
  }
}

if (failed) {
  console.error(`\nVersiones desincronizadas. Corre: bun scripts/bump-version.ts ${full}`);
  process.exit(1);
}
console.log(`\n${checkOnly ? "Versiones coherentes" : "Version fijada"}: ${full} (semver ${semver})`);
