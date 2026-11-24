# Frontend — Pages

`frontend/src/pages/`. Una página por ruta, named export.

## Dashboard.tsx
Panel principal con cuatro vistas: **Novedades**, **Torneos**, **Métricas** y **Regulación**.

- **Novedades**: `RegulationFeed` con resumen de regulación, live VGC y noticias oficiales.
- **Torneos**: `TournamentsView` con Próximos torneos (paginador independiente de 10 por grupo y grupos colapsables), Torneos recientes (mismo componente que Top Teams, con card completa, filtros y 10 + 10) y Calendario (6 por grupo del día). Los oficiales abren un modal con Top Cut con líneas, rondas, divisiones y equipos PokéBase/PokéData.
- **Métricas**: rango de fechas con default de temporada, Top Pokémon (chart/grid/treemap/tier), top items/moves/abilities, trending y links a fuentes. Sin Próximos torneos.
- **Regulación**: `RegulationInfoView` con roster y objetos legales, uso %, sprites, descripciones y modales.
- Las cuatro vistas usan el mismo `PanelBoard` (Separados/Juntos, drag & drop, colapsables y persistencia).
- IPC: `getMetaStats`, `listChampionsTournaments`, `getTournamentStandings`, `getTrending`, `listUpcomingTournaments`, `getOfficialTournamentStandings`, `getOfficialTournamentTeams`, `getOfficialTournamentDetail`, `getAllowedSpecies`, `getAllowedItems`.
- Stores: `dashboardStore` (formato, vista y filas/colapsos por vista), `pokedexStore`, `uiStore` (timezone/país de próximos, widgets y tablas).

## Learn.tsx
Página **Aprender** (`/learn`): hero con progreso persistido, equipos iniciales desde Top Teams, práctica de 10 preguntas/día (`lib/learn/practice.ts`), trivia ampliada, 11 arquetipos con “Probar core” dinámico, 12 guías, glosario de 80+ términos con modal e índice, y 6 cards de insights con muestra/confianza. Usa `getMetaStats`, `getTrending`, `listPokemon`, `getTopTeams` y `useTeamBuilder`.

## Pokedex.tsx
Pokédex rediseñada con filtros: búsqueda por nombre, tipo, ability, move, generación, weak/strong matchups; chips de filtros activos y contador de resultados. Sort por usage / generación / alfabético. Al cambiar el orden, la cuadrícula se atenúa y muestra un spinner hasta que las cards se reordenan; la actualización de la store se difiere un frame para que el estado de carga se pinte. Sin bloque de QuickTables.

- IPC: `listPokemon`, `searchPokemon`, `getPokemon`, `getPokemonSets`, `getLearnsetsIndex`, `getMoveCatalog`, `getPikalyticsEntry`.
- Stores: `pokedexStore` (sort, modal target, scrollY), `dashboardStore` (formato).

## TeamBuilder.tsx
Formulario de 6 miembros con pestañas **Champions/Showdown**. Showdown usa EVs/IVs; Champions usa 66 Stat Points (32 por stat), IVs 31 y nivel 50; al cambiar de modo se convierten evs/stat_points. El valor interno `BuildMode::Classic` se conserva para no romper equipos guardados. Importar/exportar Showdown text. Validación contra la regulación.

- IPC: `saveTeam`, `getTeam`, `importShowdownText`, `exportTeamToShowdown`, `validateTeam`, `listMoves`, `listMovesForSpecies`, `listPokemon`, `listItems`.
- Stores: `teamBuilderStore` (draft, pendingImport).

## MyTeams.tsx
Listado de equipos guardados como cards. Acciones: editar, duplicar (clon con `id=null` y nombre localizado), borrar con `DeleteTeamConfirmModal`, crear nuevo.

- IPC: `listTeams`, `saveTeam`, `deleteTeam`.

## TopTeams.tsx
Equipos campeones filtrables por Pokémon, torneo y país. La sección de recientes reutiliza `RecentTournamentsSection` (mismo comportamiento que Panel → Torneos), más el modal de detalle por equipo con export Showdown. El proveedor **Oficial** consulta `listChampionsTournaments` + `getOfficialTournamentTeams` para los últimos cuatro eventos oficiales, mapea los Top 8 de PokéBase a `TopTeam` y los marca con `official: true`; **Todas las fuentes** antepone hasta 8 oficiales. Esas consultas usan `queryKeys.championsReport` y `queryKeys.officialTeams`. La línea de `SourcesChip` incluye **Oficial** (`includeOfficial`). El filtro local usa solo los países de los equipos de comunidad y exige 3 filas: un Top 8 oficial no activa el filtro ni oculta la lista comunitaria.

- IPC: `getTopTeams`, `listChampionsTournaments`, `getOfficialTournamentTeams`, `getTournamentStandings` (a través del componente compartido).

## DamageCalc.tsx
Calculadora de daño (`@smogon/calc` Gen 9) con clima, terreno y modificadores de stats.

- IPC: `listPokemon`, `listMovesForSpecies`, `listItems`.

## Settings.tsx
Idioma, tema, tamaño de fuente, zona horaria global, país local, widgets, tablas rápidas, pantallas en vivo, formato favorito, regulaciones, sync y overrides avanzados. Todos los grupos y cards son colapsables (`settingsCollapsed`), con Expandir/Contraer todo.

- IPC: `getSettings`, `setSetting`, `getRegulations`, `refreshRegulations`, `getRegulationStatus`.
- Stores: `dashboardStore` (favoriteFormat), `uiStore` (timeZone, homeCountry, fontSizePx, settingsCollapsed, floatingWidgetsGrouped, calendarMode, quickTablesMode, mobileNavEnabled).


## Pokedex, tablas y próximos

- `Pokedex.tsx` ya no monta `QuickTables`; las tablas viven en el dock flotante o se abren desde el titlebar/atajo.
- `UpcomingTournamentsSection.tsx` separa `official` (`play-pokemon`) y `limitless`; los filtros de país/ciudad solo aplican a oficiales. Pagina 10 eventos por grupo con paginador independiente y colapsa Mayores/Locales/Limitless.
