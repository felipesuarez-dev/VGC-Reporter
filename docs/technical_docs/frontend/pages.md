# Frontend — Pages

`frontend/src/pages/`. Una página por ruta, named export.

## Dashboard.tsx
Panel principal con tres vistas: **Métricas**, **Regulación** y **Novedades**.

- **Métricas**: rango de fechas con default de temporada, Top Pokémon (chart/grid/treemap/tier), top items/moves/abilities, trending, próximos torneos, Champions tournaments y links a fuentes.
- **Regulación**: `RegulationInfoView` con roster y objetos legales, uso %, sprites, descripciones y modales.
- **Novedades**: `RegulationFeed` con paneles drag-and-drop, live VGC, noticias y eventos.
- IPC: `getMetaStats`, `listChampionsTournaments`, `getTournamentStandings`, `getTrending`, `listUpcomingTournaments`, `getAllowedSpecies`, `getAllowedItems`.
- Stores: `dashboardStore` (formato, vista, filas/colapso del feed), `pokedexStore` (modal de detalle), `uiStore` (timezone/país de próximos).

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
Idioma, tema, tamaño de fuente, zona horaria global, país local, URL del directo VGC, formato favorito, regulaciones y overrides avanzados.

- IPC: `getSettings`, `setSetting`, `getRegulations`, `refreshRegulations`, `getRegulationStatus`.
- Stores: `dashboardStore` (favoriteFormat), `uiStore` (timeZone, homeCountry, fontSizePx).
