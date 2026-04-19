# Documentación VGC-Reporter

Aplicación de escritorio (Tauri 2 + Rust + React) para estadísticas de Pokémon VGC Champions (Regulation M-A) y construcción de equipos.

Esta carpeta tiene dos secciones:

- [`technical_docs/`](./technical_docs/README.md) — para desarrolladores: arquitectura, servicios, adapters, pipelines, comandos IPC.
- [`user_docs/`](./user_docs/README.md) — para el usuario final, en español, una guía por módulo de la aplicación.

## Resumen de un vistazo

- **Backend**: Rust + Tauri 2.4. Clean architecture (`domain` ← `services` ← `adapters`/`storage` ← `commands`).
- **Frontend**: React 19 + TypeScript + Vite + Tailwind. Sólo consume IPC tipado (nunca HTTP directo).
- **Datos**: Labmaus (primario), Limitless (fallback), Smogon, Pokepaste, Pikalytics, Showdown, PokéAPI.
- **Cache**: SQLite con TTL por endpoint.
- **Tipos compartidos**: generados con `ts-rs` desde Rust hacia `frontend/src/lib/types.generated.ts`.

Para empezar a contribuir: `npm run tauri:dev`.
