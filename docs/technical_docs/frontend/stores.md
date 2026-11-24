# Frontend — Stores (Zustand)

`frontend/src/stores/`. Sólo estado global de UI. **Nunca** copiar datos del server (esos viven en TanStack Query).

| Store | Estado | Persistencia |
|---|---|---|
| `teamBuilderStore` | `team` (draft), `pendingImport`, `pendingImportMissing` | en memoria |
| `dashboardStore` | `format`, `favoriteFormat`, `formatPinned`, `showArchived`, `topPokemonView`, `dashboardView`, `feedRows/feedPanels`, `tournamentRows/tournamentPanels`, `metricsRows/metricsPanels`, `regulationRows/regulationPanels`, `sourceFilter` | `localStorage` (versión 26) |
| `pokedexStore` | `sort` (generation/alphabetical/usage), `selectedPokemonId` (modal target), `scrollY`, filtros | parcial en `localStorage` |
| `filtersStore` | `query`, `typeFilter` | — |
| `uiStore` | `theme`, `timeZone`, `homeCountry`, filtros de próximos (`upcomingCountries`/`upcomingCities`), sidebar, fuente, `settingsCollapsed`, `hiddenLiveScreens`, rail (`floatingWidgetsGrouped`, `floatingWidgetsCorner`), calendario (`calendarMode`), tablas (`quickTablesMode`, `quickTablesShortcut`, pestaña inicial) y navegación mobile (`mobileNavEnabled`, `mobileNavPlacement`, `mobileNavPosition`) | `localStorage` (versión 21) |
| `viewTabsStore` | `views[]` (`id`, `path`, `labelKey`, `scrollY`), `activeId`, sync/create/activate/close/setScroll para pestañas desktop y vistas mobile; máximo 8 | en memoria |
| `customEventsStore` | `events[]` de eventos personales del calendario | `localStorage` (versión 1) |
| `navHistoryStore` | `entries[]`, `index` (back/forward) | en memoria |

`dashboardStore.formatPinned` evita que el polling del catálogo cambie la
regulación elegida por el usuario. `useRegulationCatalog` llama a
`followActive` solo cuando no está fijada.

## Feed layout

El Feed no guarda un simple orden de paneles. Guarda **filas**:

```ts
type FeedPanelId = "summary" | "live" | "news";
type TournamentPanelId = "upcoming" | "recent" | "calendar";
type MetricsPanelId = "top_pokemon" | "trending" | "top_entities" | "external_sources";
type RegulationPanelId = "roster" | "items" | "megas";
```

Cada vista guarda filas y colapsos por separado:
`feedRows/feedPanels`, `tournamentRows/tournamentPanels`,
`metricsRows/metricsPanels` y `regulationRows/regulationPanels`.
`normalizePanelRows` repara ids desconocidos/duplicados/faltantes y acepta el
formato plano antiguo; `panelLayoutMode(rows)` deriva `vertical`, `horizontal` o
`custom` para Separados/Juntos. La migración v26 elimina `events`/`recent` de
Novedades, quita `upcoming` de Métricas, crea Torneos y convierte
`metricsOrder`/`regulationOrder` a filas.

`feedPanels`/`*Panels` guardan sólo `{ collapsed }` por panel. `hiddenLiveScreens`
guarda las URLs ocultas con el ojo. `resetFeedLayout`, `resetTournamentLayout`,
`resetMetricsLayout` y `resetRegulationLayout` restauran cada vista.

## Widgets y tablas rápidas

`uiStore` v19 sustituye el FAB suelto por un **rail único** y unifica la
ubicación de cada widget. `floatingWidgetsGrouped` (default `true`) muestra los
widgets bajo el botón de 3 puntos; `floatingWidgetsCorner` elige la esquina del
rail. `quickTablesMode` (`titlebar`/`floating`) y `calendarMode`
(`titlebar`/`floating`) deciden si el botón vive en el titlebar o si el widget se
une al rail; ya no existen `quickTablesFloating`, `quickTablesPinnedPage` ni
`quickTablesTitlebarButton`. `quickTablesShortcut` guarda la combinación
(`Ctrl+T` por defecto). `settingsCollapsed` guarda el colapso de grupos y cards
de Ajustes (`group:*`, `card:*`).

## Navegación mobile y pestañas

`mobileNavEnabled` (default `true`) monta `MobileNavDock` sólo en la app Android;
`lib/platform.ts` comprueba el user agent para que el dock no aparezca en
escritorio. `mobileNavPlacement` acepta `fixed` (abajo centrado) o `free`;
`mobileNavPosition` guarda la posición libre y se limpia con “Restablecer
posición”. No existe opción de esquina. `viewTabsStore` registra cada
pestaña/vista con un id, su ruta, label y scroll (máximo 8); `useViewTabsSync`
actualiza la pestaña activa en cada navegación y `useViewTabActions`
guarda/restaura scroll al cambiar o cerrar. `DesktopTabStrip` vive dentro del
titlebar; `MobileNavDock` usa el mismo store y su `+` junto a la lupa crea una
vista nueva en Panel Principal.

