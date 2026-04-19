# Pipeline — Top Pokémon (Meta Snapshot)

## Entrada
Command `get_meta_stats(format, tournament_count?)` — `src-tauri/src/commands/meta.rs:8`.
Delegado a `MetaService::get_meta` — `services/meta_service.rs`.

## Cadena de fuentes

### 1. Primario — Labmaus (Regulation M-A)
`MetaService::build_from_labmaus`:

- `LabmausClient::get_discover_teams(from, to, regulation)` con ventana de **14 días rolling** (`config::LABMAUS_WINDOW_DAYS=14`, `services/date_window.rs::default_window`).
- Para cada team con `pokepaste_url`, resuelve el decklist con `PokepasteClient::get_team` (cache 30 días, pastes inmutables). Concurrencia 16 vía `futures::future::join_all`.
- Convierte cada team en `LimitlessStanding` (`standings_from_labmaus`) y pasa al aggregator.

### 2. Fallback — Limitless
`list_tournaments_by_format(format, limit)` ya aplica `filter_champions` + `players > 0`. Para cada torneo, `get_standings(id)`. Resultados → `usage_aggregator::aggregate`.

### 3. Último fallback — Smogon chaos JSON
`SmogonClient::fetch_chaos_for_format` resuelve slug, descarga JSON y lo convierte vía `snapshot_from_smogon`.

`tracing::info!` reporta la fuente final: `labmaus` / `limitless` / `limitless-thin` / `smogon`.

## Aggregator (`services/usage_aggregator.rs`)

- **Semántica**: `usage_percent(X) = teams_que_usan_X_al_menos_una_vez / total_teams * 100`. Es **team-fraction**, no pick-fraction.
- **De-dup por team**: `seen_on_team: HashSet<canonical_id>`. Un equipo con dos formes de Rotom cuenta una sola vez.
- **Normalización de nombres**:
  - `canonical_id("Wash-Rotom") -> "rotomwash"` (de-dup + sprite slug).
  - `canonical_display_name("Wash-Rotom") -> "Rotom-Wash"` (display).
  - Ambas en `adapters/sprite_resolver.rs`.
- **Sort**: descendente por `usage_percent`.
- **Top items / moves / abilities / tera**: también team-fraction (commit `3cb0e99`).

## Auditoría — por qué difieren los números con fuentes externas

| Fuente | Métrica | Conclusión |
|---|---|---|
| **Pikalytics** | Showdown ladder (miles de batallas/día) | Métrica fundamentalmente distinta: ladder ≠ torneo. |
| **Labmaus dashboard** | Puede usar otra ventana (mensual) o filtros distintos | Mismo dataset que nosotros, pero ventana diferente. |
| **Limitless web** | Todos los torneos VGC | Incluye regulations viejas y formatos no-Champions. |
| **VGC-Reporter** | Champions M-A, ventana 14d, top-cut con decklist | Subset estrictamente más pequeño. |

**Conclusión**: el cálculo es correcto dentro de su definición. Las diferencias son por scope de fuente y ventana, no por bug.

## Tests relevantes

- `usage_aggregator.rs:411-463` — normalización Wash-Rotom.
- `champions_report_service.rs::tests` — sprite injection y filtros de decklist.

## Ventana

`services/date_window.rs::default_window()` retorna `(now - 14d, now)` UTC.

## Observabilidad

`tracing::info!` con la fuente y `tracing::warn!` cuando un fetch de standings/pokepaste falla (no aborta el batch).
