# Backend — Adapters

`src-tauri/src/adapters/`. Clientes HTTP y utilidades que tocan I/O externo.

## HttpClient (`http_client.rs`)
Wrapper sobre `reqwest`. Cache SQLite por URL con TTL.

- `get_cached(url, ttl)` — devuelve `Bytes`.
- `get_cached_with_headers(url, headers, ttl)` — inyecta headers sólo para esa URL (clave: Origin/Referer de Labmaus no se filtran a otros hosts).
- `get_json<T>(url, ttl)` — deserializa.

Toda I/O HTTP del backend pasa por aquí. No usar `reqwest::Client::new()` directo en services.

## LabmausClient (`labmaus_client.rs`)
Host: `https://labmaus.net/api/*`.

- Headers obligatorios: `Origin: https://labmaus.net`, `Referer: https://labmaus.net`.
- TTLs: 2h top teams, 24h tournaments, 4h trending, 24h catalog.
- Métodos: `get_completed_tournaments(from, to)`, `get_discover_teams(from, to, regulation)`, `get_all_vgc_pokemon(lang)`.

## LimitlessClient (`limitless_client.rs`)
Host: `https://play.limitlesstcg.com/api`. TTL 1h listas / 24h detalle.

- `list_tournaments(format, limit)` — sin filtrar. URL: `?game=VGC&format={code}&limit={limit}`.
- `list_tournaments_by_format(format, limit)` — aplica `filter_champions` + `players > 0`.
- `list_all_vgc(limit)` — todos los VGC sin filtro de formato.
- `get_standings(id)` — URL: `?limit=500`. Sin este parámetro la API devuelve ~5 entradas por defecto. Incluye decklist inline cuando el organizador lo publicó.

## ShowdownClient (`showdown_client.rs`)
Host: `https://play.pokemonshowdown.com/data`. TTL 7d.

- `fetch_pokedex()`, `fetch_descriptions()`.

## SmogonClient (`smogon_client.rs`)
Host: `https://www.smogon.com/stats`. TTL 24h.

- `fetch_chaos(format)`, `fetch_chaos_for_format(format, settings)` — descubre slug real, lo cachea en `SettingsRepo`.

## PokepasteClient (`pokepaste_client.rs`)
Host: `https://pokepast.es/<hash>/raw`. TTL 30d (los pastes son inmutables).

- `Accept: text/plain`.
- `get_team(url)` → `Vec<ShowdownEntry>`.

## PikalyticsClient (`pikalytics_client.rs`)
HTML scraping de `https://www.pikalytics.com/pokedex/championstournaments/<id>`. TTL 24h.

- `fetch_entry(species, lang)` → `PikalyticsEntry`.

## PokeApiClient (`pokeapi_client.rs`)
Host: `https://pokeapi.co/api/v2` + mirror CSV. TTL 30d.

- `fetch_translation_table()`, `fetch_ability_descriptions()`, `fetch_move_descriptions()`, `fetch_item_descriptions()`.

## sprite_resolver (`sprite_resolver.rs`)
No es cliente — utilidad pura.

- `primary_sprite_url(species)` — Showdown gen5ani + fallback.
- `fallback_sprite_url(species)` — Showdown alternativos.
- `home_sprite_url(num)` — PokéAPI Pokémon Home.
- `canonical_id(species)` — slug normalizado para sprites/de-dup (`"Wash-Rotom"` → `"rotomwash"`).
- `canonical_display_name(species)` — display normalizado (`"Wash-Rotom"` → `"Rotom-Wash"`).
- Maneja aliases comunes: Calyrex-Ice/Shadow, Urshifu-RS/SS, Tauros-Paldea-*, Ogerpon-*, etc.