`customEventsStore` guarda los eventos personales del calendario (`title`,
`date`, `time`, `location`, `notes`) en `localStorage`; se añaden desde
`CustomEventModal` y se renderizan junto a los torneos, con badge **Personal**.

## Country and city filters

`uiStore` v21 guarda `upcomingCountries` y `upcomingCities` como arrays; una
lista vacía significa “todos”. `homeCountry` preselecciona esos filtros, y
`setHomeCountry` mueve los que no se tocaron. `upcomingCities` guarda claves
`country|city`; al cambiar de país se descartan las ciudades que ya no
pertenecen a la selección. `favoriteUpcomingCountry` se conserva por
compatibilidad, pero el selector múltiple usa chips y no estrella.

`UpcomingFilters` alimenta la lista y el calendario. El buscador de texto es
estado local de cada panel y filtra por nombre, local, ciudad y dirección
(`matchesUpcomingQuery`, sin distinguir tildes). El selector de país es múltiple
y recibe los países con datos reales; el selector de ciudad solo lista las
ciudades de los países elegidos y las agrupa por país. `homeCountry` es la
referencia local y `upcomingCountries` arranca con ese valor; los filtros
locales de recientes, Top Equipos y detalles usan `useHomeCountryFilter` para
seguir el país local.

## Patrón

- Cada store define `selectors` con `useStore((s) => s.field)` para evitar re-renders innecesarios.
- Setters explícitos (`setTheme`, `setFormat`, etc.).
- Persistencia con middleware `persist` cuando la pieza es UX-relevant entre sesiones.
- Los `migrate` deben ser tolerantes: nunca asumir que un campo nuevo existe en
  el estado persistido anterior.

## Stores 0.6.0
- `dashboardStore` v22: `favoriteSource`, `dateRanges` por formato y layout de feed/metricas/regulacion.
- `uiStore` v13: `calendarMode`, `calendarPlacement`, `calendarCorner` y `calendarPosition`.
- `playbackStore`: `continuity` (`stop`/`mini`) decide qué pasa al salir de Novedades dentro de la misma pestaña. Por defecto `mini`; la migración v2 mantiene ese valor. El estado de los reproductores vive en `PlaybackProvider` y no se persiste: es transitorio por pestaña.
- `typeLabStore`: apertura y pestaña del TypeLab.
- `learnProgress` se guarda directamente en localStorage junto con la racha del quiz.


## Stores 0.6.0 (PanelBoard)

- `dashboardStore` v23 añade `metricsOrder` y `regulationOrder` para Métricas y Regulación, con `normalizePanelOrder` para reparar ids desconocidos/duplicados y añadir paneles nuevos.

## Stores 0.6.0 (widgets)

- `uiStore` v14 añade `pokedexQuickTables` y `quickTablesDefaultTab`; también guarda calendario, temas y pantallas.
- `typeLabStore` incluye la pestaña `natures`.

## Stores 0.6.2

- `dashboardStore` v24: `recent` entra en `FeedPanelId` y `DEFAULT_FEED_ROWS`; `recent_tournaments` sale de Métricas.
- `uiStore` v15: `quickTablesMode` (`panel`/`floating`), `quickTablesPlacement`, `quickTablesCorner` y `quickTablesPosition`.
- `Learn` guarda práctica por fecha (`vgc-learn-practice-YYYY-MM-DD`), racha (`vgc-learn-streak`) y progreso de guías (`vgc-learn-progress`).

## Stores 0.7.0

- `dashboardStore` v26: cuatro vistas (`feed`, `tournaments`, `metrics`, `regulation`) con filas/colapsos independientes y migración desde `metricsOrder`/`regulationOrder`.
- `uiStore` v17: `floatingWidgetsGrouped`, `quickTablesFloating`, `quickTablesPinnedPage` y `settingsCollapsed`. Elimina `quickTablesMode` y `pokedexQuickTables`.
- `uiStore` v19: `quickTablesMode` y `calendarMode` (`titlebar`/`floating`); retira `quickTablesFloating`, `quickTablesPinnedPage` y `quickTablesTitlebarButton`. La migración conserva la elección anterior y cae a `floating` para Tablas y `titlebar` para el calendario.
- `FloatingWidgetDock` usa las posiciones existentes de calendario/tablas y mantiene ScrollToTop libre con z-index y offsets seguros.
