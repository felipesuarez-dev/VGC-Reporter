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

- **Real tournament data, not just ladder** - aggregates Limitless VGC standings into usage stats, with Smogon chaos as fallback when the format is too fresh. Recent tournaments are split into **official championships** (LAIC, NAIC, EUIC, Regionals, Specials, Worlds) and **Limitless community** events, each with its own badge; official rows link to their results page and show the published cash prize pool.
- **Dynamic regulation calendar** — the app discovers the active Champions regulation and season from the official Pokémon HOME notices, validates the eligible roster, and cross-checks live tournament sources. If TPC moves a date, the app follows the published date; if the notice is late, a source with real decklists can activate the set.
- **The live scene in one place** - a draggable **Novedades** board with the official VGC stream and official news previews, plus a dedicated **Tournaments** tab for upcoming events, recent results and the calendar. Every panel collapses and can be grouped or separated, and the layout is remembered.
- **Desktop tabs** in the navbar: `+` next to the search icon. Each tab keeps its route, scroll and **its own playback session**; live streams in one tab never reuse or replace another tab's player. Inside the same tab, the playback setting decides between stopping the video or moving it to the mini-player.
- **Regulation workspace** - eligible Pokémon and items with usage percentages, sprites, localized descriptions, detail modals and usage/alphabetical sorting, not just a plain allow-list.
- **Official tournament results** - past majors open an in-app sheet with summary, venue, prize, Masters champion and paginated official standings, backed by PokéData when the official feed is late. A collapsible **Top Cut bracket with real bracket rails**, complete per-round match history (wins in green, losses in red), event divisions and **PokéBase Top 8 teams** fill the decklists the official feed does not publish.
- **Calendar that respects context** - today is always marked, selected days are grouped into Official championships/Community tournaments/Personal, each group paginates 6 events, and the city filter only applies to local official events.
- **Quick tables widget** - Types can select attacker/defender by row/column/cell; Natures use a nature × stat grid. Choose **anchored to the titlebar** or **floating widget** in the unified rail, with a configurable shortcut and a large-screen landscape mode. No more tabs in Novedades, pinned cards or embedded copy in the Pokédex.
- **Sync and Android updater** - versioned QR pairing ticket over local Wi-Fi, 5-minute one-use sessions, visible states and conflict handling. The **sender chooses which teams/settings/UI to send** and the **receiver chooses what to import** from that subset. Sync settings use human labels (“Labmaus · Regulation M-C”), never raw storage keys. Android downloads in-app with progress/cancel, verifies size/SHA-256/signature and opens the system installer through FileProvider.
- **Mobile navigation** - a floating hybrid dock with history, search, a `+` next to the search icon, open views + section shortcuts; fixed bottom-centered or free-draggable, enable/disable in Settings. It is Android-only and never mounts on desktop. The mobile topbar hides duplicate back/forward/search controls while it is active.
- **Learn 2.0** - 12 guides with 9 sections, sources and review date, 10 daily generated questions, expanded trivia, 80+ glossary terms with examples in five languages, 11 core archetypes and six sample-aware meta insights.
- **Consistent controls** - switches for on/off, segmented controls for exclusive choices, checkboxes only for multi-select lists, and 36 px selects across Settings and the rest of the app.
- **Offline-friendly by design** - SQLite-backed HTTP cache, all network I/O on the Rust side, zero CORS pain.

## Screenshots

