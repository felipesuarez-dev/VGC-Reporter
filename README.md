<div align="center">

<img src="assets/logo.png" alt="VGC-Reporter" width="180" />

# VGC-Reporter

**Pokémon Champions competitive stats & team builder, as a native desktop app.**  

**This app was built with pure, hardcore vibe-code and is still a work in progress. You might run into some bugs—nothing major. I’d really appreciate it if you could report them so I can make this app even better.**

[![Version][version-badge]][version-link]
[![Tauri][tauri-badge]][tauri-link]
[![Rust][rust-badge]][rust-link]
[![React][react-badge]][react-link]
[![License][license-badge]](LICENSE)
[![PumaSoft][pumasoft-badge]][pumasoft-link]

[Quick Start](#quick-start) · [Features](#features) · [Data Sources](#data-sources) · [Architecture](#architecture) · [Development](#development)

</div>

---

## Problem

Pokémon Champions launched on 8-Apr-2026 and instantly became the official VGC 2026 / Worlds platform. Usage data is scattered across Pikalytics, Pokemon-Zone, Porygon Labs, Champions Lab, Smogon chaos JSON and Limitless VGC standings. None of these sites share a unified API, and there is no offline-friendly way to browse the meta **and** build a team in the same place.

VGC-Reporter is the tool I wanted while team-building for Regulation M-A: one window, real tournament data, drill-down by Pokémon, and everything cached locally.

## Solution

- **Real tournament data, not just ladder** — aggregates Limitless VGC standings into usage stats, with Smogon chaos as fallback when the format is too fresh. Recent Champions tournaments are listed with full decklists rendered inline.
- **Format switcher with favorite** — Regulation M-A (Champions doubles), Champions Singles, Regulation I, Gen 9 OU. Pin one as favorite so it opens first every time.
- **Offline-friendly by design** — SQLite-backed HTTP cache, all network I/O on the Rust side, zero CORS pain.

## Quick Start

```bash
npm install
npm run tauri:dev
```

First launch downloads and caches Pokédex, moves, items, abilities and usage stats. Subsequent launches are offline-capable until caches expire.

## Features

| Area | What it does |
|---|---|
| **Dashboard** | Format selector with favorite star, top Pokémon hero chart, Top Items / Moves / Abilities / Tera lists with click-through drill-down, recent Champions tournaments with **inline decklists**, Twitter cards for `@VGCdata` / `@VGChampStats` |
| **Pokédex** | Sortable by generation / alphabetical / meta usage; click any Pokémon for a large modal with curated competitive sets (Doubles & Singles tabs), live meta usage and **type matchups** (weak/strong against) |
| **Team Builder** | 6 slots with searchable comboboxes for Pokémon / item / ability / nature / Tera / moves, EV sliders. Pickers are filtered live by the active regulation (only legal species, items and moves shown), and Save runs full validation (completeness, EVs assigned, allow-list checks) surfacing issues in a modal |
| **My Teams** | Local SQLite persistence with rename / duplicate / delete |
| **Top Teams** | Tournament-winning teams from Limitless rendered as mini-grids |
| **Damage Calc** | `@smogon/calc` Gen 9 with searchable inputs for every field, real items & moves loaded from Showdown |
| **External sources** | Quick-launch panel for Pikalytics / Pokebase / Pokemon-Zone / Champions Lab / Munchstats (no scraping — just links) |
| **Localized tooltips** | Item / move / ability descriptions served in ES (PokéAPI flavor text) with automatic EN fallback when Spanish is missing |
| **UX polish** | Window opens maximized, splash screen visible from the first frame, full ES/EN toggle persisted locally |

## Data Sources

| Source | Use | Notes |
|---|---|---|
| [Labmaus](https://labmaus.net) | Top teams, meta snapshot, trending, upcoming tournaments | **Primary** for Regulation M-A — requires Origin/Referer pinning, injected server-side so no CORS leaks |
| [Limitless VGC API](https://play.limitlesstcg.com/api/) | Tournaments, standings, decklists | Authoritative for Champions standings — decklists rendered inline |
| [Pokémon Showdown](https://play.pokemonshowdown.com/data/) | Pokédex, moves, items, abilities, sprites | Fetched on first run, cached 7 days |
| [Smogon chaos JSON](https://www.smogon.com/stats/) | Ladder usage fallback | Slug auto-discovery + rating ladder rewind |
| [pkmn/smogon data](https://data.pkmn.cc/) | Curated competitive sets | Doubles + Singles slugs per format |
| [Pikalytics](https://www.pikalytics.com/) | Per-species doubles breakdown (items, abilities, moves, Tera, teammates, EV spreads) | Surfaced inside the Pokémon detail modal |
| [Pokepaste](https://pokepast.es) | Importable team pastes | Pastes are immutable — cached 30 days |
| [PokéAPI CSV](https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv) | Localized names & flavor text | Bilingual (EN/ES) for abilities, moves, items — joined with Showdown data |
| [Showdown dex sprites](https://play.pokemonshowdown.com/sprites/dex/) | Sprite fallback | Variant-aware HD render for Mega/Regional forms |

**Not integrated** (no public API): Pokemon-Zone, Porygon Labs, Champions Lab, Pokebase, Munchstats. Exposed as one-click external links — no scraping.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 React 19 + TS + Vite (webview)              │
│     pages/  components/  stores/  hooks/  i18n  shadcn      │
└──────────────────────────┬──────────────────────────────────┘
                           │ Tauri invoke() (typed via ts-rs)
┌──────────────────────────▼──────────────────────────────────┐
│                  commands/   (thin IPC layer)               │
├─────────────────────────────────────────────────────────────┤
│                  services/   (use cases)                    │
│  MetaService · PokedexService · TeamService · TopTeams…     │
├──────────────────────┬─────────────────┬────────────────────┤
│      adapters/       │    storage/     │      domain/       │
│  Limitless / Smogon  │  rusqlite +     │  pure entities     │
│  Showdown / Sprites  │  r2d2 + migs    │  (no I/O, no deps) │
│  HttpClient + cache  │  CacheRepo etc. │                    │
└──────────────────────┴─────────────────┴────────────────────┘
```

Rule: dependencies always point inward. `domain/` knows nothing about I/O, Tauri or SQLite. All network calls flow through `adapters/http_client.rs` which writes to the SQLite cache so the frontend never needs to handle rate limits or CORS.

## Tech Stack

| Frontend | Backend | Build |
|---|---|---|
| React 19 | Rust 2021 | Tauri 2.4 |
| TypeScript | tokio | Vite |
| TailwindCSS | reqwest + rustls | `cargo` workspace |
| TanStack Query v5 | rusqlite + r2d2 | `npm run tauri:build` |
| Zustand | serde / thiserror | ImageMagick (icons) |
| React Router v7 | ts-rs | MSI installer (Windows) |
| i18next | chrono / tracing | |
| Recharts | | |
| `@smogon/calc` | | |

## Development

```bash
# Dev mode (Vite HMR + Tauri window)
npm run tauri:dev

# Production bundle → src-tauri/target/release/bundle/msi/
npm run tauri:build

# Rust tests + ts-rs bindings regeneration
cd src-tauri && cargo test

# Rust lint
cd src-tauri && cargo fmt && cargo clippy -- -D warnings

# Frontend type-check
cd frontend && npx tsc --noEmit
```

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
│   ├── icons/                generated by ImageMagick
│   └── tauri.conf.json
├── assets/logo.png
├── CLAUDE.md                 project-wide guide
└── README.md
```

## Requirements

- Node.js 20+
- Rust 1.80+ (stable)
- Windows 10/11, macOS 12+, or Linux with `webkit2gtk-4.1`
- First run needs internet access to populate the cache

## Author

<div align="center">

<img src="assets/logo.png" alt="PumaSoft" width="80" />

**[PumaSoft][pumasoft-link]**

</div>

## License

MIT © 2026 PumaSoft — see [LICENSE](LICENSE).

<!-- Reference-style definitions -->
[version-badge]: https://img.shields.io/badge/version-0.0.9.20260420-2b86ff?style=flat-square&labelColor=0a0e14
[version-link]: #
[tauri-badge]: https://img.shields.io/badge/Tauri-2.4-24c8db?style=flat-square&labelColor=0a0e14&logo=tauri
[tauri-link]: https://tauri.app
[rust-badge]: https://img.shields.io/badge/Rust-2021-dea584?style=flat-square&labelColor=0a0e14&logo=rust
[rust-link]: https://www.rust-lang.org
[react-badge]: https://img.shields.io/badge/React-19-61dafb?style=flat-square&labelColor=0a0e14&logo=react
[react-link]: https://react.dev
[license-badge]: https://img.shields.io/badge/license-MIT-a8d8a8?style=flat-square&labelColor=0a0e14
[pumasoft-badge]: https://img.shields.io/badge/by-PumaSoft-ff9f1c?style=flat-square&labelColor=0a0e14
[pumasoft-link]: https://github.com/felipesuarez-dev
