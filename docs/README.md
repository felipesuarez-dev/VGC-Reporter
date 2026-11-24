# Documentación VGC-Reporter

Versión **0.7.0.20261123-beta**.

Aplicación nativa (Tauri 2 + Rust + React) para estadísticas de Pokémon VGC Champions (regulación activa) y construcción de equipos. Disponible en **desktop** (Windows) y **Android** (APK, API 24+).

Esta carpeta tiene dos secciones:

- [`technical_docs/`](./technical_docs/README.md) — para desarrolladores: arquitectura, servicios, adapters, pipelines, comandos IPC.
- [`user_docs/`](./user_docs/README.md) — para el usuario final, en español, una guía por módulo de la aplicación.

## Resumen de un vistazo

- **Backend**: Rust + Tauri 2.10. Clean architecture (`domain` ← `services` ← `adapters`/`storage` ← `commands`).
- **Frontend**: React 19 + TypeScript + Vite + Tailwind. Sólo consume IPC tipado (nunca HTTP directo). Responsive: mismo codebase para desktop y Android.
- **Datos**: avisos oficiales de Pokémon HOME (calendario y roster), Labmaus (primario de torneos), Limitless (fallback), Pokedata (eventos presenciales), YouTube de Play! Pokémon (directo VGC), Smogon, Pokepaste, Pikalytics, Showdown, PokéAPI.
- **Cache**: SQLite con TTL por endpoint.
- **Tipos compartidos**: generados con `ts-rs` desde Rust hacia `frontend/src/lib/types.generated.ts`.

Para empezar a contribuir en desktop: `bun run tauri:dev` (este proyecto usa **Bun** exclusivamente: `bun install`, `bun run`, `bunx`; nada de `npm`/`npx`).
Para Android: ver [`technical_docs/frontend/architecture.md`](./technical_docs/frontend/architecture.md#mobile-android).