<table>
  <tr>
    <td align="center">
      <img src="assets/screen-torneos-0.7.0.png" alt="Tournaments tab" width="420" /><br/>
      <sub><b>Tournaments</b> - upcoming events, 10 per page, country/city filters</sub>
    </td>
    <td align="center">
      <img src="assets/screen-pokedex-0.7.0.png" alt="Pokédex" width="420" /><br/>
      <sub><b>Pokédex</b> - redesigned grid with usage, type, generation and filters</sub>
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
      <img src="assets/screen-feed-0.7.0.png" alt="Novedades feed" width="420" /><br/>
      <sub><b>Novedades</b> — regulation summary, live and official news; tournaments moved to their own tab</sub>
    </td>
    <td align="center">
      <img src="assets/screen-regulation.png" alt="Regulation and allowed items" width="420" /><br/>
      <sub><b>Regulación</b> — eligible roster plus searchable items with usage and their top Pokémon</sub>
    </td>
  </tr>
  <tr>
    <td align="center" colspan="2">
      <img src="assets/screen-live-collapsible-0.6.3.png" alt="Collapsible recent streams inside Live" width="840" /><br/>
      <sub><b>Live</b> — the recent-streams block now collapses with a chevron, directly above official news</sub>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="assets/screen-event.png" alt="Tournament detail with map" width="420" /><br/>
      <sub><b>Event detail</b> — price badge, organizer/contact, category, premier event, map and .ics export; official data is read inside the app</sub>
    </td>
    <td align="center">
      <img src="assets/screen-calendar-0.6.2.png" alt="Tournament calendar" width="420" /><br/>
      <sub><b>Tournament calendar</b> - multi-day official majors highlighted per day, configured-timezone schedule, text/country/city search, personal events and .ics export</sub>
    </td>
  </tr>
  <tr>
    <td align="center" colspan="2">
      <img src="assets/screen-official-events.png" alt="Official championships and community tournaments with badges" width="840" /><br/>
      <sub><b>Official championships</b> - LAIC/NAIC/Regionals/Worlds tier badges, multi-day ranges, prize pools and winners, separated from Limitless community tournaments</sub>
    </td>
  </tr>
  <tr>
    <td align="center" colspan="2">
      <img src="assets/screen-live-wall.png" alt="Full-screen TV wall of VGC live streams" width="840" /><br/>
      <sub><b>Vitrina TV</b> - full-screen mosaic of the official broadcast and community screens (YukS VGC by default)</sub>
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
      <img src="assets/screen-settings-collapsible-0.7.0.png" alt="Collapsible Settings" width="840" /><br/>
      <sub><b>Settings</b> — consistent switches/segmented controls, live screens (up to 12), active regulation and source overrides</sub>
    </td>
  </tr>
  <tr>
    <td align="center" colspan="2">
      <img src="assets/screen-settings-quick-tables-0.7.0.png" alt="Quick tables settings with matching control heights" width="840" /><br/>
      <sub><b>Quick tables</b> — select and segmented control share the same 36 px height; location is titlebar or floating rail</sub>
    </td>
  </tr>
  <tr>
    <td align="center" colspan="2">
      <img src="assets/screen-settings-sync-labels-0.7.0.png" alt="Sync settings with human labels" width="840" /><br/>
      <sub><b>Sync labels</b> — “Labmaus · Regulation M-C”, “Live screens”, “Official channel”; no raw keys</sub>
    </td>
  </tr>
  <tr>
    <td align="center" colspan="2">
      <img src="assets/screen-tabs-desktop-0.7.0.png" alt="Desktop tabs in the navbar" width="840" /><br/>
      <sub><b>Desktop tabs</b> — Panel Principal, Pokédex and Ajustes in the titlebar; the + sits next to the search icon</sub>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="assets/screen-tabs-mobile-0.7.0.png" alt="Mobile dock with + next to search" width="390" /><br/>
      <sub><b>Mobile views</b> — + next to the search icon; views dock</sub>
    </td>
    <td align="center">
      <img src="assets/screen-tabs-mobile-views-0.7.0.png" alt="Mobile views sheet" width="390" /><br/>
      <sub><b>Views sheet</b> — open views + section shortcuts</sub>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="assets/screen-recent-tournaments-0.6.2.png" alt="Recent tournaments with collapsible official and community groups" width="420" /><br/>
      <sub><b>Recent tournaments</b> — official results modal, community standings and collapsible groups</sub>
    </td>
    <td align="center">
      <img src="assets/screen-official-topcut-0.7.0.png" alt="Collapsible official Top Cut bracket" width="420" /><br/>
      <sub><b>Official results</b> — PokéBase Top 8 teams, collapsible Top Cut and per-round match history</sub>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="assets/screen-tables-0.7.0.png" alt="Redesigned quick type tables" width="420" /><br/>
      <sub><b>Quick tables</b> — titlebar or floating rail, attacker/defender selection, natures grid and landscape mode</sub>
    </td>
    <td align="center">
      <img src="assets/screen-learn-0.7.0.png" alt="Learn with data refresh" width="420" /><br/>
      <sub><b>Learn 2.0</b> — guides, daily practice, cores and sample-aware insights</sub>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="assets/screen-glossary-0.7.0.png" alt="Glossary with examples and sources" width="420" /><br/>
      <sub><b>Glossary</b> — 80+ terms, categories, search and alphabetical index</sub>
    </td>
    <td align="center">
      <img src="assets/screen-treemap-0.6.2.png" alt="Usage treemap" width="420" /><br/>
      <sub><b>Treemap</b> — responsive labels, sprites and contrast-aware text</sub>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="assets/screen-sync-select-0.7.0.png" alt="Selective LAN sync" width="420" /><br/>
      <sub><b>Sync</b> — send/receive teams and settings over local Wi-Fi</sub>
    </td>
    <td align="center">
      <img src="assets/screen-qr-0.6.2.png" alt="Sync QR and 8-character code" width="420" /><br/>
      <sub><b>QR + code</b> — versioned ticket, 5-minute one-use session and manual fallback</sub>
    </td>
  </tr>
  <tr>
    <td align="center" colspan="2">
      <img src="assets/screen-mobile-nav-0.7.0.png" alt="Mobile navigation dock and open views" width="390" /><br/>
      <sub><b>Mobile navigation</b> — floating dock with history, search and open views; the topbar hides duplicate controls</sub>
    </td>
  </tr>
