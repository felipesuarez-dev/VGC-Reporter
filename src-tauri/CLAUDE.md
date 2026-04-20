# src-tauri — Backend Rust

Backend de VGC-Reporter escrito en Rust sobre Tauri 2.4. Arquitectura limpia en 4 capas.

## Capas (regla: las flechas apuntan siempre al centro)

```
commands/  →  services/  →  domain/
                ↑
            adapters/  +  storage/
```

- **`domain/`** — entidades puras (Pokemon, Team, EvSpread, Format, Nature, UsageStats). **Sin I/O, sin dependencias externas fuera de serde/chrono/ts-rs.** Contiene validaciones del dominio (`Team::validate`, `EvSpread::is_valid`).
- **`services/`** — casos de uso (`MetaService`, `PokedexService`, `TeamService`, `TopTeamsService`). Reciben adapters y repos por valor/Arc. No saben nada de Tauri.
- **`adapters/`** — clientes HTTP (`LimitlessClient`, `ShowdownClient`, `SmogonClient`), `HttpClient` compartido con cache SQLite, y `sprite_resolver` para URLs de sprites.
- **`storage/`** — pool `r2d2` sobre SQLite (bundled), migraciones embebidas con `include_str!`, repositorios `TeamRepo`, `CacheRepo`, `SettingsRepo`.
- **`commands/`** — handlers `#[tauri::command]` *delgados*: extraen `State<AppState>`, delegan al service, devuelven `Result<T, AppError>`.

## Añadir un command

1. Si es nuevo caso de uso, crear método en el service correspondiente (o un service nuevo en `services/`).
2. Añadir archivo en `commands/` con `#[tauri::command] pub async fn ...`.
3. Registrarlo en `lib.rs` dentro de `tauri::generate_handler![...]`.
4. El tipo de retorno **debe** ser `Result<T, AppError>` para serializar el error al frontend.

## Añadir una regulación nueva

`services/regulations/` aloja un trait `RegulationRules` (`code`, `validate_team`, `allowed_species`, `allowed_items`, `allowed_moves`) y un registry `rules_for_code()`. Para añadir una regulación:

1. Crear `services/regulations/reg_xx.rs` con un struct que implemente `RegulationRules`. Reusar `regulations::common::{canonical, lookup_set}` para normalizar nombres y construir los `HashSet<String>` de allow-list.
2. Si las listas son grandes (cientos de entradas), partirlas en `reg_xx_species.rs`/`reg_xx_items.rs`/`reg_xx_moves.rs` (mismo patrón que Reg M-A).
3. Añadir el código en el match de `rules_for_code()` y declarar el módulo en `regulations/mod.rs`.
4. Añadir la variante a `Format` en `domain/format.rs` y al mapeo `cache_id() ↔ código de regulación`. Regenerar bindings con `cargo test`.

Los tres commands `get_allowed_{species,items,moves}` ya consumen el registry — no hace falta tocarlos.

## Añadir un campo persistido

1. Nueva migración en `storage/migrations/00X_xxx.sql` (usar `ALTER TABLE`; nunca editar 001).
2. Incluirla en `storage/db.rs` con `include_str!` y `execute_batch` en orden.
3. Actualizar el struct de dominio en `domain/`.
4. Actualizar serialización en el repo correspondiente.
5. Correr `cargo test` para regenerar bindings ts-rs.

## Errores

`error::AppError` (thiserror) cubre: `Http`, `Db`, `Io`, `Serde`, `NotFound`, `Validation`, `Internal`. Implementa `serde::Serialize` con forma `{ kind, message }` para el frontend.

No usar `unwrap()` ni `expect()` fuera de `bootstrap` / `main`.

## Tipos TypeScript

Todos los structs/enums en `domain/` llevan `#[derive(ts_rs::TS)]` con `#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]`.

Regenerar:

```bash
cd src-tauri && cargo test
```

## Tests

- `cargo test` corre tests unitarios (validación EVs, validación team, sprite resolver).
- Tests de services deben inyectar dummies/mocks construidos directamente sin red.
- Evitar hits HTTP reales en tests — si se necesita, usar feature `live-net` y marcarlos `#[ignore]`.

## Fuentes de datos

Ver `config.rs`. Todo fetching pasa por `HttpClient::get_cached` (SQLite TTL). No añadir `reqwest::Client::new()` directo en un service.

## Convenciones

- Funciones públicas documentadas con `///` cuando no sean triviales.
- `tracing::debug!`/`warn!` para observabilidad, no `println!`.
- `serde(default)` en campos remotos opcionales para tolerar cambios de API.
- Nada de comentarios explicando el "qué"; solo el "por qué" si no es obvio.
