# VGC-Reporter — Guía raíz

**Producto:** VGC-Reporter
**Versión:** 0.1.10.20260425-beta
**Autor:** PumaSoft

Aplicación Tauri 2 + Rust + React para estadísticas competitivas de Pokémon Champions (VGC 2026, Regulation M-A) y construcción de equipos propios.

## Documentación por capa

- **Backend (Rust):** `src-tauri/CLAUDE.md` — clean architecture, cómo añadir un command, errores, migraciones.
- **Frontend (React):** `frontend/CLAUDE.md` — rutas, IPC tipado, i18n, stores, shadcn.

## Filosofía

- **Simple, limpio, funcional.** Nada de sobre-ingeniería.
- **Clean architecture** en Rust: `domain` ← `services` ← `adapters` / `storage` ← `commands`. La dependencia apunta hacia el centro.
- **Frontend delgado**: todo fetching HTTP vive en Rust. El frontend solo llama `invoke()`.
- **Tipos sincronizados** automáticamente con `ts-rs` (nunca duplicar manualmente).
- **Multi-formato extensible, Regulation M-A activo**: el enum `Format` queda preparado, pero solo `RegulationMA` es seleccionable en UI.

## Comandos

```bash
# Dev (arranca frontend Vite + ventana Tauri)
npm run tauri:dev

# Build de producción (MSI en src-tauri/target/release/bundle/msi/)
npm run tauri:build

# Tests backend
cd src-tauri && cargo test

# Regenerar tipos TS desde Rust (ts-rs)
cd src-tauri && cargo test export_bindings

# Lint backend
cd src-tauri && cargo fmt && cargo clippy -- -D warnings

# Frontend dev sin Tauri
cd frontend && npm run dev
```

## Estructura

```
VGC-Reporter/
  CLAUDE.md                 <- este archivo
  README.md
  package.json              <- workspace raíz
  frontend/                 <- React 19 + TS + Vite
    CLAUDE.md
  src-tauri/                <- Rust
    CLAUDE.md
    Cargo.toml
    tauri.conf.json
    src/
      domain/               <- entidades puras
      services/             <- casos de uso
      adapters/             <- HTTP clients
      storage/              <- SQLite
      commands/             <- Tauri IPC
```

## Fuentes de datos externas

Tabla completa en `README.md`. Resumen:

- **Labmaus** — primario para top teams, meta snapshot, trending y próximos torneos (Regulation M-A). Exige `Origin`/`Referer` en cada request; el `HttpClient` los inyecta para que no se filtren a otros hosts.
- **Limitless VGC API** — torneos Champions + standings + decklists inline.
- **Pokémon Showdown** — Pokédex, moves, items, abilities, sprites base.
- **Smogon chaos JSON** — fallback de usage ladder cuando el formato es muy nuevo.
- **pkmn/smogon data** — sets competitivos curados (Doubles + Singles).
- **Pikalytics** — breakdown por especie (items, abilities, moves, Tera, compañeros, EV spreads) dentro del detalle de Pokémon.
- **Pokepaste** — importación de equipos pegados; cache de 30 días (pastes inmutables).
- **PokéAPI CSV** — nombres y flavor text bilingüe (EN/ES).

Todo el fetching pasa por `HttpClient::get_cached` (SQLite TTL). No añadir `reqwest::Client::new()` directo en un service.

## Convenciones

- **Commits:** `[scope] mensaje corto` (ej. `[backend] add limitless_client`).
- **Código:** nada de comentarios que expliquen el *qué*; solo *por qué* cuando no es obvio.
- **Idioma UI:** claves en inglés (ej. `dashboard.top_pokemon`), traducidas vía `i18next` a ES/EN.
- **Errores:** `thiserror` en Rust, `Result<T, AppError>` en commands. El frontend los recibe como objetos serializados.

## Releases

Al crear un release, actualizar la versión en todos los sitios correspondientes (ver tabla abajo), hacer tag con el formato `vX.Y.Z.YYYYMMDD-beta` y push.

El workflow `release.yml` **auto-genera el body del release a partir de los commits entre el tag anterior y el nuevo**:
- Lee `git log <prev_tag>..<new_tag> --pretty=%s` y descarta los commits con scope `[release]` y `[ci]`.
- Si el subject contiene `fix`/`bug`/`hotfix`/`resolve` (case-insensitive) → va a **Fixes**. Cualquier otro commit → **Changes**.
- El body resultante se usa tanto como cuerpo del GitHub Release como en el campo `notes` de `latest.json` (lo que ve el usuario en el modal de actualización).

Si quieres editar el body a mano antes de publicar (o después), `sync-release-notes.yml` se dispara automáticamente en `release: published` y `release: edited`, y vuelve a copiar el body actual del release al `notes` de `latest.json`. También se puede disparar manualmente desde **Actions → Sync Release Notes to latest.json → Run workflow** (sin tag = usa el último release).

Para que la auto-generación produzca un body limpio, los mensajes de commit deben seguir la convención `[scope] verbo en infinitivo descripción`. Idealmente:

### Formato del body (auto-generado o manual)

```markdown
## Changes

- Add <feature nueva>
- Update <mejora existente>
- Improve <enhancement>

## Fixes

- Fix <bug específico>
- Resolve <issue específico>
```

Reglas:
- Cada bullet empieza con un **verbo en infinitivo en inglés** (`Add`, `Update`, `Improve`, `Fix`, `Resolve`, `Refactor`, `Remove`).
- Una línea por cambio, concisa pero específica (no "various fixes" — describir cada uno).
- Si hubo PRs mergeados, mencionar `(#123)` al final del bullet.
- **Omitir** la sección entera si no hay items (no dejar `## Fixes` vacío).
- **Nunca** incluir comentarios HTML placeholder (`<!-- ... -->`), notas de plataforma, instrucciones de descarga ni texto sobre auto-update — todo eso vive en el README.

### Ejemplo válido

```markdown
## Changes

- Add auto-update functionality to the mobile application
- Update and improve documentation

## Fixes

- Fix tag versioning
- Improve version labels and release notes for better user experience when reviewing changes
```

### Dónde actualizar la versión

| Archivo | Campo |
|---------|-------|
| `src-tauri/tauri.conf.json` | `"version"` |
| `src-tauri/Cargo.toml` | `version` (línea 3) |
| `frontend/src/lib/version.ts` | `APP_VERSION` |
| `package.json` (raíz) | `"version"` |
| `frontend/package.json` | `"version"` |
| `README.md` | badge `[version-badge]` + tabla de descarga |
| `CLAUDE.md` (este archivo) | `**Versión:**` en el encabezado |
