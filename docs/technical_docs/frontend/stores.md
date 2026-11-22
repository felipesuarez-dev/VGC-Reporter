# Frontend — Stores (Zustand)

`frontend/src/stores/`. Sólo estado global de UI. **Nunca** copiar datos del server (esos viven en TanStack Query).

| Store | Estado | Persistencia |
|---|---|---|
| `teamBuilderStore` | `team` (draft), `pendingImport`, `pendingImportMissing` | en memoria |
| `dashboardStore` | `format`, `favoriteFormat`, `formatPinned`, `showArchived`, `topPokemonView`, `dashboardView`, `feedRows`, `feedPanels`, `sourceFilter` | `localStorage` (versión 21) |
| `pokedexStore` | `sort` (generation/alphabetical/usage), `selectedPokemonId` (modal target), `scrollY`, filtros | parcial en `localStorage` |
| `filtersStore` | `query`, `typeFilter` | — |
| `uiStore` | `theme`, `timeZone`, `homeCountry`, `upcomingCountry`, `favoriteUpcomingCountry`, `upcomingCity`, `sidebarCollapsed`, `sidebarWidthPx`, `fontSizePx`, `hiddenLiveScreens` | `localStorage` (versión 12) |
| `customEventsStore` | `events[]` de eventos personales del calendario | `localStorage` (versión 1) |
| `navHistoryStore` | `entries[]`, `index` (back/forward) | en memoria |

`dashboardStore.formatPinned` evita que el polling del catálogo cambie la
regulación elegida por el usuario. `useRegulationCatalog` llama a
`followActive` solo cuando no está fijada.

## Feed layout

El Feed no guarda un simple orden de paneles. Guarda **filas**:

```ts
type FeedPanelId = "summary" | "live" | "events" | "news";
type FeedRows = FeedPanelId[][];
```

- `[["summary"], ["live"], ["events"], ["news"]]` → todo separado.
- `[["summary"], ["live", "events", "news"]]` → los tres paneles de contenido
  comparten una fila.
- `[["summary", "live", "events", "news"]]` → todo junto.

`normalizeFeedRows` repara datos persistidos (ids desconocidos, duplicados o
faltantes) y acepta el formato antiguo plano. `feedLayoutMode(rows)` deriva
`vertical`, `horizontal` o `custom` para los botones **Separados / Juntos**.
La migración a la versión 20 usa `placeLiveBelowSummary` para garantizar que
Live quede en su propia fila justo debajo de Regulación en layouts antiguos.

`feedPanels` guarda sólo `{ collapsed }` por panel. El panel de live ya **no** se
colapsa automáticamente cuando no hay stream: muestra el estado offline.
`hiddenLiveScreens` guarda las URLs ocultas con el ojo (siguen configuradas y
aparecen como badge para restaurarlas). `resetFeedLayout` restaura filas y
colapsos por defecto.

`customEventsStore` guarda los eventos personales del calendario (`title`,
`date`, `time`, `location`, `notes`) en `localStorage`; se añaden desde
`CustomEventModal` y se renderizan junto a los torneos, con badge **Personal**.

## Country and city filters

`uiStore.upcomingCountry` es `null` para **todos los países** y un código ISO
para un país seleccionado. `favoriteUpcomingCountry` guarda el país con la
estrella (mismo patrón que el formato favorito de `FormatSelector`): se ordena
primero y al marcarlo también se selecciona. `upcomingCity` es una clave
compuesta `country|city` para que dos ciudades homónimas de países distintos no
se mezclen. Al cambiar de país se limpia la ciudad.

`UpcomingFilters` alimenta la lista y el calendario. El buscador de texto es
estado local de cada panel y filtra por nombre, local, ciudad y dirección
(`matchesUpcomingQuery`, sin distinguir tildes). El selector de país recibe
`availableCountries` (calculado del query global) para mostrar primero los
países con eventos reales. `homeCountry` sigue existiendo como referencia local
de Ajustes, pero el filtro de próximos torneos es independiente y por defecto
muestra todos.

## Patrón

- Cada store define `selectors` con `useStore((s) => s.field)` para evitar re-renders innecesarios.
- Setters explícitos (`setTheme`, `setFormat`, etc.).
- Persistencia con middleware `persist` cuando la pieza es UX-relevant entre sesiones.
- Los `migrate` deben ser tolerantes: nunca asumir que un campo nuevo existe en
  el estado persistido anterior.

## Stores 0.6.0
- `dashboardStore` v22: `favoriteSource`, `dateRanges` por formato y layout de feed/metricas/regulacion.
- `uiStore` v13: `calendarMode`, `calendarPlacement`, `calendarCorner` y `calendarPosition`.
- `playbackStore`: continuidad `stop`/`mini` para el directo.
- `typeLabStore`: apertura y pestaña del TypeLab.
- `learnProgress` se guarda directamente en localStorage junto con la racha del quiz.

