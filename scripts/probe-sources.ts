#!/usr/bin/env bun
/**
 * Check the identifiers in `domain/format.rs` against the live upstreams.
 *
 * Two of those identifiers were silently wrong for months and nobody noticed,
 * because each failure degraded into a fallback that still returned
 * *something*:
 *
 *   - `default_smogon_slug` returned `gen9vgc2026regmb`, but Smogon publishes
 *     the Champions ladders under a `gen9champions` prefix. Every request
 *     404'd, so that source never contributed a single number.
 *   - `default_labmaus_name` mapped M-B onto M-A's label as a workaround for
 *     labmaus not having published an M-B label yet. It has since published
 *     one and dropped M-A entirely, so the workaround outlived its reason.
 *
 * Run this before tagging a release. A red line here is a source that is
 * about to go quiet in production.
 */

// labmaus serves its certificate WITHOUT the Sectigo intermediate, and Bun
// (like rustls) does not AIA-fetch the missing link, so a plain fetch fails
// with "unable to verify the first certificate" — the same failure Regla 6 in
// CLAUDE.md documents. The app bundles that intermediate for reqwest; hand Bun
// the same file so this script sees what the app sees.
// (NODE_EXTRA_CA_CERTS is read at process start, so setting it here is too
// late — it has to go through the per-request `tls` option.)
const LABMAUS_CA = await Bun.file(
  new URL("../src-tauri/certs/sectigo-r36.pem", import.meta.url),
).text();

const LABMAUS = "https://labmaus.net";
const CHAMPTEAMS = "https://champteams.gg";
const SMOGON = "https://www.smogon.com/stats";

/** Mirrors Format::default_labmaus_name / default_smogon_slug. */
const EXPECTED = [
  { format: "M-C", labmaus: "Regulation Set M-C", smogon: "gen9championsvgc2026regmc" },
  { format: "M-B", labmaus: "Regulation Set M-B", smogon: "gen9championsvgc2026regmb" },
  { format: "M-A", labmaus: "Regulation Set M-A", smogon: "gen9championsvgc2026regma" },
];

let failures = 0;
const ok = (m: string) => console.log(`  ok    ${m}`);
const warn = (m: string) => console.log(`  warn  ${m}`);
const bad = (m: string) => {
  console.log(`  FAIL  ${m}`);
  failures++;
};

async function fetchJson(url: string, headers: Record<string, string> = {}, ca?: string) {
  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(45_000),
    ...(ca ? { tls: { ca } } : {}),
  } as RequestInit);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function probeLabmaus() {
  console.log("\nlabmaus — regulation labels");
  let rows: Array<{ regulation?: string }>;
  try {
    rows = (await fetchJson(
      `${LABMAUS}/api/completed_tournaments`,
      { Origin: LABMAUS, Referer: `${LABMAUS}/`, Accept: "application/json" },
      LABMAUS_CA,
    )) as Array<{ regulation?: string }>;
  } catch (e) {
    if (String(e).includes("certificate")) {
      bad(
        [
          `completed_tournaments TLS failure: ${e}`,
          "        labmaus omits its intermediate certificate. Check that",
          "        src-tauri/certs/sectigo-r36.pem still matches what the server",
          "        serves (Regla 6) — if it rotated, the app loses this source.",
        ].join("\n"),
      );
    } else {
      bad(`completed_tournaments unreachable: ${e}`);
    }
    return;
  }

  const counts = new Map<string, number>();
  for (const r of rows) {
    if (r.regulation) counts.set(r.regulation, (counts.get(r.regulation) ?? 0) + 1);
  }
  console.log(`  live labels: ${[...counts].map(([k, v]) => `${k} (${v})`).join(", ") || "none"}`);

  for (const { format, labmaus } of EXPECTED) {
    const seen = counts.get(labmaus) ?? 0;
    if (seen > 0) ok(`${format} -> "${labmaus}" (${seen} tournaments)`);
    else if (format === "M-A") warn(`${format} -> "${labmaus}" absent (expected: closed set)`);
    else bad(`${format} -> "${labmaus}" returns nothing; the label may have been renamed`);
  }
}

async function probeSmogon() {
  console.log("\nsmogon — chaos slugs");
  let index: string;
  try {
    index = await (await fetch(`${SMOGON}/`, { signal: AbortSignal.timeout(45_000) })).text();
  } catch (e) {
    bad(`stats index unreachable: ${e}`);
    return;
  }
  const months = [...index.matchAll(/20\d{2}-\d{2}/g)].map((m) => m[0]).sort();
  const latest = months.at(-1);
  if (!latest) {
    bad("no month directories found");
    return;
  }
  console.log(`  latest published month: ${latest}`);

  let listing: string;
  try {
    listing = await (
      await fetch(`${SMOGON}/${latest}/chaos/`, { signal: AbortSignal.timeout(45_000) })
    ).text();
  } catch (e) {
    bad(`chaos listing unreachable: ${e}`);
    return;
  }

  for (const { format, smogon } of EXPECTED) {
    if (listing.includes(smogon)) ok(`${format} -> ${smogon}`);
    // Smogon publishes a month in arrears, so a current regulation legitimately
    // has no file yet. That is not a broken identifier.
    else warn(`${format} -> ${smogon} not in ${latest} (normal until the month closes)`);
  }
  if (/gen9vgc2026reg/.test(listing)) {
    bad("a gen9vgc2026reg* slug exists upstream; the champions prefix may have changed");
  }
}

async function probeChampteams() {
  console.log("\nchampteams — declared regulation");
  let list: { formula?: string; snapshotDate?: string; dataRange?: Record<string, unknown> };
  try {
    list = (await fetchJson(`${CHAMPTEAMS}/api/tier-list`, {
      Accept: "application/json",
      "User-Agent": "VGC-Reporter/0.4 (+https://github.com/PumaSoft-dev/VGC-Reporter)",
    })) as typeof list;
  } catch (e) {
    warn(`tier-list unreachable (${e}); the merge drops it and carries on`);
    return;
  }
  const declared = list.formula?.match(/M-[A-Z](?![A-Za-z0-9])/)?.[0] ?? null;
  const range = list.dataRange ?? {};
  console.log(`  snapshot ${list.snapshotDate ?? "?"} · range ${range.earliest ?? "?"} → ${range.latest ?? "?"}`);
  console.log(`  ${range.tournamentCount ?? 0} tournaments, ${range.teamCount ?? 0} teams`);
  if (declared) ok(`declares ${declared} — the UI will label it as such`);
  else warn("declares no regulation; the merge treats it as out-of-period");
}

console.log("Probing the live data sources against the identifiers in format.rs");
await probeLabmaus();
await probeSmogon();
await probeChampteams();

if (failures > 0) {
  console.error(`\n${failures} identifier(s) look wrong. Fix format.rs before tagging.`);
  process.exit(1);
}
console.log("\nAll source identifiers resolve.");
