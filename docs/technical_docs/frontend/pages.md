# Frontend — Pages

`frontend/src/pages/`. Una página por ruta, named export.

## Dashboard.tsx
Panel principal. Top Pokémon (chart + paginación), top items/moves/abilities/tera, trending, próximos torneos, Champions tournaments, links a fuentes externas (Labmaus, Limitless, Pikalytics).

- IPC: `getMetaStats`, `listChampionsTournaments`, `getTournamentStandings`, `getTrending`, `listUpcomingTournaments`.
- Stores: `dashboardStore` (formato), `pokedexStore` (modal de detalle).

## Pokedex.tsx
Pokédex completa con filtros: búsqueda por nombre, tipo, ability, move, generación, weak/strong matchups. Sort por usage / generación / alfabético.

- IPC: `listPokemon`, `searchPokemon`, `getPokemon`, `getPokemonSets`, `getLearnsetsIndex`, `getMoveCatalog`, `getPikalyticsEntry`.
- Stores: `pokedexStore` (sort, modal target, scrollY), `dashboardStore` (formato).

## TeamBuilder.tsx
Formulario de 6 miembros con EVs, naturaleza, item, ability, tera, moves. Importar/exportar Showdown text. Validación contra la regulación.

- IPC: `saveTeam`, `getTeam`, `importShowdownText`, `exportTeamToShowdown`, `validateTeam`, `listMoves`, `listMovesForSpecies`, `listPokemon`, `listItems`.
- Stores: `teamBuilderStore` (draft, pendingImport).

## MyTeams.tsx
Listado de equipos guardados como cards. Acciones: editar, borrar, crear nuevo.

- IPC: `listTeams`, `deleteTeam`.

## TopTeams.tsx
Equipos campeones filtrables por Pokémon, torneo y país. Recientes torneos expandibles, modal de detalle por equipo (con export Showdown).

- IPC: `getTopTeams`, `listChampionsTournaments`, `getTournamentStandings`.

## DamageCalc.tsx
Calculadora de daño (`@smogon/calc` Gen 9) con clima, terreno y modificadores de stats.

- IPC: `listPokemon`, `listMovesForSpecies`, `listItems`.

## Settings.tsx
Idioma, formato favorito, modal de "Acerca de", links externos.

- IPC: `getSettings`, `setSetting`.
- Stores: `dashboardStore` (favoriteFormat).
