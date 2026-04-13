# VGC-Reporter

**Versión:** 0.0.1.20260412
**Autor:** PumaSoft

Aplicación de escritorio (Tauri 2 + Rust + React) para consultar estadísticas competitivas de **Pokémon Champions** (VGC 2026, Regulation M-A) y construir tus propios equipos.

## Características

- **Dashboard meta**: top Pokémon, items, movimientos y Tera types del formato Regulation M-A, calculados sobre torneos reales de Limitless VGC.
- **Pokédex** con búsqueda y filtros (nombre, tipo, porcentaje de uso).
- **Team Builder** completo: 6 Pokémon con movimientos, item, habilidad, naturaleza, EVs y Tera type.
- **Mis equipos**: guardado local en SQLite con editar/duplicar/eliminar.
- **Top Teams**: equipos populares del meta como mini-grid de 6 sprites.
- **Damage Calculator** integrado con `@smogon/calc`.
- **Bilingüe**: toggle ES/EN en cualquier momento.

## Stack

- **Backend:** Rust + Tauri 2.4, reqwest, rusqlite, thiserror, ts-rs
- **Frontend:** React 19 + TypeScript + Vite + TailwindCSS + shadcn/ui + TanStack Query + Zustand + Recharts + i18next

## Fuentes de datos

- [Limitless VGC API](https://play.limitlesstcg.com/api/) — torneos, standings, decklists reales
- [Pokémon Showdown](https://play.pokemonshowdown.com/data/) — Pokédex, moves, items, abilities, sprites
- [Smogon Usage Stats](https://www.smogon.com/stats/) — complemento ladder
- [pkmn/smogon data](https://data.pkmn.cc/) — sets curados
- [PokéAPI](https://pokeapi.co/) — fallback de sprites

## Ejecutar en desarrollo

```bash
npm install
npm run tauri:dev
```

## Build de producción

```bash
npm run tauri:build
```

El instalador MSI queda en `src-tauri/target/release/bundle/msi/`.

## Arquitectura

```
VGC-Reporter/
  frontend/      # React 19 + TS + Vite
  src-tauri/     # Rust backend con clean architecture
    src/
      domain/    # Entidades puras
      services/  # Casos de uso
      adapters/  # Clientes HTTP
      storage/   # SQLite repos
      commands/  # Tauri IPC
```

Ver `CLAUDE.md`, `frontend/CLAUDE.md` y `src-tauri/CLAUDE.md` para detalles.

## Licencia

MIT © PumaSoft 2026
