# Backend — Services

`src-tauri/src/services/`. Casos de uso. Reciben adapters y repos por `Arc`. Sin dependencias de Tauri.

## MetaService (`meta_service.rs`)
Genera el `MetaSnapshot` (Top Pokémon, top items/moves/abilities/tera, common movesets, teammates).

- **Primario**: `build_from_labmaus` — Labmaus discover-teams (ventana 14d) → resuelve cada `pokepaste_url` con `PokepasteClient` → convierte a `LimitlessStanding` → `usage_aggregator::aggregate`.
- **Fallback 1**: `list_tournaments_by_format` (Limitless) + `get_standings` por torneo → `aggregate`.
- **Fallback 2**: Smogon chaos JSON.
- Logs `tracing::info!` con la fuente final (`labmaus` / `limitless` / `limitless-thin` / `smogon`).

## TopTeamsService (`top_teams_service.rs`)
- Labmaus `discover-teams` (14d) → top `limit` → resuelve pokepastes en paralelo (concurrencia 16) → `build_top_team`.
- Filtra equipos con < 3 miembros válidos.
- Sprite resolution per-member vía `PokedexService::sprite_urls_for`.
- Fallback: Limitless `list_tournaments_by_format` (10 torneos recientes, top 8 standings).

## ChampionsReportService (`champions_report_service.rs`)
- `list_recent`: pide `limit*3` tournaments a Limitless, prefetch de `get_standings` con `join_all`, conserva sólo los que tienen ≥1 decklist no vacía (`has_any_decklist`).
- `official_recent`: mezcla el calendario oficial completado con el de próximos para incluir también un major en curso (LAIC en domingo). Filtra por rango, deduplica por id/URL, enriquece en paralelo con premio y campeón Masters y devuelve `official_tournaments` separado de la lista comunitaria.
- `get_standings`: descarga estandarte raw, recolecta nombres únicos, los resuelve en batch vía `PokedexService::sprite_urls_for`, mapea a `TournamentStanding` con sprites inyectados.

## TrendingService (`trending_service.rs`)
- Resuelve nombre Labmaus desde `SettingsRepo` o default del `Format`.
- **`regulation_service.rs`** — construye el catálogo estático M-A/M-B/M-C, consulta el calendario oficial y detecta una regulación nueva por fuentes si la oficial aún no está publicada. Publica snapshots en `domain::regulation`; `Format` y `DynamicRules` los consumen.
- Divide ventana en dos mitades de 7 días (`prev` vs `curr`).
- Pesos por placement: top 8 → 3.0, 9–32 → 2.0, resto → 1.0.
- Score: delta porcentual + log-ratio momentum con shrinkage Bayesiano (`config::TRENDING_BAYES_K`).
- Top 15 rising y top 15 falling.

## PokedexService (`pokedex_service.rs`)
- Carga Showdown pokedex.json + descripciones.
- Merge con PokéAPI CSV bilingüe (ES/EN). El merge parte de la unión de ambas fuentes: Showdown aporta el inglés corto de moves/abilities, PokéAPI aporta inglés/localizado de items y los locales que falten; cada locale cae a EN.
- Ítems: `top_items` global devuelve hasta 200 entradas y normaliza variantes (`Focus Sash`/`Focussash`) por clave canónica.
- API pública: `all`, `search`, `get`, `list_items`, `list_moves`, `list_moves_for_species`, `get_entity_descriptions`, `learnsets_index`, `move_catalog`, `sprite_urls_for`.

## PikalyticsService (`pikalytics_service.rs`)
- Scrapea la página `championstournaments/<species>` de Pikalytics.
- Enriquece sprites con `PokedexService` para canonical URLs.

## SetsService (`sets_service.rs`)
- Scrapea la página Commons de Pikalytics → `SetsBundle` (movesets + items + EVs típicos).

## TeamService (`team_service.rs`)
- Validación + persistencia vía `TeamRepo` (SQLite).

## TranslationsService (`translations_service.rs`)
- Carga CSVs de PokéAPI (abilities, moves, items) y los cachea como tabla bilingüe.

## UpcomingTournamentsService (`upcoming_tournaments_service.rs`)
- Limitless `list_all_vgc(100)` filtrado por ventana de 30 días hacia adelante.
- Suma eventos presenciales de Pokedata: por país (`_country/XX`) o global (sin `_country`, 2 páginas) cuando el filtro es "Todos".
- Suma el calendario oficial de Championship Series con ventana de 365 días: LAIC, NAIC, EUIC, Regionales, Especiales y Worlds. Los majors son globales y no se ocultan con el filtro país/ciudad; solo los eventos locales lo respetan.
- Enriquece en paralelo los majors dentro de 120 días con premio en efectivo y campeón/resultados; los más lejanos se muestran con fecha y sede sin bloquear la carga.
- Ordena por fecha/hora/nombre, deduplica por id y recorta a 200.
- `official_standings(url, start, size)` — standings Masters del endpoint oficial; el feed no incluye decklists.

## SyncManager (`sync_service.rs`)
- Sin dependencias de Tauri: recibe un `SyncEventSink` opcional desde el command.
- Genera código con alfabeto sin ambigüedades, token de 128 bits y ticket versionado.
- Servidor HTTP temporal de 300 s, un solo uso, token obligatorio, límite de 8 MiB.
- Mantiene el estado por sesión y expone `status`, `cancel` y `mark_imported`.
- Descubrimiento UDP en 47823 como fallback al QR.

## UpdaterService (`updater_service.rs`)

- `check()` lee `latest.json`, compara semver y extrae URL/firma/tamaño/SHA-256.
- `download_android_apk()` descarga en streaming a `.part`, informa progreso, atiende cancelación y solo renombra tras validar tamaño y SHA-256.
- El registro de descargas activas vive en el service; el command traduce el progreso a eventos Tauri.

## Utilidades

- **`date_window.rs`** — `default_window()` retorna ventana rolling de `LABMAUS_WINDOW_DAYS` (=14).
- **`usage_aggregator.rs`** — `aggregate(standings)` produce `MetaSnapshot`. Semántica **team-fraction** para `usage_percent`. De-dup por `canonical_id` por team. Normaliza nombres (`Wash-Rotom` → `Rotom Wash`).
