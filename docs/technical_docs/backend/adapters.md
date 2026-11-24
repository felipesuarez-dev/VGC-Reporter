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

### `official_regulation_client.rs`
- Descubre el aviso de regulación y el artículo de temporada desde `champions-news.pokemon-home.com/en/json/list.json`.
- Parsea fechas UTC, nuevas Megas y el link al roster elegible; extrae el array `const pokemons = [...]` del roster oficial.
- Solo acepta links de `web-view.app.pokemonchampions.jp`.

### `official_stream_client.rs`
- Pantallas por defecto: YukS, `@PlayPokemon`, WolfeyVGC, CybertronVGC, James Baek, PokeAlex, Moxie2D, MoxieBoosted, BlackStormGamesVGC, Pokémon Champions, Sekiam y THATSAplusONE (orden editable en Ajustes; máximo 12). No hay pantalla de “watch party”: si ningún canal está en vivo, la UI muestra las últimas transmisiones.
- Lee la pestaña `/streams` (o `/live` como fallback). El canal oficial conserva sólo tarjetas con **señal fuerte de directo** (`isLiveNow`, `BADGE_STYLE_TYPE_LIVE_NOW`, `label:LIVE` o contador real “N watching”) cuyo título sea VGC/Champions y rechaza GO/TCG; los canales de comunidad aceptan cualquier directo (`live_any`).
- Rechaza bloques con `isUpcoming`, `scheduledStartTime`, `Live in`, `Scheduled for`, `premiere` o `waiting`: YouTube devuelve `isLive:true` para estrenos programados y no deben mostrarse como directo.
- Para la **última transmisión** recorre la misma pestaña, descarta programados/estrenos y elige la tarjeta pasada con menor antigüedad según `Streamed N(d|h|m) ago`; extrae la duración de `thumbnailBadgeViewModel` y expone `published_at` aproximado para que la UI muestre “hace X”. Reconoce títulos VGC, “Championship Sunday” y “Videojuegos Pokémon” (Puebla).
- Un video configurado se valida contra `videoDetails.isLive` **y** contra las mismas señales de programado/estreno.
- TTL 5 min; `None` significa que ese canal no está en directo.

### `official_event_client.rs`
- Lee la página oficial `pokemon.com/.../play-pokemon-tournaments/{id}/` con UA de navegador, `Referer` y headers `Sec-Fetch-*`. TTL 6h.
- Parsea los pares `<label>` de la ficha (organizador, teléfono, email, local, dirección, web), el JSON-LD (dirección limpia y `offers.price`) y detecta la página anti-bot para no cachearla.
- Si el sitio bloquea la petición directa, usa **Jina Reader** (`r.jina.ai`) para obtener el mismo contenido público y parsea sus campos Markdown. El fallback final es el listado de Pokedata.

### `championships_client.rs`
- Host: `https://championships.pokemon.com`.
- Lista el calendario oficial con `GET /api/events.json?locale=en-us&status=upcoming|completed` (26 próximos / 55 pasados en la temporada 2027). Filtra `world`, `international`, `regional` y `special`; los eventos online se descartan.
- Parsea rangos como `Nov. 20–22` u `Oct. 31 - Nov. 1` usando el año del nombre del evento (LAIC 2027 ocurre en noviembre de 2026) y normaliza la sede a ciudad + ISO para banderas/filtros.
- `details(url)` lee el JSON embebido de la ficha y extrae el monto de **Prizing Information** (`$500,000 USD`, etc.) solo cuando la organización publicó efectivo.
- `winner(url)` consulta `results.json?game=vg&division=masters` y devuelve el campeón Masters + total de jugadores cuando ya hay resultados.
- TTL 6h para listas, 12h para ficha/resultados. `enrich()` combina premio y campeón sin bloquear si una de las dos fuentes falla.

