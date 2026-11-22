# Frontend — Components

`frontend/src/components/`.

## layout/
- `AppShell.tsx` — wrapper principal. Desktop: sidebar colapsable con resize drag + `Titlebar`. Mobile: sidebar overlay drawer + `MobileTopbar`. Detecta `isMobile` via `matchMedia("(max-width: 767px)")`. Aplica safe-area insets en sidebar header/footer y `<main>`.
- `Titlebar.tsx` — header desktop con branding, búsqueda, tema/idioma y controles de ventana.
- `MobileTopbar.tsx` — barra superior para Android: hamburguesa, logo, título compacto **VGC** en pantallas estrechas, búsqueda, tema/idioma. Incluye `paddingTop: env(safe-area-inset-top)` para respetar la barra de estado del sistema.
- `LanguageToggle.tsx` — toggle ES/EN.
- `ThemeProvider.tsx` — provee variables CSS según tema.
- `ThemeSelect.tsx` — selector de tema (system, Gengar, Clefable, Incineroar, Tyranitar). Variante `titlebar` muestra Palette + bolita bicolor del tema activo.
- `AboutModal.tsx` — versión, licencia, créditos. El bloque "Buscar actualizaciones" está oculto en mobile (el updater es desktop-only). Usa `useModalBack`.
- `UpdaterModal.tsx` — modal de actualización disponible/descarga. Sólo se renderiza en desktop (`!isMobile`).
- `UpdaterErrorBanner.tsx` — banner de error del updater. Sólo se renderiza en desktop.
- `SourcesChip.tsx` — badge linkable a fuentes externas.
- `TimeZoneSelect.tsx` — selector global de zona horaria con `SearchSelect` (muchas zonas IANA).
- `CountrySelect.tsx` — selector de país de Settings con `SearchSelect`.
- `CountryFilterSelect.tsx` — selector de país para próximos torneos; incluye "Todos los países" (`null`), buscador, países con datos primero y favorito con estrella.
- `CityFilterSelect.tsx` — selector de ciudad alimentado por los eventos visibles; clave compuesta `country|city` para no mezclar ciudades homónimas.
- `UpcomingFilters.tsx` — buscador de texto + país + ciudad compartido por la lista y el calendario; maneja el reset de ciudad al cambiar de país y la estrella de favorito. El buscador ignora tildes y busca también en la dirección.

## pokemon/
- `PokemonCard.tsx` — card con sprite, stats, tipo, usage %.
- `PokemonDetailModal.tsx` — modal grande: abilities, moves por tier, sets, Pikalytics, matchups.
- `PokemonSprite.tsx` — sprite pixelado con cadena de fallback (primary → fallback → home).
- `TypeBadge.tsx` — chip tipo.
- `MiniTeam.tsx` — 6 sprites compactos.
- `MovesetTierCard.tsx` — moves agrupados por frecuencia.
- `PikalyticsSection.tsx` — bloque con datos de Pikalytics (items, EVs, teammates, etc.).
- `MoveCategoryIcon.tsx` — Physical/Special/Status.

## team/
- `TeamMemberForm.tsx` — formulario por miembro.
- `EVSliders.tsx` — sliders con validación de tope 252 / 508.
- `TopTeamDetailModal.tsx` — visor de equipo campeón.
- `ImportCompletionModal.tsx` — resolver Pokémon faltantes al importar.

## charts/
- `UsageBarChart.tsx` — barras horizontales con sprite a la izquierda (Recharts + `<foreignObject>`).
- `TopList.tsx` — lista ranked.
- `TrendingCard.tsx` — indicadores up/down.

## filters/
- `PokemonMultiSelect.tsx` — multiselect con sprites (cmdk).
- `SearchTextInput.tsx` — input de texto.
- `CountryFilter.tsx` — dropdown de país (códigos ISO).

