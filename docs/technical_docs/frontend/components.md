# Frontend — Components

`frontend/src/components/`.

## layout/
- `AppShell.tsx` — wrapper principal. Desktop: sidebar colapsable con resize drag + `Titlebar`. Mobile: sidebar overlay drawer + `MobileTopbar`. Detecta `isMobile` via `matchMedia("(max-width: 767px)")`. Aplica safe-area insets en sidebar header/footer y `<main>`.
- `Titlebar.tsx` — header desktop con branding, búsqueda, tema/idioma y controles de ventana.
- `MobileTopbar.tsx` — barra superior para Android: hamburguesa, **atrás/adelante** con `navHistoryStore`, nombre de ruta traducido, búsqueda, tema e idioma. Sin logo ni TypeLab para caber a 360 px. `paddingTop: env(safe-area-inset-top)`.
- `SelectionMenu.tsx` — popover compartido por tema e idioma: mismo ancho/padding/hover, búsqueda opcional y **estrella** en el elemento seleccionado.
- `ThemeProvider.tsx` — provee variables CSS según tema.
- `ThemeSelect.tsx` — usa `SelectionMenu`; variante `titlebar` muestra Palette + bolita bicolor.
- `LanguageCombobox.tsx` — usa `SelectionMenu`; búsqueda por nombre/código y bandera.
- `AboutModal.tsx` — versión, licencia, créditos y búsqueda de actualizaciones. Usa `useModalBack`.
- `UpdaterModal.tsx` — desktop y Android. Android: progreso real, cancelación, SHA-256/tamaño, instalación FileProvider y diagnóstico. Desktop: `check → downloadAndInstall → relaunch` y fallback MSI. El bloque **Diagnóstico** muestra versión actual/remota, URL, firma, tamaño, hash y error exacto.
- `UpdaterErrorBanner.tsx` — banner de error del updater.
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
- `RegulationFeed.tsx` — stack de filas drag-and-drop. Usa pointer events (no HTML5 DnD) para que funcione en WebView2 y touch: lado = misma fila, arriba/abajo = fila nueva. Incluye collapse, ghost y panel `recent`. Ya **no** bloquea todo el Feed: cada panel usa su propio `PanelLoading` y aparece cuando su query termina.
- `LiveStreamCard.tsx` - vitrina de pantallas de YouTube (`useLiveStreams`): 11 pantallas VGC por defecto (YukS, Play! Pokémon, WolfeyVGC, CybertronVGC, James Baek, PokeAlex, Moxie2D, Pokémon Champions, Sekiam, IRNemesis y un watch party). La vitrina usa una grilla estable de 9 TVs; si no hay ninguna en vivo, muestra **Últimas transmisiones** (primer vídeo real de `/streams`, no el de mayor score). Cada tile tiene controles de **detener/reanudar** y **mantener**, y el ojo oculta/detiene solo esa señal sin remontar las demás. **Vitrina TV** abre `LiveWall`.
- `LiveWall.tsx` - overlay a pantalla completa con grilla fija 3×3/2×/1× de 9 slots, badges al pie y botón de cierre/Escape.
- `lib/youtube.ts` — construye la URL `?sub_confirmation=1` de un canal; el "Me gusta" real requiere OAuth de Google y no se intenta desde el iframe.
- `RegulationNews.tsx` — noticias oficiales paginadas 6 por página; click abre `NewsDetailModal`. Las miniaturas usan `NewsThumbnail` (skeleton/shimmer + fade-in y fallback).
- `NewsDetailModal.tsx` — iframe de la noticia oficial + "Abrir en el navegador" y `useModalBack`.
- `NewsThumbnail.tsx` — banner 96×56 con shimmer mientras carga, fade/scale al terminar y placeholder si falla.
- `FeedSidePanel.tsx` — tabs **Próximos / Calendario / Tablas**. Tablas es el widget de tablas rápidas embebido (`QuickTables`).
- `FeedCalendar.tsx` - calendario mensual. Hoy se marca aunque no esté seleccionado; el filtro de ciudad solo aplica a oficiales locales (comunidad y majors no se ocultan); el día se agrupa en Oficiales/Comunidad/Personales y cada categoría tiene su punto. Mantiene multi-día, zona horaria, `.ics` y eventos personales.
- `CustomEventModal.tsx` - formulario de evento personal (título, fecha, hora, lugar, notas) guardado en `customEventsStore`.
- `UpcomingTournamentsSection.tsx` - eventos online + presenciales + majors oficiales; agrupa **Campeonatos oficiales** (LAIC/EUIC/NAIC/Regionales/Especiales/Worlds) y **Eventos oficiales locales**, muestra rango multi-día, premio en efectivo y modal de detalle. Los majors no se ocultan por el filtro país/ciudad.
- `EventSourceBadge.tsx` - badge Oficial (Play! Pokémon) vs Comunidad Limitless para cada evento.
- `TournamentTierBadge.tsx` - badge de nivel (Mundial/Internacional/Regional/Especial/Local) con color e icono; `tournamentTierColor()` comparte el acento con el calendario y las filas.
- `RecentTournamentsSection.tsx` - superficie reutilizable de torneos recientes: oficiales con modal interno, comunidad con drawer, búsqueda, filtro de país, paginación y grupos oficiales/comunidad colapsables. Es el panel `recent` de Novedades.
- `OfficialTournamentModal.tsx` - modal de un major: resumen, fecha/rango, sede, premio, campeón, standings oficiales paginados, “Lista no publicada” y “Abrir en el navegador”.
- `TournamentDetailModal.tsx` - ficha con organizador, teléfono/email, local, dirección completa, código postal, contacto, web, entrada/precio, **premio en efectivo cuando existe**, rango multi-día, inscripción, categoría, evento premier, estado, ID, mapa OpenStreetMap, **Exportar .ics** multi-día y "Abrir en el navegador". Las horas usan la zona horaria configurada. Para Play! Pokémon consulta `get_official_event_details`; si el sitio bloquea la petición, usa el lector público de respaldo y muestra los datos estructurados (sin iframe ni aviso anti-bot). Limitless conserva la vista embebida.

