<div align="center">

<img src="assets/logo.png" alt="VGC Reporter" width="180" />

# VGC Reporter

**Pokémon Champions competitive stats & team builder, as a native app for desktop and Android.**  

**Public beta — first release! Built with pure, hardcore vibe-code. Expect rough edges; please report any issue you hit so we can iterate fast.**

[![Version][version-badge]][version-link]
[![Beta][beta-badge]](#download)
[![Tauri][tauri-badge]][tauri-link]
[![Rust][rust-badge]][rust-link]
[![React][react-badge]][react-link]
[![License][license-badge]](LICENSE)
[![PumaSoft][pumasoft-badge]][pumasoft-link]

[Español](README.md) · [Download](#download) · [Screenshots](#screenshots) · [Quick Start](#quick-start) · [Features](#features) · [Known Issues](#known-issues-beta) · [Data Sources](#data-sources) · [Architecture](#architecture) · [Development](#development)

</div>

---

## Problem

Pokémon Champions launched on 8-Apr-2026 and instantly became the official VGC 2026 / Worlds platform. Usage data is scattered across Pikalytics, Pokemon-Zone, Porygon Labs, Champions Lab, Smogon chaos JSON and Limitless VGC standings. None of these sites share a unified API, and there is no offline-friendly way to browse the meta **and** build a team in the same place.

VGC Reporter is the tool I wanted while team-building for Pokémon Champions: one window, real tournament data, a live regulation calendar, drill-down by Pokémon, and everything cached locally.

## Solution

- **Real tournament data, not just ladder** — aggregates Limitless VGC standings into usage stats, with Smogon chaos as fallback when the format is too fresh. Recent Champions tournaments are listed with full decklists rendered inline.
- **Dynamic regulation calendar** — the app discovers the active Champions regulation and season from the official Pokémon HOME notices, validates the eligible roster, and cross-checks live tournament sources. If TPC moves a date, the app follows the published date; if the notice is late, a source with real decklists can activate the set.
- **The live scene in one place** — a draggable **Novedades** board with the official VGC stream, official news previews, upcoming local tournaments and source status. Every panel collapses and can be grouped or separated, and the layout is remembered.
- **Regulation workspace** — eligible Pokémon and items with usage percentages, sprites, localized descriptions, detail modals and usage/alphabetical sorting, not just a plain allow-list.
- **Offline-friendly by design** — SQLite-backed HTTP cache, all network I/O on the Rust side, zero CORS pain.

## Screenshots

<table>
  <tr>
    <td align="center">
      <img src="assets/screen-dashboard.png" alt="Dashboard" width="420" /><br/>
      <sub><b>Dashboard</b> — meta snapshot, top usage, recent tournaments</sub>
    </td>
    <td align="center">
      <img src="assets/screen-pokedex.png" alt="Pokédex" width="420" /><br/>
      <sub><b>Pokédex</b> — competitive sets, usage and type matchups</sub>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="assets/screen-builder.png" alt="Team Builder" width="420" /><br/>
      <sub><b>Team Builder</b> — regulation-aware pickers and EV sliders</sub>
    </td>
    <td align="center">
      <img src="assets/screen-myteams.png" alt="My Teams" width="420" /><br/>
      <sub><b>My Teams</b> — local team library (rename / duplicate / delete)</sub>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="assets/screen-topteams.png" alt="Top Teams" width="420" /><br/>
      <sub><b>Top Teams</b> — real tournament-winning teams, with filters and Markdown export</sub>
    </td>
    <td align="center">
      <img src="assets/screen-damagecalc.png" alt="Damage Calc" width="420" /><br/>
      <sub><b>Damage Calc</b> — <code>@smogon/calc</code> Gen 9 with searchable inputs</sub>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="assets/screen-feed.png" alt="Novedades feed" width="420" /><br/>
      <sub><b>Novedades</b> — multi-screen VGC live wall, official news and local upcoming events</sub>
    </td>
    <td align="center">
      <img src="assets/screen-regulation.png" alt="Regulation and allowed items" width="420" /><br/>
      <sub><b>Regulación</b> — eligible roster plus searchable items with usage and their top Pokémon</sub>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="assets/screen-event.png" alt="Tournament detail with map" width="420" /><br/>
      <sub><b>Event detail</b> — price badge, organizer/contact, category, premier event, map and .ics export; official data is read inside the app</sub>
    </td>
    <td align="center">
      <img src="assets/screen-calendar.png" alt="Tournament calendar" width="420" /><br/>
      <sub><b>Tournament calendar</b> — addresses per day, text/country/city search, personal events and .ics export</sub>
    </td>
  </tr>
  <tr>
    <td align="center" colspan="2">
      <img src="assets/screen-live-wall.png" alt="Full-screen TV wall of VGC live streams" width="840" /><br/>
      <sub><b>Vitrina TV</b> — full-screen mosaic of the official broadcast and community screens (YukS VGC by default)</sub>
    </td>
  </tr>
  <tr>
    <td align="center" colspan="2">
      <img src="assets/screen-feed-layout.png" alt="Feed panels grouped in one row" width="840" /><br/>
      <sub><b>Dynamic Feed</b> — group tournaments and news in one row, keep every panel separate, or collapse what you don't need</sub>
    </td>
  </tr>
  <tr>
    <td align="center" colspan="2">
      <img src="assets/screen-news.png" alt="Official news preview modal" width="840" /><br/>
      <sub><b>Official news</b> — read the source inside the app, with "Open in browser" always available</sub>
    </td>
  </tr>
  <tr>
    <td align="center" colspan="2">
      <img src="assets/screen-settings.png" alt="Settings and dynamic regulations" width="840" /><br/>
      <sub><b>Settings</b> — searchable timezone/country, live screens (up to 12), active regulation and source overrides</sub>
    </td>
  </tr>
</table>

## Download

Pre-built installers for the **`v0.6.0.20261122-beta`** release:

| Platform | Installer | Notes |
|---|---|---|
| Windows 10/11 | `VGC.Reporter_0.6.0_x64_en-US.msi` | MSI installer — unsigned; SmartScreen → More info → Run anyway |
| Android 7+ (arm64) | `VGC.Reporter_v0.6.0.20261122-beta_android.apk` | Sideload: enable "Unknown sources" first |

**[→ Download from the latest GitHub Release](https://github.com/felipesuarez-dev/vgc-reporter/releases/latest)**

> **v0.6.0 signing note:** this release uses the 0.5.0 updater key. If an older installation does not offer the update automatically, install the MSI or APK manually. On Android, uninstall the previous app if the signature mismatch blocks the install.

First launch downloads ~10 MB of Pokédex / moves / items / abilities and caches them locally; subsequent launches work offline until caches expire.

## Quick Start

```bash
bun install
bun run tauri:dev
```

First launch downloads and caches Pokédex, moves, items, abilities and usage stats. Subsequent launches are offline-capable until caches expire.

## Features

| Area | What it does |
|---|---|
| **Dashboard** | Three views in the requested order - **Novedades** (default), **Métricas**, **Regulación** - with a dynamic format selector, live season label and season-aware date range. Top Pokémon with switchable bar chart / grid / meta-share treemap / tier list; Top Items / Moves / Abilities show the Pokémon that use each one most; recent Champions tournaments show the champion team, include a **champion-country filter** with flags and an honest empty state. |
| **Novedades (Feed)** | Fully configurable panel stack: regulation summary, official VGC live broadcast, tournaments + month calendar and official news. Drag panels by the handle to reorder or group them into a shared row; drop on top/bottom edges to split rows. Every panel collapses, and the **Separados / Juntos** controls switch between one-per-row and all-in-one-row. Layout is persisted locally. |
| **Learn** | Competitive learning page with progress, guides (format, team construction, cores, Stat Points, speed control, reading the meta, common mistakes), a daily **type / speed / lead** quiz with streak, real starter teams loadable into the builder, meta threats with weaknesses, a searchable glossary and tool shortcuts. Content in all five languages. |
| **Type chart** | `Ctrl+T` or the titlebar/mobile button opens a quick 18×18 effectiveness matrix, one/two-type coverage and current-team weaknesses (4×), resistances, immunities and offense. |
| **Live broadcast** | Configurable YouTube screens (YukS VGC, Play! Pokémon, WolfeyVGC, CybertronVGC, James Baek, PokeAlex, Moxie2D, Pokémon Champions, Sekiam, IRNemesis). A stable 9-slot TV wall; every tile has its own stop/resume, keep/mini-player and eye control, so hiding or reordering one never reloads the others. Only genuinely live streams get the live badge; otherwise the panel shows **Latest broadcasts** from `/streams`. **Vitrina TV** opens the fixed 3×3 wall. |
| **Official news** | Pokémon Champions announcements paginated 6 at a time, always newest first. Banners use a shimmer/skeleton + fade-in while loading and a neutral fallback if an image 404s. Clicking an item opens an in-app preview modal rendering the official page, with "Open in browser" as the fallback. |
| **Upcoming tournaments** | Online Limitless events (including the public `/tournaments/upcoming` table) plus in-person League Challenges/Cups from the official Play! Pokémon locator. Country/city searchable comboboxes, free-text search, favourite-country star, local time and registration counts. Each event opens a full card with organizer, contact, full address, price, registration window, OpenStreetMap and `.ics` export. |
| **Regulation** | Active regulation and season with official local-time instants and the UTC data days used by metrics, eligible roster with sprites and usage %, new Megas, and allowed items with search, sprites, localized names, descriptions, **share of total teams** and the Pokémon that use each item most. |
| **Pokédex** | Sortable by generation / alphabetical / meta usage; click any Pokémon for a large modal with curated competitive sets, live meta usage and type matchups. Includes the two Basculegion gendered forms and AZ's Floette-Eternal sprite. |
| **Team Builder** | Classic (EVs/IVs) and **Champions** (66 Stat Points, 32 per stat, 31 IVs, level 50) modes, with automatic EV↔SP conversion and species/item clauses. 6 slots with searchable comboboxes, regulation-aware validation and Showdown import/export. |
| **My Teams** | Local SQLite persistence with rename / duplicate / delete. Multi-team Showdown paste import and export - pick which teams to bundle, copy to clipboard or download as `.txt`. |
| **Top Teams** | Tournament teams from Labmaus/Limitless and community/tournament teams from PokéBase, with provider/date/country/player/Pokémon filters and "Load into builder". Keeps PokéBase's original attribution when it points to another source. |
| **LAN sync** | Desktop and Android over the same Wi-Fi, no cloud. QR + 8-character code with UDP discovery, preview, and conflict handling (rename / replace / skip). |
| **Search palette** | Global Ctrl+K palette with filter chips per kind (Pokémon / moves / items / abilities) - multi-select with a Clear button, also filters the recent-searches list. |
| **Damage Calc** | `@smogon/calc` Gen 9 with searchable inputs for every field, real items and moves loaded from Showdown. |
| **Settings** | Active regulation and season, **LAN sync**, **calendar placement**, **playback continuity (stop/mini player)**, language, theme, font size, timezone, home country, live screens, source overrides and About/version. |
| **External sources** | Quick-launch panel for Pikalytics / PokéBase / Pokemon-Zone / Champions Lab / Munchstats (no scraping - just links). |
| **Localized data** | **5 languages** (ES / EN / PT / IT / FR) covering both UI strings and ability / move / item names and descriptions from PokéAPI, with automatic fallback to English when an upstream string is missing. |
| **Themes** | Light / Dark + Gengar, Clefable, Incineroar, Tyranitar, Milotic, Sneasler, **Umbreon (true black)** and **Zekrom (high contrast)** palettes. |
| **UX polish** | Window opens maximized, splash screen visible from the first frame, language and font size persisted locally, auto-update on Windows and Android. |

## Known Issues (beta)

- **Top Teams "Show all"** can render 4000+ team cards in a single page. Performance is acceptable but expect 5–15s render on first display; the app shows progressive hints while loading.
- **Windows bundles are not CA-signed**. The local release build is unsigned, so SmartScreen shows the warning; only a paid CA certificate removes it. macOS and Linux builds are no longer shipped; the supported release targets are Windows and Android.
- **Android APK is signed with the PumaSoft release key** but is not distributed through Play Store (sideload only).
- **Android auto-update**: the app will notify you when a new version is available and guide you through the install. You still need "Install from unknown sources" enabled.
- **First-run cache**: first launch needs internet. If a data source is down (Labmaus, Limitless), partial data is still rendered with a warning banner.
- **Live stream**: the Feed resolves every configured YouTube screen and says which ones are offline. The official channel filters GO/TCG; community channels (YukS VGC by default) show their current live video. YouTube's page format is not a public API, so a channel can occasionally take up to 5 minutes to appear. Add or remove screens in Settings (one URL per line, up to 12). **Like/Subscribe cannot be performed inside an embedded player** (YouTube requires Google OAuth); the app provides one-click Subscribe/Open shortcuts that hand the action to YouTube.
- **Item fallbacks**: item names/descriptions merge Showdown and PokéAPI; sprites try PokéAPI, Showdown and PokémonDB. A few brand-new items may still show a neutral icon until a mirror publishes the asset.
- **Event previews**: official Play! Pokémon pages refuse to load inside iframes. The app reads their organizer/price/address data server-side, retries through a public reader when the site fingerprints the direct request, and shows the structured fields in the card; if both routes are unavailable, it keeps every field from the event locator. **Open in browser** is always available. Limitless pages still render embedded.
- **Pikalytics breakdown** depends on Pikalytics being up; falls back to Showdown chaos data when unavailable.

Found something else? [Open an issue](https://github.com/felipesuarez-dev/vgc-reporter/issues/new) — beta feedback is gold.

## Data Sources

| Source | Use | Notes |
|---|---|---|
| [Official Pokémon HOME notices](https://champions-news.pokemon-home.com/en/list) | Regulation calendar, eligible roster, new Megas | Source of truth for the active set and season; parsed every hour |
| [Labmaus](https://labmaus.net) | Top teams, meta snapshot, trending, source-validated regulations | Primary tournament source - requires Origin/Referer pinning, injected server-side so no CORS leaks |
| [Limitless VGC](https://play.limitlesstcg.com/api/) | Tournaments, standings, decklists, upcoming online events | Authoritative for Champions standings; the public upcoming HTML table covers announcements the JSON API does not expose yet |
| [PokéBase](https://pokebase.app/pokemon-champions/teams) | Community and tournament teams | Public team page parsed from its Next.js RSC payload; respects robots.txt, 12h cache and keeps the original attribution |
| [Pokedata event locator mirror](https://pokedata.ovh/events/apiv2) | Upcoming in-person League Challenges / Cups | Country/city/venue, full address, coordinates, contact, admission and registration window |
| [Official Play! Pokémon event pages](https://www.pokemon.com/us/play-pokemon/pokemon-events/find-an-event/) | Organizer, phone, website, category, premier event, status and price | Read on demand when an event card opens (6h cache), with a reader fallback and structured parsing |
| [Jina Reader](https://r.jina.ai/) | Readable fallback for official event pages | Used only when the direct Pokémon request is blocked |
| [YouTube](https://www.youtube.com/) | Live VGC streams and latest broadcasts | Resolved from channel/handle/video URLs; the app never marks a past video as live |
| [PokéAPI sprites](https://github.com/PokeAPI/sprites) | Item sprites | Tries PokéAPI, Showdown item icons and PokémonDB before falling back to a neutral icon |
| [Pokémon Showdown](https://play.pokemonshowdown.com/data/) | Pokédex, moves, items, abilities, sprites | Fetched on first run, cached 7 days |
| [Smogon chaos JSON](https://www.smogon.com/stats/) | Ladder usage fallback | Slug auto-discovery + rating ladder rewind |
| [pkmn/smogon data](https://data.pkmn.cc/) | Curated competitive sets | Doubles + Singles slugs per format |

## Architecture

```mermaid
flowchart TD
    subgraph FE["React 19 · TS · Vite (webview)"]
        Pages[pages] --> Hooks[hooks]
        Hooks --> Stores[Zustand stores]
        Hooks --> IPC["ipc.ts (typed via ts-rs)"]
        I18n["i18next · 5 languages"] -.-> Pages
    end

    IPC -->|"invoke() · typed JSON"| CMD

    subgraph BE["Rust backend · clean architecture"]
        CMD["commands/  (thin IPC layer)"]
        CMD --> SVC["services/  (use cases)"]
        SVC --> DOM["domain/  (pure entities)"]
        SVC --> ADP["adapters/  (HTTP clients)"]
        SVC --> STO["storage/  (rusqlite + r2d2)"]
        ADP --> HTTP["HttpClient + SQLite cache"]
    end

    HTTP -.-> EXT["External APIs<br/>Labmaus · Limitless · Showdown<br/>PokéAPI · Pikalytics · Smogon · Pokepaste"]

    classDef ext fill:#1a1f2e,stroke:#2b86ff,color:#cdd6f4;
    class EXT ext;
```

Rule: dependencies always point inward. `domain/` knows nothing about I/O, Tauri or SQLite. All network calls flow through `adapters/http_client.rs` which writes to the SQLite cache so the frontend never needs to handle rate limits or CORS.

## Tech Stack

| Frontend | Backend | Build |
|---|---|---|
| React 19 | Rust 2021 | Tauri 2.4 |
| TypeScript | tokio | Vite |
| TailwindCSS | reqwest + rustls | `cargo` workspace |
| TanStack Query v5 | rusqlite + r2d2 | `bun run tauri:build` |
| Zustand | serde / thiserror | ImageMagick (icons) |
| React Router v7 | ts-rs | MSI installer (Windows) |
| i18next (5-language UI) | chrono / tracing | |
| Recharts | | |
| `@smogon/calc` | | |

## Development

```bash
# Dev mode (Vite HMR + Tauri window)
bun run tauri:dev

# Production bundle → src-tauri/target/release/bundle/msi/
bun run tauri:build

# Android — hot reload in emulator or USB device
bun run tauri android dev

# Android — build APK
bun run tauri android build --apk

# Rust tests + ts-rs bindings regeneration
cd src-tauri && cargo test

# Rust lint
cd src-tauri && cargo fmt && cargo clippy -- -D warnings

# Frontend type-check
bun run --cwd frontend build
```

> **Package manager**: this project uses **Bun** exclusively. Do not use `npm`/`npx`/`package-lock.json`; use `bun install`, `bun run`, and `bunx`.

## Project Structure

```
VGC-Reporter/
├── frontend/                 React 19 + TS + Vite
│   ├── src/
│   │   ├── pages/            one file per route
│   │   ├── components/       layout, pokemon, team, charts, tournament, dashboard, filters, info, ui
│   │   ├── stores/           Zustand (teamBuilder, dashboard, pokedex, filters, ui)
│   │   ├── lib/              ipc, queryKeys, types (ts-rs generated), formatDate, labels, typeChart
│   │   ├── hooks/            query + localization helpers
│   │   ├── locales/          es.json / en.json
│   │   └── i18n.ts
│   └── public/logo.png
├── src-tauri/                Rust backend (clean architecture)
│   ├── src/
│   │   ├── domain/           pure entities
│   │   ├── services/         use cases
│   │   ├── adapters/         HTTP clients
│   │   ├── storage/          SQLite pool, migrations, repos
│   │   └── commands/         Tauri IPC handlers
│   ├── icons/                app and installer assets (PIL script)
│   └── tauri.conf.json
├── assets/logo.png
└── README.md
```

## Requirements

- Bun 1.3.10+
- Rust 1.80+ (stable)
- **Desktop**: Windows 10/11
- **Android**: Android Studio + SDK API 24+, NDK r25c, JDK 17–24, `ANDROID_HOME` / `NDK_HOME` set; run `rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android` first
- First run needs internet access to populate the cache

## Author

<div align="center">

<img src="assets/logo.png" alt="PumaSoft" width="80" />

**[PumaSoft][pumasoft-link]**

</div>

## License

MIT © 2026 PumaSoft — see [LICENSE](LICENSE).

<!-- Reference-style definitions -->
[version-badge]: https://img.shields.io/badge/version-0.6.0.20261122--beta-2b86ff?style=flat-square&labelColor=0a0e14
[version-link]: #download
[beta-badge]: https://img.shields.io/badge/release-beta-ff6b6b?style=flat-square&labelColor=0a0e14
[tauri-badge]: https://img.shields.io/badge/Tauri-2.4-24c8db?style=flat-square&labelColor=0a0e14&logo=tauri
[tauri-link]: https://tauri.app
[rust-badge]: https://img.shields.io/badge/Rust-2021-dea584?style=flat-square&labelColor=0a0e14&logo=rust
[rust-link]: https://www.rust-lang.org
[react-badge]: https://img.shields.io/badge/React-19-61dafb?style=flat-square&labelColor=0a0e14&logo=react
[react-link]: https://react.dev
[license-badge]: https://img.shields.io/badge/license-MIT-a8d8a8?style=flat-square&labelColor=0a0e14
[pumasoft-badge]: https://img.shields.io/badge/by-PumaSoft-ff9f1c?style=flat-square&labelColor=0a0e14
[pumasoft-link]: https://github.com/felipesuarez-dev