## tournament/
- `TournamentStandingsDrawer.tsx` — drawer/modal con standings completos + decklists. Incluye filtros de jugador, país y Pokémon. Usa `useModalBack` para el botón Atrás de Android.
- `ChampionTeam.tsx` — etiqueta "Equipo campeón" en la fila del torneo; el equipo y el detalle de objeto/habilidad/Tera/movimientos aparecen sólo en el tooltip al hover. El detalle completo sigue en el drawer.

## dashboard/
- `XCard.tsx` — wrapper de embed de Twitter/X.
- `DashboardViewTabs.tsx` — tabs en orden **Novedades / Métricas / Regulación** + pin de vista inicial. En mobile hacen wrap para no cortar etiquetas.
- `FeedSummaryCard.tsx` — resumen de regulación/temporada con instantes locales y días de datos UTC.
- `RegulationFeed.tsx` — stack de filas drag-and-drop. Usa pointer events (no HTML5 DnD) para que funcione en WebView2 y touch: lado = misma fila, arriba/abajo = fila nueva. Incluye collapse y el ghost que sigue al cursor. Mientras live/eventos/noticias cargan, muestra `FeedLoading` (spinner + skeletons) y evita renderizar una vista a medio cargar.
- `LiveStreamCard.tsx` - vitrina de pantallas de YouTube (`useLiveStreams`): 11 pantallas VGC por defecto (YukS, Play! Pokémon, WolfeyVGC, CybertronVGC, James Baek, PokeAlex, Moxie2D, Pokémon Champions, Sekiam, IRNemesis y un watch party). La vitrina usa una grilla estable de 9 TVs; si no hay ninguna en vivo, muestra **Últimas transmisiones** (primer vídeo real de `/streams`, no el de mayor score). Cada tile tiene controles de **detener/reanudar** y **mantener**, y el ojo oculta/detiene solo esa señal sin remontar las demás. **Vitrina TV** abre `LiveWall`.
- `LiveWall.tsx` - overlay a pantalla completa con grilla fija 3×3/2×/1× de 9 slots, badges al pie y botón de cierre/Escape.
- `lib/youtube.ts` — construye la URL `?sub_confirmation=1` de un canal; el "Me gusta" real requiere OAuth de Google y no se intenta desde el iframe.
- `RegulationNews.tsx` — noticias oficiales paginadas 6 por página; click abre `NewsDetailModal`. Las miniaturas usan `NewsThumbnail` (skeleton/shimmer + fade-in y fallback).
- `NewsDetailModal.tsx` — iframe de la noticia oficial + "Abrir en el navegador" y `useModalBack`.
- `NewsThumbnail.tsx` — banner 96×56 con shimmer mientras carga, fade/scale al terminar y placeholder si falla.
- `FeedSidePanel.tsx` — tabs Próximos / Calendario. La pestaña de Fuentes se eliminó; la información de fuentes vive en Regulación y Ajustes.
- `FeedCalendar.tsx` — calendario mensual con puntos por día (torneos + eventos personales), lista del día seleccionado con dirección completa, filtros país/ciudad, **Exportar .ics** y **Añadir evento** (evento personal persistido).
- `CustomEventModal.tsx` — formulario de evento personal (título, fecha, hora, lugar, notas) guardado en `customEventsStore`.
- `UpcomingTournamentsSection.tsx` — eventos online + presenciales; filtros país/ciudad, fuente visible y modal de detalle.
- `EventSourceBadge.tsx` — badge Play! Pokémon vs Limitless para cada evento.
- `TournamentDetailModal.tsx` — ficha con organizador, teléfono/email, local, dirección completa, código postal, contacto, web, entrada (badge junto al título), inscripción, categoría, evento premier, estado, ID, mapa OpenStreetMap, **Exportar .ics** y "Abrir en el navegador". Para Play! Pokémon consulta `get_official_event_details`; si el sitio bloquea la petición, usa el lector público de respaldo y muestra los datos estructurados (sin iframe ni aviso anti-bot). Limitless conserva la vista embebida.

