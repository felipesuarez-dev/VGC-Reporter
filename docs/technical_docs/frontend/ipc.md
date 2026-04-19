# Frontend — IPC, queryKeys, ts-rs

## ipc.ts

`frontend/src/lib/ipc.ts` es el único punto que llama `invoke()`. Cada método queda tipado con los structs generados por `ts-rs`.

Inventario:

- **Meta / trends**: `getMetaStats`, `getTrending`.
- **Pokédex**: `listPokemon`, `searchPokemon`, `getPokemon`, `getEntityDescriptions`, `getLearnsetsIndex`, `getMoveCatalog`, `getPokemonSets`, `getPikalyticsEntry`, `listItems`, `listMoves`, `listMovesForSpecies`.
- **Teams**: `saveTeam`, `listTeams`, `getTeam`, `deleteTeam`, `importShowdownText`, `exportTeamToShowdown`, `validateTeam`.
- **Tournaments**: `getTopTeams`, `listChampionsTournaments`, `getTournamentStandings`, `listUpcomingTournaments`.
- **Settings**: `getSettings`, `setSetting`, `getTranslationTable`.

Regla: si necesitas un command nuevo, añádelo primero en Rust, regenera bindings y luego expón el método aquí.

## queryKeys.ts

`frontend/src/lib/queryKeys.ts`. Factory central de claves de TanStack Query. **Nunca** inlinear arrays — la invalidación tiene que coincidir exactamente.

Claves típicas:

- `meta(format, tournamentCount)`
- `pokedex.all`, `pokedex.search(query, type)`, `pokedex.detail(id)`
- `teams.list`, `teams.detail(id)`
- `topTeams(format, limit)`
- `championsReport(format, limit)`, `tournamentStandings(id)`
- `trending(format)`
- `pikalyticsEntry(species, lang)`
- `sets(species)`
- `learnsetsIndex`, `moveCatalog`, `entityDescriptions`
- `upcomingTournaments`, `settings`, `translationTable`

## ts-rs

- Source of truth: `src-tauri/src/domain/*` con `#[derive(ts_rs::TS)]` y `#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]`.
- Regenerar: `cd src-tauri && cargo test`.
- `frontend/src/lib/types.ts` es la fachada que re-exporta y añade helpers/constantes (`emptyTeam`, `isBannedInFormat`, `generationOf`, `ALL_TYPES`, `ALL_NATURES`).
- **Nunca** editar `types.generated.ts` a mano.

## Añadir un IPC nuevo

1. Crear el command en Rust (ver `backend/commands.md`).
2. `cargo test` para regenerar tipos.
3. Añadir el método en `ipc.ts` con su tipo de retorno.
4. Añadir entry en `queryKeys.ts`.
5. Consumir con `useQuery` / `useMutation` en la página.
