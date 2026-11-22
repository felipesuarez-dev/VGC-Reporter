# Backend — Commands (IPC)

Handlers `#[tauri::command]` en `src-tauri/src/commands/`. Cada uno extrae `State<AppState>`, delega al service y devuelve `Result<T, AppError>`.

## Inventario

### `meta.rs`
- `get_meta_stats(format, tournament_count?) -> MetaSnapshot` — `MetaService::get_meta`.

### `champions.rs`
- `list_champions_tournaments(format?, limit?) -> ChampionsReport` — `ChampionsReportService::list_recent`.
- `get_tournament_standings(id) -> Vec<TournamentStanding>` — `ChampionsReportService::get_standings`.

### `top_teams.rs`
- `get_top_teams(format, limit?) -> TopTeamsReport` — `TopTeamsService::get_top_teams_report`.

### `pokedex.rs`
- `list_pokemon() -> Vec<Pokemon>`
- `search_pokemon(query?, type_filter?) -> Vec<Pokemon>`
- `get_pokemon(id) -> Pokemon`
- `list_items() -> Vec<String>`
- `list_moves() -> Vec<String>`
- `list_moves_for_species(species) -> Vec<MoveSummary>`
- `get_pokemon_sets(species) -> SetsBundle` — `SetsService::get_bundle`.
- `get_entity_descriptions() -> EntityDescriptions`
- `get_learnsets_index() -> HashMap<String, Vec<String>>`
- `get_move_catalog() -> HashMap<String, MoveSummary>`

### `teams.rs`
- `save_team(team) -> i64`
- `list_teams() -> Vec<Team>`
- `get_team(id) -> Team`
- `delete_team(id) -> ()`
- `import_showdown_text(text) -> Team` — `showdown_text::parse_team`.
- `export_team_to_showdown(team) -> String` — `showdown_text::format_team`.
- `validate_team(team, regulation) -> Vec<Violation>` — `regulations::rules_for_code`.

### `regulations.rs`
- `get_regulations() -> Vec<RegulationInfo>` — refresca el catálogo oficial/fuentes y devuelve la lista.
- `get_regulation_status() -> RegulationSyncStatus` — regulación activa, última sincronización, fuentes y warnings.
- `refresh_regulations(force?) -> Vec<RegulationInfo>` — refresco forzado; `force` ignora la caché HTTP.
- `get_allowed_species/items/moves(format) -> Vec<String>` — allow-lists del catálogo (estáticas o dinámicas).
- `get_regulation_news(force?) -> Vec<RegulationNewsItem>` — avisos oficiales de Pokémon Champions.
- `get_official_live_stream(force?) -> Option<OfficialLiveStream>` — directo VGC oficial; `None` si no hay.
- `validate_team` usa `rules_for_code`, que resuelve reglas dinámicas desde el catálogo.

### `trending.rs`
- `get_trending(format) -> TrendingReport` — `TrendingService::get_trending`.

### `pikalytics.rs`
- `get_pikalytics_entry(species, lang) -> PikalyticsEntry` — `PikalyticsService::get_entry`.

### `settings.rs`
- `get_settings() -> HashMap<String, String>` — `SettingsRepo::all`.
- `set_setting(key, value) -> ()` — `SettingsRepo::set`.

### `upcoming.rs`
- `list_upcoming_tournaments(country?) -> Vec<UpcomingTournament>` — `country` es un ISO de 2 letras o `None` para todos los países. Mezcla Limitless online + Pokedata presencial.

## Registro

Todos los commands se registran en `lib.rs` dentro de `tauri::generate_handler![...]`.

## Errores

El tipo de retorno **debe** ser `Result<T, AppError>` para que el frontend reciba `{ kind, message }`.

### sync.rs
- `sync_start_send(ui_json) -> SyncSession` - crea un servidor LAN temporal y devuelve QR/URL/código.
- `sync_fetch(url) -> SyncBundle` - descarga y valida un bundle por Rust/reqwest.
- `sync_import(bundle) -> SyncImportResult` - importa equipos y ajustes de la whitelist.

### updater.rs
- `check_for_app_update() -> Option<UpdateInfo>`.
- `download_android_update(url) -> String` - descarga el APK al cache para el instalador del sistema.


### sync.rs (0.6.0)
- `sync_start_send(ui_json) -> SyncSession`: crea un servidor HTTP temporal de 2 minutos, devuelve código de 8, URL con token y lanza un responder UDP en el puerto 47823.
- `sync_fetch(url) -> SyncBundle`: descarga y valida el bundle por Rust/reqwest (timeout 10s, máximo 2 MB).
- `sync_fetch_by_code(code) -> SyncBundle`: descubre la URL por broadcast UDP y luego descarga el bundle. Útil en desktop, que no puede escanear el QR del móvil.
- `sync_import(bundle) -> SyncImportResult`: valida todos los equipos antes de escribir, importa equipos y solo las claves de settings de la whitelist. El frontend decide renombrar/reemplazar/omitir conflictos antes de llamarlo.
