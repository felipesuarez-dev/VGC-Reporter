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