### `pokedata_client.rs`
- Host de eventos: `https://pokedata.ovh/events/apiv2`.
- Modo país: `/_vg/challenges/cups/_country/{ISO}/_start/{from}/_end/{to}`.
- Modo todos: omite `_country` y pagina con `/_page/N` (2 páginas).
- Extrae datos de asistencia: `street_address`, `state`, `postal_code`, `latitude`, `longitude`, `contact_email`, `contact_phone`, `Details`, `Registration_start/end`, `Admission`, `Event_website`, `Third_party_registration_website`.
- Recorta el warning PHP antes del primer `{`; TTL 6h.
- Standings2: `standings(name, date)` busca el evento VG por nombre/fecha en `https://www.pokedata.ovh/standings2/`, lee `standings/{id}_Masters.json` (o `_Master.json`) y construye el historial por rondas. `top_cut(name, date)` parsea `details.bracket` de `/standings2/{id}/Masters` (o `/Master`) y, si falta el HTML, lo deriva del JSON. También lee los equipos de todos los jugadores y las divisiones. TTL 6h; se etiqueta como fuente no oficial.
- `domain/event_match.rs` centraliza el emparejamiento tolerante (fecha ±2 días, tipo, región y tokens), compartido con PokéBase.

## LimitlessClient (`limitless_client.rs`)
Host: `https://play.limitlesstcg.com/api`. TTL 1h listas / 24h detalle.

- `list_tournaments(format, limit)` — sin filtrar. URL: `?game=VGC&format={code}&limit={limit}`.
- `list_tournaments_by_format(format, limit)` — aplica `filter_champions` + `players > 0`.
- `list_all_vgc(limit)` - todos los VGC sin filtro de formato.
- `list_upcoming_vgc()` - parsea la tabla pública `/tournaments/upcoming?game=VGC` (HTML) para anuncios que la API JSON todavía no expone. Devuelve `LimitlessUpcoming` con `starts_at`, `registrations` y `region`.
- `get_standings(id)` - URL: `?limit=500`. Sin este parámetro la API devuelve ~5 entradas por defecto. Incluye decklist inline cuando el organizador lo publicó.

## PokebaseClient (`pokebase_client.rs`)
Host: `https://pokebase.app/pokemon-champions/teams` y `/tournaments`. TTL 12h.

- Lee la página pública (no `/api`, que está bloqueado por `robots.txt`) y decodifica el payload RSC de Next.js (`self.__next_f.push`).
- Extrae `showcase.community` y `showcase.tournament` con sus totales.
- Cada tarjeta conserva `source_url`/`date_shared` si PokéBase atribuye el equipo a otra fuente; `TopTeamsService` muestra esa atribución en lugar de apropiársela.
- `find_tournament(name, date)` lee los `aria-label` de las cards, descarta TCG y empareja con `domain/event_match.rs`.
- `tournament_top8(id)` parsea `ol[aria-label="Top 8"]`: jugador, país, placing, record, seis Pokémon, objeto y sprite.
- Tests: payload RSC, página sin payload, listado LAIC vs TCG y Top 8.

## ShowdownClient (`showdown_client.rs`)
Host: `https://play.pokemonshowdown.com/data`. TTL 7d.

- `fetch_pokedex()`, `fetch_descriptions()`.
- `items.js` no trae `desc`/`shortDesc`: los items se completan con PokéAPI. `moves.json` sí trae `shortDesc`.

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
- Los nombres usan `local_language_id`; los flavor texts usan `language_id`. Cada locale cae a EN si falta.
- El merge final en `PokedexService` une Showdown + PokéAPI (no descarta keys que sólo existen en una fuente).

## sprite_resolver (`sprite_resolver.rs`)
No es cliente — utilidad pura.

- `primary_sprite_url(species)` — Showdown gen5ani + fallback.
- `fallback_sprite_url(species)` — Showdown alternativos.
- `home_sprite_url(num)` — PokéAPI Pokémon Home.
- `canonical_id(species)` — slug normalizado para sprites/de-dup (`"Wash-Rotom"` → `"rotomwash"`).
- `canonical_display_name(species)` — display normalizado (`"Wash-Rotom"` → `"Rotom-Wash"`).
- Maneja aliases comunes: Calyrex-Ice/Shadow, Urshifu-RS/SS, Tauros-Paldea-*, Ogerpon-*, etc.
