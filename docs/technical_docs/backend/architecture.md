# Backend — Arquitectura

Rust sobre Tauri 2.4. Clean architecture en cuatro capas, con la regla "las flechas siempre apuntan al centro":

```
commands/  →  services/  →  domain/
                 ↑
            adapters/  +  storage/
```

## Capas

- **`domain/`** — entidades puras (`Pokemon`, `Team`, `EvSpread`, `Format`, `Nature`, `MetaSnapshot`, `ChampionsReport`...). Sin I/O. Solo `serde`, `chrono`, `ts-rs`.
- **`services/`** — casos de uso (`MetaService`, `TopTeamsService`, `ChampionsReportService`, `TrendingService`, `PokedexService`, `TeamService`...). Reciben adapters y repos por `Arc`. No saben nada de Tauri.
- **`adapters/`** — clientes HTTP (`HttpClient`, `LimitlessClient`, `LabmausClient`, `ShowdownClient`, `SmogonClient`, `PokepasteClient`, `PikalyticsClient`, `PokeApiClient`) y `sprite_resolver`.
- **`storage/`** — pool `r2d2` sobre SQLite (`bundled`), migraciones embebidas con `include_str!`, repos `TeamRepo`, `CacheRepo`, `SettingsRepo`.
- **`commands/`** — handlers `#[tauri::command]` *delgados*: extraen `State<AppState>`, delegan al service, devuelven `Result<T, AppError>`.

## AppState

Construido en `bootstrap`/`lib.rs`. Contiene los services compartidos como `Arc`. Cada command los obtiene con `state: State<AppState>`.

## Errores

`error::AppError` (con `thiserror`) cubre `Http`, `Db`, `Io`, `Serde`, `NotFound`, `Validation`, `Internal`. Implementa `serde::Serialize` con forma `{ kind, message }` para que el frontend reciba un objeto consistente.

Regla: nada de `unwrap()` ni `expect()` fuera de `bootstrap`/`main`.

## Tipos compartidos con el frontend

Todo struct/enum en `domain/` lleva:

```rust
#[derive(ts_rs::TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
```

Regenerar con `cd src-tauri && cargo test`.

## Concurrencia

`futures::future::join_all` se usa en pipelines pesados (Pokepaste, standings de Champions, top teams) para paralelizar fetches sobre el pool reqwest.

## Observabilidad

`tracing::debug!` / `tracing::info!` / `tracing::warn!`. Nada de `println!`.
