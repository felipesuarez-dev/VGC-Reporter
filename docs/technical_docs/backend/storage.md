# Backend — Storage

`src-tauri/src/storage/`. SQLite con `rusqlite` + pool `r2d2` (max 8 conexiones, WAL, FK on).

## db.rs
- `init_pool(path) -> DbPool`.
- Migraciones embebidas con `include_str!` y aplicadas en orden:
  - `001_init.sql` — esquema base (`api_cache`, `teams`, `team_members`, `settings`).
  - `002_clear_pikalytics_cache.sql` — invalidación puntual.
  - `003_invalidate_meta_and_labmaus_cache.sql` — invalidación tras cambio de regulación.

Regla: nunca editar `001`. Toda evolución es una nueva migración con `ALTER TABLE` o `DELETE` puntual.

## CacheRepo (`cache_repo.rs`)
Backing store de `HttpClient`.

- Tabla: `api_cache(url PRIMARY KEY, payload BLOB, expires_at INT)`.
- Métodos: `get(url)`, `put(url, payload, ttl_seconds)`, `purge_expired()`.

## TeamRepo (`team_repo.rs`)
Persistencia de equipos del usuario.

- Tablas:
  - `teams(id, name, format, notes, created_at, updated_at)`.
  - `team_members(team_id FK, slot, species, item, ability, nature, tera_type, move1..4, ev_hp/atk/def/spa/spd/spe)`.
- Métodos: `save(team)` (upsert), `list()`, `get(id)`, `delete(id)`.

## SettingsRepo (`settings_repo.rs`)
Key/value de configuración runtime.

- Tabla: `settings(key PRIMARY KEY, value TEXT)`.
- Métodos: `get(key)`, `set(key, value)`, `all()`.
- Usos típicos: `labmaus_name::reg-m-a`, `smogon_slug::reg-m-a`, idioma, formato favorito, fuente activa de torneos, tema.

## Cómo añadir un campo persistido

1. Nueva migración `00X_xxx.sql` con `ALTER TABLE`.
2. Incluirla en `db.rs` con `include_str!` y `execute_batch` en orden.
3. Actualizar el struct en `domain/`.
4. Actualizar la serialización en el repo.
5. `cargo test` para regenerar bindings ts-rs.
