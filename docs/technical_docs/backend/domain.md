# Backend — Domain

`src-tauri/src/domain/`. Entidades puras. Sin I/O. Todas exportadas a TypeScript con `ts-rs`.

## Archivos

- **`pokemon.rs`** — `Pokemon`, `PokemonType` (Normal..Stellar), `Stats`. Entrada nacional con bases, tipos, abilities y URLs de sprite (primary/fallback/home).
- **`team.rs`** — `Team`, `TeamMember`, `TeamValidationError`. Validaciones: 252 EVs por stat, 508 totales, moves únicos (≤4), species no vacío.
- **`evs.rs`** — `EvSpread`. Constantes `EV_MAX_PER_STAT=252`, `EV_MAX_TOTAL=508`.
- **`format.rs`** — `Format` (`RegulationMA` activo, `RegulationI` reservado). Métodos: `cache_id`, `limitless_code`, `default_smogon_slug`, `default_labmaus_name`, `rating_ladder`.
- **`nature.rs`** — `Nature` (Adamant, Timid, ...).
- **`tera_type.rs`** — `TeraType` (18 + Stellar).
- **`ability.rs`** — `Ability { name, description }`.
- **`item.rs`** — `Item { name, description }`.
- **`move_.rs`** — `Move`, `MoveSummary`, `MoveCategory` (Physical/Special/Status).
- **`usage_stats.rs`** — `MetaSnapshot`, `PokemonUsage`, `TeammateUsage`, `MovesetUsage`, `UsageEntry`, `MoveUsage`, `TeraUsage`. Output del aggregator.
- **`champions.rs`** — `ChampionsReport`, `ChampionsTournament`, `TournamentStanding`, `DecklistPokemon`.
- **`trending.rs`** — `TrendingReport`, `TrendingPokemon`. Incluye `window_days` con `serde(default)` por compatibilidad de cache.
- **`pikalytics.rs`** — `PikalyticsEntry`, `PikalyticsEvSpread`, `PikalyticsItem`, `PikalyticsTeammate`.
- **`upcoming.rs`** — `UpcomingTournament` (nombre, fecha, organizer, players).
- **`sets.rs`** — `PokemonSet`, `SetsBundle`. Sets curados de Pikalytics Commons.

## Convenciones

- Cada struct/enum exportado lleva:
  ```rust
  #[derive(serde::Serialize, serde::Deserialize, ts_rs::TS)]
  #[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
  ```
- `serde(default)` en campos remotos opcionales para tolerar evoluciones de API.
- Validaciones del dominio viven aquí (ej. `Team::validate`, `EvSpread::is_valid`), no en `services/`.
