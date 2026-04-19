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

### `trending.rs`
- `get_trending(format) -> TrendingReport` — `TrendingService::get_trending`.

### `pikalytics.rs`
- `get_pikalytics_entry(species, lang) -> PikalyticsEntry` — `PikalyticsService::get_entry`.

### `settings.rs`
- `get_settings() -> HashMap<String, String>` — `SettingsRepo::all`.
- `set_setting(key, value) -> ()` — `SettingsRepo::set`.

### `upcoming.rs`
- `list_upcoming_tournaments() -> Vec<UpcomingTournament>` — `UpcomingTournamentsService::list_upcoming`.

## Registro

Todos los commands se registran en `lib.rs` dentro de `tauri::generate_handler![...]`.

## Errores

El tipo de retorno **debe** ser `Result<T, AppError>` para que el frontend reciba `{ kind, message }`.