</table>

> Beta reference shots. 0.7.0 adds the **Tournaments** tab, Separados/Juntos in all four views, collapsible and reorganized Settings with consistent controls and subtle dividers, selective sync, a unified widget rail, **desktop tabs in the navbar**, a **mobile views dock with + next to search**, independent filters/pagination for recent tournaments and the calendar, **Top Cut bracket rails**, PokéData teams/divisions, per-tab playback with configurable mini-player, guides with sources and a five-language glossary.

## Download

Pre-built installers for the **`v0.7.0.20261123-beta`** release:

| Platform | Installer | Notes |
|---|---|---|
| Windows 10/11 | `VGC.Reporter_0.7.0_x64_en-US.msi` | MSI installer — unsigned; SmartScreen → More info → Run anyway |
| Android 7+ (arm64) | `VGC.Reporter_v0.7.0.20261123-beta_android.apk` | Sideload or in-app updater; enable "Unknown sources" first |

**[→ Download from the latest GitHub Release](https://github.com/felipesuarez-dev/vgc-reporter/releases/latest)**

> **v0.6.2 signing note:** this release uses the same updater key as 0.5.0/0.6.1. If an older installation does not offer the update automatically, install the MSI or APK manually. Android verifies the APK signature against the installed app before launching the package installer.

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
| **Dashboard** | Four views - **Novedades** (default), **Torneos**, **Métricas**, **Regulación** - with a dynamic format selector, live season label and season-aware date range. **Desktop tabs live in the navbar**: `+` next to the search icon; each tab keeps its route, scroll and its own playback session, so live streams never leak between tabs. Inside a tab, the playback setting chooses stop or mini-player. Top Pokémon with switchable bar chart / grid / meta-share treemap / tier list; Top Items / Moves / Abilities show the Pokémon that use each one most. All four views share the same drag & drop, Separados/Juntos and collapsible panels. |
| **Novedades (Feed)** | Season summary → **Live** → **Official news**. The **recent streams** block inside Live is collapsible and paginates 6 at a time. Drag panels by the handle to reorder or group them into a shared row; drop on top/bottom edges to split rows. Every panel collapses, and the **Separados / Juntos** controls switch between one-per-row and all-in-one-row. Layout is persisted locally. |
| **Tournaments** | Dedicated tab with **Upcoming**, **Recent tournaments** and **Calendar**. Upcoming has an independent 10-per-group pager for Official, Local and Limitless, country/city filters and collapsible groups. No See more/less. Recent tournaments use the full row as the trigger, shared “View results” labels, independent search/country filters and a 10 + 10 pager. |
| **Recent official results** | In-app result sheet with PokéData standings fallback, **Top Cut bracket with real bracket rails**, full per-round match history (green wins / red losses), event divisions and PokéBase **Top 8 teams** plus PokéData team fallback. |
| **Learn** | Progress, 12 guides with 9 sections, examples, common mistakes, checklist, sources and review date, daily **type / speed / lead** practice, rules trivia, **real meta cores with “Try core”**, more starter teams with “See more”, a searchable glossary with **examples in five languages and sources**, a data-refresh button and tool shortcuts. Content in all five languages. |
| **Quick tables** | A configurable shortcut (`Ctrl+T` by default) opens/closes an 18×18 type matrix, coverage, current-team matchups and a **nature table**. Choose **anchored to the titlebar** or **floating widget** in the unified rail; the old pinned-page card is gone. They are no longer embedded in Novedades or the Pokédex. |
| **Live broadcast** | 12 configurable YouTube channels (YukS VGC, Play! Pokémon, WolfeyVGC, CybertronVGC, James Baek, PokeAlex, Moxie2D, MoxieBoosted, BlackStormGamesVGC, Pokémon Champions, Sekiam, THATSAplusONE). A stable 9-slot TV wall; every tile starts its own player and can run alongside others in the same tab. Only strong live signals count; scheduled premieres and “Live in…” are rejected. Offline channels show their **actual latest broadcast** with **time ago** and **duration**. Players autoplay on the first click; each tab keeps its own set and, when leaving Novedades, the stop/mini setting decides what happens. |
| **Official news** | Pokémon Champions announcements paginated 6 at a time, always newest first. Banners use a shimmer/skeleton + fade-in while loading and a neutral fallback if an image 404s. Clicking an item opens an in-app preview modal rendering the official page, with "Open in browser" as the fallback. |
| **Upcoming tournaments** | Separate **Official** (in-person Play! Pokémon + season championships) and **Limitless community** (online, unofficial) tabs. Official majors include **LAIC, NAIC, EUIC, Regionals, Specials and Worlds** with tier badges, multi-day date ranges, published cash prize pools and `.ics` exports. **Country and city filters are multi-select**: the local country from Settings preselects the country filter, and the city picker only lists cities from the selected countries, grouped by country. Local filters never hide the majors. **Independent 10-per-group pager** and collapsible groups; each event opens a full card with organizer, contact, full address, price, registration window, OpenStreetMap and `.ics` export. |
| **Regulation** | Active regulation and season with official local-time instants and the UTC data days used by metrics, eligible roster with sprites and usage %, new Megas, and allowed items with search, sprites, localized names, descriptions, **share of total teams** and the Pokémon that use each item most. |
| **Pokédex** | Redesigned header, active-filter chips, result count and cards with usage/type/BST/generation; sortable by generation / alphabetical / meta usage; click any Pokémon for a large modal with curated competitive sets, live meta usage and type matchups. Includes the two Basculegion gendered forms and AZ's Floette-Eternal sprite. |
| **Team Builder** | Classic (EVs/IVs) and **Champions** (66 Stat Points, 32 per stat, 31 IVs, level 50) modes, with automatic EV↔SP conversion and species/item clauses. 6 slots with searchable comboboxes, regulation-aware validation and Showdown import/export. |
| **My Teams** | Local SQLite persistence with rename, **duplicate (icon)**, delete with confirmation, import/export. Multi-team Showdown paste import and export - pick which teams to bundle, copy to clipboard or download as `.txt`. |
| **Top Teams** | Tournament teams from Labmaus/Limitless, community/tournament teams from PokéBase, and **recent official Top 8 teams** with an **Official tournament** badge; **Official** is listed in the Sources line. The home-country filter only activates with at least 3 community teams from that country. Provider/date/country/player/Pokémon filters and "Load into builder". Usage metrics exclude partial official teams. Keeps PokéBase's original attribution when it points to another source. |
| **LAN sync** | Desktop and Android over the same Wi-Fi, no cloud. QR + 8-character code with UDP discovery. The **sender selects teams/settings/UI** and the **receiver selects what to import**; conflicts (rename / replace / skip) apply only to the selected teams. |
| **Search palette** | Global Ctrl+K palette with filter chips per kind (Pokémon / moves / items / abilities) - multi-select with a Clear button, also filters the recent-searches list. |
| **Damage Calc** | `@smogon/calc` Gen 9 with searchable inputs for every field, real items and moves loaded from Showdown. |
| **Settings** | General, Widgets and navigation, Playback and live, Data and sources, Sync, and Advanced groups. Every section and card is collapsible with Expand all / Collapse all. **Playback when changing pages** chooses stop vs mini-player; calendar and quick tables choose titlebar vs floating rail. One control language: switches, segmented controls, checkboxes only for multi-select and 36 px selects; sync settings use human labels; the font-size slider keeps contrast across themes. |
| **Mobile navigation** | Floating dock with history, search, a **`+` next to the search icon** and open views + section shortcuts; fixed bottom-centered or free-draggable, enable/disable in Settings. It is Android-only and never mounts on desktop. The mobile topbar hides duplicate back/forward/search controls while active. Each view keeps its own playback; the mini-player sits left of the widget rail and above the dock when leaving Novedades. |
| **External sources** | Quick-launch panel for Labmaus / Pikalytics / PokéBase / Pokémon Zone / PokéData / Champions Lab / Limitless. PokéData is also used as a standings fallback and Top Cut source; the legal note clarifies that these sites are not affiliated with TPCi, Nintendo, Creatures or GAME FREAK. |
| **Localized data** | **5 languages** (ES / EN / PT / IT / FR) covering both UI strings and ability / move / item names and descriptions from PokéAPI, with automatic fallback to English when an upstream string is missing. |
| **Themes** | Light / Dark + Gengar, Clefable, Incineroar, Tyranitar, Milotic, Sneasler, **Umbreon (true black + yellow)**, **Zekrom (dark high contrast)** and **Reshiram (light high contrast)**. Descriptions appear in tooltips. |
| **UX polish** | Window opens maximized, splash screen visible from the first frame, language and font size persisted locally, auto-update on Windows and Android. |

## Known Issues (beta)

- **Top Teams "Show all"** can render 4000+ team cards in a single page. Performance is acceptable but expect 5–15s render on first display; the app shows progressive hints while loading.
- **Windows bundles are not CA-signed**. The local release build is unsigned, so SmartScreen shows the warning; only a paid CA certificate removes it. macOS and Linux builds are no longer shipped; the supported release targets are Windows and Android.
- **Android APK is signed with the PumaSoft release key** but is not distributed through Play Store (sideload only).
- **Android auto-update**: the app will notify you when a new version is available and guide you through the install. You still need "Install from unknown sources" enabled.
- **First-run cache**: first launch needs internet. If a data source is down (Labmaus, Limitless), partial data is still rendered with a warning banner.
- **Live stream**: the Feed resolves every configured YouTube screen and says which ones are offline. Only strong live signals count; scheduled premieres, `isUpcoming`, “Live in…” and “waiting” are rejected even when YouTube reports `isLive`. Community channels (YukS VGC by default) show their current live video. YouTube's page format is not a public API, so a channel can occasionally take up to 5 minutes to appear. Add or remove screens in Settings (one URL per line, up to 12). **Like/Subscribe cannot be performed inside an embedded player** (YouTube requires Google OAuth); the app provides one-click Subscribe/Open shortcuts that hand the action to YouTube.
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
| [Official Championship Series calendar](https://championships.pokemon.com/en-us/events) | Internationals, Regionals, Specials and Worlds; dates, venue, prize pool, winner | Upcoming and completed calendars; event pages are read for the published "Prizing Information" and the Masters results endpoint for the winner |
| [PokéBase](https://pokebase.app/pokemon-champions/teams) | Community and tournament teams | Public team page parsed from its Next.js RSC payload; respects robots.txt, 12h cache and keeps the original attribution. Official tournament pages enrich Top 8 teams. |
| [PokéData standings](https://www.pokedata.ovh/standings2/) | Independent Masters standings, Top Cut bracket, per-round history, every player's team and event divisions for official majors | Public HTML + JSON mirror; used as a fallback when the official results feed is empty, for the bracket/round history and for team data. Reads both `Masters` and `Master`; derives the bracket from round history when the HTML is missing. Data may be unofficial. |
| [Pokémon Zone](https://www.pokemon-zone.com/champions/tournaments/) | External aggregator for Champions tournaments and teams | Link-only source: Cloudflare blocks direct reads, so the app opens it in the browser instead of scraping it |
| [Pokedata event locator mirror](https://pokedata.ovh/events/apiv2) | Upcoming in-person League Challenges / Cups | Country/city/venue, full address, coordinates, contact, admission and registration window |
| [Official Play! Pokémon event pages](https://www.pokemon.com/us/play-pokemon/pokemon-events/find-an-event/) | Organizer, phone, website, category, premier event, status and price | Read on demand when an event card opens (6h cache), with a reader fallback and structured parsing |
| [Jina Reader](https://r.jina.ai/) | Readable fallback for official event pages | Used only when the direct Pokémon request is blocked |
| [YouTube](https://www.youtube.com/) | Live VGC streams and the actual latest broadcast (age + duration) | Resolved from channel/handle/video URLs; scheduled cards are skipped and the app never marks a past video as live |
| [PokéAPI sprites](https://github.com/PokeAPI/sprites) | Item sprites | Tries PokéAPI, Showdown item icons and PokémonDB before falling back to a neutral icon |
| [Pokémon Showdown](https://play.pokemonshowdown.com/data/) | Pokédex, moves, items, abilities, sprites | Fetched on first run, cached 7 days |
| [Smogon chaos JSON](https://www.smogon.com/stats/) | Ladder usage fallback | Slug auto-discovery + rating ladder rewind |
| [pkmn/smogon data](https://data.pkmn.cc/) | Curated competitive sets | Doubles + Singles slugs per format |

**Legal notice:** PokéBase, PokéData and Pokémon Zone are external sites not affiliated with, sponsored or endorsed by, or in any way associated with The Pokémon Company International Inc., Nintendo, Creatures Inc. or GAME FREAK Inc. Their data may be unofficial.

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

    HTTP -.-> EXT["External APIs<br/>Labmaus · Limitless · Championships<br/>PokéAPI · Pikalytics · Smogon · Pokepaste"]

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
[version-badge]: https://img.shields.io/badge/version-0.7.0.20261123--beta-2b86ff?style=flat-square&labelColor=0a0e14
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
