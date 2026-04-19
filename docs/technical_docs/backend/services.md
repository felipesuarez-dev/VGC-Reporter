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
- `get_standings`: descarga estandarte raw, recolecta nombres únicos, los resuelve en batch vía `PokedexService::sprite_urls_for`, mapea a `TournamentStanding` con sprites inyectados.

## TrendingService (`trending_service.rs`)
- Resuelve nombre Labmaus desde `SettingsRepo` o default del `Format`.
- Divide ventana en dos mitades de 7 días (`prev` vs `curr`).
- Pesos por placement: top 8 → 3.0, 9–32 → 2.0, resto → 1.0.
- Score: delta porcentual + log-ratio momentum con shrinkage Bayesiano (`config::TRENDING_BAYES_K`).
- Top 15 rising y top 15 falling.

## PokedexService (`pokedex_service.rs`)
- Carga Showdown pokedex.json + descripciones.
- Merge con PokéAPI CSV bilingüe (ES/EN).
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
- Limitless `list_all_vgc(100)` filtrado por ventana 14 días hacia adelante.

## Utilidades

- **`date_window.rs`** — `default_window()` retorna ventana rolling de `LABMAUS_WINDOW_DAYS` (=14).
- **`usage_aggregator.rs`** — `aggregate(standings)` produce `MetaSnapshot`. Semántica **team-fraction** para `usage_percent`. De-dup por `canonical_id` por team. Normaliza nombres (`Wash-Rotom` → `Rotom Wash`).