## items/
- `ItemSprite.tsx` — sprite de objeto con cadena de fallback PokéAPI → Showdown itemicons → PokémonDB → icono neutro. El intento se resetea al cambiar de objeto sin `useEffect`.

## ui/
- `Tooltip.tsx` — tooltip flotante via portal. Dos fases: fase 1 calcula posición desde el trigger; fase 2 mide el rect real del tooltip y desplaza `left` para que ambos bordes queden a ≥ 8 px del viewport (crítico en mobile con pantallas estrechas).
- `SearchSelect.tsx` — combo-box con autocompletado. `triggerClassName` permite igualar la altura de los inputs de Settings; `allowClear` distingue filtros obligatorios (país) de filtros con "Todos"; `favorite`/`onFavoriteChange` añaden la estrella de favorito (mismo patrón que `FormatSelector`).
- `FormatSelector.tsx` — dropdown de regulación.
- `MultiTypeSelect.tsx` — multiselect de tipos.
- `ScrollToTop.tsx` — botón ancla.

## info/
- `EntityChip.tsx` — chip con `Tooltip` para ability/move/item. El tooltip incluye nombre localizado, tipo, categoría (para moves) y descripción de PokéAPI. Los items muestran sprite inline y, si falta el nombre localizado, `prettifyItemName` evita ids concatenados.
- `MoveDetailModal.tsx` — modal de detalle de movimiento (z-[55]). Usa `useModalBack`.
- `ItemDetailModal.tsx` — modal de detalle de objeto con sprite, nombre, tipo "Objeto" y sección de efecto. Usa `useModalBack` y cae a "Sin descripción disponible" sólo si todas las fuentes fallan.
- `AbilityDetailModal.tsx` — modal de detalle de habilidad. Usa `useModalBack`.

## Componentes 0.6.0

- ui/TypeLabModal.tsx - tabla 18x18, cobertura de 1-2 tipos y cobertura del equipo; atajo Ctrl+T.
- playback/PlaybackProvider.tsx - iframe único persistente que se mueve entre hosts y mini-reproductor.
- settings/SyncSettings.tsx - QR, URL, código, preview e importación LAN.
- dashboard/CalendarWidget.tsx - calendario flotante en esquina o libre.
- dashboard/LiveWall.tsx - grilla fija 3x3 de 9 TVs.
- dashboard/EventSourceBadge.tsx - badge diferenciado Play! Pokémon / Limitless.
- team/StatPointSliders.tsx - 66 SP y 32 por stat.
- pages/Learn.tsx - guías, práctica, starters, amenazas y glosario.

## PanelBoard 0.6.0

- `layout/PanelBoard.tsx` - `PanelOrderGroup` + `PanelOrder`. Reordena paneles de Métricas y Regulación con pointer events (WebView2/touch) y botones subir/bajar como alternativa accesible. El orden visual usa CSS `order`, así que los paneles no se desmontan ni pierden estado al arrastrar. Persistido en `dashboardStore` v23 (`metricsOrder`, `regulationOrder`).

## Aprender 2.0 y QuickTools

- `pages/Learn.tsx` - hero con progreso, trivia de reglas, cores reales (tríos) con `Probar core`, equipos iniciales paginados y datos del meta (win rate, speed control, objeto).
- `lib/natures.ts` - 25 naturalezas agrupadas por stat potenciado; `NatureTable` las muestra con buscador.
- `ui/QuickTables.tsx` - tablas fijas de tipos/naturalezas para la Pokédex; `TypeLabModal` usa los mismos componentes en el widget global.
- `ui/TypeLabModal.tsx` - pestañas Tipos, Naturalezas, Cobertura y Mi equipo; exporta `TypeChartTable` y `NatureTable`.
- `settings/LiveScreensSettings.tsx` - alta, edición, borrado y reordenación de pantallas en vivo.
- `settings/SyncSettings.tsx` - flujo QR-first, código de 8 para desktop, enlace avanzado y explicador sin jerga de IPs.