## learn/
- `LearnSections.tsx` — `GlossaryModal` (buscador, chips, índice alfabético), `DailyPractice` (10 preguntas/día con explicación y puntaje), `TriviaPanel`, `MetaInsights` (6 cards con muestra/confianza) y `ArchetypeCores` (roles, condición, cómo se juega, variantes y “Probar core”).
- `SectionTitle.tsx` — cabecera compartida de secciones de Aprender.

## items/
- `ItemSprite.tsx` — sprite de objeto con cadena de fallback PokéAPI → Showdown itemicons → PokémonDB → icono neutro. El intento se resetea al cambiar de objeto sin `useEffect`.

## ui/
- `Tooltip.tsx` — tooltip flotante via portal. Dos fases: fase 1 calcula posición desde el trigger; fase 2 mide el rect real del tooltip y desplaza `left` para que ambos bordes queden a ≥ 8 px del viewport (crítico en mobile con pantallas estrechas).
- `SearchSelect.tsx` — combo-box con autocompletado. `triggerClassName` permite igualar la altura de los inputs de Settings; `allowClear` distingue filtros obligatorios (país) de filtros con "Todos"; `favorite`/`onFavoriteChange` añaden la estrella de favorito (mismo patrón que `FormatSelector`).
- `FormatSelector.tsx` — dropdown de regulación.
- `MultiTypeSelect.tsx` — multiselect de tipos.
- `ScrollToTop.tsx` — botón ancla.
- `QuickTables.tsx` — tablas de Tipos y Naturalezas reutilizadas en Feed, Pokédex y widget flotante. Tipos permite seleccionar atacante/defensor por fila/columna/celda; Naturalezas usa grid × stats con +10%/−10%, búsqueda y filtro. Incluye modal “Pantalla grande / Landscape” con cierre por **X** y Escape.
- `QuickTablesWidget.tsx` — botón flotante (esquina/libre) para el modo `floating`; no se monta en modo `panel`.
- `PanelLoading.tsx` — spinner + skeleton por panel (`list`, `chart`, `cards`, `table`, `calendar`), con `aria-busy`.

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
