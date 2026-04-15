# VGC-Reporter — Guía raíz

**Producto:** VGC-Reporter
**Versión:** 0.0.4.5.20260414
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

Ver sección 4 del plan en `C:\Users\felip\.claude\plans\adaptive-humming-snowflake.md` o la tabla del `README.md`. En resumen: Limitless VGC API (torneos reales), Pokémon Showdown (data), Smogon (usage ladder), PokéAPI (fallback sprites).

## Convenciones

- **Commits:** `[scope] mensaje corto` (ej. `[backend] add limitless_client`).
- **Código:** nada de comentarios que expliquen el *qué*; solo *por qué* cuando no es obvio.
- **Idioma UI:** claves en inglés (ej. `dashboard.top_pokemon`), traducidas vía `i18next` a ES/EN.
- **Errores:** `thiserror` en Rust, `Result<T, AppError>` en commands. El frontend los recibe como objetos serializados.
