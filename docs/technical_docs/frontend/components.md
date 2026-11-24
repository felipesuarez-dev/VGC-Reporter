# Frontend — Components

`frontend/src/components/`.

## layout/
- `AppShell.tsx` - wrapper principal. Desktop: sidebar colapsable con resize drag + `Titlebar`. Mobile: sidebar overlay drawer + `MobileTopbar` + `MobileNavDock`. Detecta `isMobile` via `matchMedia("(max-width: 767px)")`. Aplica safe-area insets en sidebar header/footer y `<main>`, reserva espacio inferior para el dock y mantiene un único listener global para scrollbars y atajos.
- `Titlebar.tsx` - header desktop con branding, búsqueda, tema/idioma, controles de ventana, **pestañas dentro del navbar**, botón de Tablas si `quickTablesMode` es `titlebar` y botón de calendario si `calendarMode` es `titlebar`. El `+` de nueva pestaña va junto a la lupa.
- `DesktopTabStrip.tsx` - pestañas de escritorio (`role="tablist"`): icono + label + cierre, activa con acento, scroll horizontal sin scrollbar, máximo 8. Usa `useViewTabActions` para guardar/restaurar scroll y navegar.
- `MobileTopbar.tsx` - barra superior para Android: hamburguesa, **atrás/adelante** con `navHistoryStore` (ocultos si el dock está activo), nombre de ruta traducido, búsqueda (oculta si el dock está activo), tema e idioma. Sin logo ni TypeLab para caber a 360 px. `paddingTop: env(safe-area-inset-top)`.
- `hooks/useHomeCountryFilter.ts` - filtros de país que arrancan con `homeCountry`; si no hay filas del país local (o menos de 3 en una clasificación) cae a “Todos” para no dejar la vista vacía. Un país elegido manualmente se respeta y limpiar a “Todos” también.
- `MobileNavDock.tsx` - dock flotante mobile con historial, búsqueda, **`+` junto a la lupa**, hoja de **vistas abiertas** + accesos y modo fijo/arrastrable; se oculta al desactivarlo en Ajustes y solo se monta en la app Android. Controles de **36 px fijos** (no escalan con el tamaño de fuente), ancho compacto (~206 px con 22 px de fuente), `z-[41]` para quedar debajo de modales. Usa el mismo `viewTabsStore` que las pestañas de escritorio.
- `hooks/useModalBack.ts` - pila compartida de modales: solo el superior responde a Escape y al back de Android. Cerrar una ficha de Pokémon desde el detalle de un torneo vuelve al torneo, no cierra todo. Cada modal conserva su entrada de historial; el cierre programático ignora el `popstate` propio.
- `SelectionMenu.tsx` — popover compartido por tema e idioma: mismo ancho/padding/hover, búsqueda opcional y **estrella** en el elemento seleccionado.
- `ThemeProvider.tsx` — provee variables CSS según tema.
- `ThemeSelect.tsx` — usa `SelectionMenu`; variante `titlebar` muestra Palette + bolita bicolor.
- `LanguageCombobox.tsx` — usa `SelectionMenu`; búsqueda por nombre/código y bandera.
- `AboutModal.tsx` — versión, licencia, créditos y búsqueda de actualizaciones. Usa `useModalBack`.
- `UpdaterModal.tsx` — desktop y Android. Android: progreso real, cancelación, SHA-256/tamaño, instalación FileProvider y diagnóstico. Desktop: `check → downloadAndInstall → relaunch` y fallback MSI. El bloque **Diagnóstico** muestra versión actual/remota, URL, firma, tamaño, hash y error exacto.
- `UpdaterErrorBanner.tsx` — banner de error del updater.
- `SourcesChip.tsx` - badge linkable a fuentes externas; `includeOfficial` añade **Oficial** (Championship Series) en Top Equipos. Métricas no lo incluye porque los Top 8 oficiales no alimentan el uso.
- `TimeZoneSelect.tsx` — selector global de zona horaria con `SearchSelect` (muchas zonas IANA).
- `CountrySelect.tsx` — selector de país de Settings con `SearchSelect`.
- `CountryFilter.tsx` — selector de país múltiple compartido por próximos torneos, calendario, recientes, Top Equipos y detalles; chips con bandera/código y buscador. Arranca con el país local.
- `CityMultiFilter.tsx` — selector de ciudad múltiple alimentado por los países seleccionados; agrupa por país con bandera/nombre y usa la clave compuesta `country|city` para no mezclar ciudades homónimas.
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
- `DashboardViewTabs.tsx` — tabs en orden **Novedades / Torneos / Métricas / Regulación** + pin de vista inicial. En mobile hacen wrap para no cortar etiquetas.
- `FeedSummaryCard.tsx` — resumen de regulación/temporada con instantes locales y días de datos UTC.
- `RegulationFeed.tsx` — usa `PanelBoard` para las tres secciones de Novedades (resumen, live y noticias). El antiguo panel `recent`/`events` se movió a `TournamentsView`.
- `LiveStreamCard.tsx` - vitrina de pantallas de YouTube (`useLiveStreams`): 12 pantallas VGC por defecto (YukS, Play! Pokémon, WolfeyVGC, CybertronVGC, James Baek, PokeAlex, Moxie2D, MoxieBoosted, BlackStormGamesVGC, Pokémon Champions, Sekiam y THATSAplusONE). La vitrina usa una grilla estable de 9 TVs; si no hay ninguna en vivo, muestra **Últimas transmisiones**. Para cada canal se elige la transmisión pasada más reciente por `Streamed N ago`, descartando programados/estrenos, y la tarjeta muestra **hace X** y **duración**. Cada tile tiene controles de **detener/reanudar** y **mantener**, y el ojo oculta/detiene solo esa señal sin remontar las demás. **Vitrina TV** abre `LiveWall`. Cada tile crea su propio reproductor al pulsar play y cada pestaña conserva sus reproductores; al salir de Novedades, el ajuste de reproducción decide entre detener o mostrar el mini-reproductor por pestaña.
- `LiveWall.tsx` - overlay a pantalla completa con grilla fija 3×3/2×/1× de 9 slots, badges al pie y botón de cierre/Escape.
- `lib/youtube.ts` — construye la URL `?sub_confirmation=1` de un canal; el "Me gusta" real requiere OAuth de Google y no se intenta desde el iframe.
- `RegulationNews.tsx` — noticias oficiales paginadas 6 por página; click abre `NewsDetailModal`. Las miniaturas usan `NewsThumbnail` (skeleton/shimmer + fade-in y fallback).
- `NewsDetailModal.tsx` — iframe de la noticia oficial + "Abrir en el navegador" y `useModalBack`.
- `NewsThumbnail.tsx` — banner 96×56 con shimmer mientras carga, fade/scale al terminar y placeholder si falla.
- `TournamentsView.tsx` — pestaña Torneos: Próximos, Recientes y Calendario sobre `PanelBoard`.
- `FeedSidePanel.tsx` — eliminado en 0.7.0; Tablas salió de Novedades y los torneos se movieron a `TournamentsView`.
- `FeedCalendar.tsx` - calendario mensual. Hoy se marca aunque no esté seleccionado; el filtro de ciudad solo aplica a oficiales locales (comunidad y majors no se ocultan); el día se agrupa en Oficiales/Comunidad/Personales y cada categoría tiene su punto. Mantiene multi-día, zona horaria, `.ics` y eventos personales.
- `CustomEventModal.tsx` - formulario de evento personal (título, fecha, hora, lugar, notas) guardado en `customEventsStore`.
- `UpcomingTournamentsSection.tsx` - eventos online + presenciales + majors oficiales; agrupa **Campeonatos oficiales** (LAIC/EUIC/NAIC/Regionales/Especiales/Worlds), **Eventos oficiales locales** y **Comunidad Limitless** en grupos colapsables. Filtra sobre el dataset completo y usa un paginador independiente de 10 por grupo. Los majors no se ocultan por el filtro país/ciudad.
- `EventSourceBadge.tsx` - badge Oficial (Play! Pokémon) vs Comunidad Limitless para cada evento.
- `TournamentTierBadge.tsx` - badge de nivel (Mundial/Internacional/Regional/Especial/Local) con color e icono; `tournamentTierColor()` comparte el acento con el calendario y las filas.
- `RecentTournamentsSection.tsx` - superficie reutilizable de torneos recientes: oficiales con modal interno, comunidad con drawer, búsqueda, filtro de país, paginación y grupos oficiales/comunidad colapsables. Es el panel Recientes de **Torneos** y también lo usa **Top Equipos**. Los filtros de país usan `useHomeCountryFilter` (país local de Ajustes) y ofrecen “Todos los países” si no hay resultados.
- `OfficialTournamentModal.tsx` - modal de un major: resumen, fecha/rango, sede, premio, campeón, standings oficiales paginados (con respaldo PokéData), “Lista no publicada” y “Abrir en el navegador”.
- `OfficialTeamsSection.tsx` - equipos Top 8 de PokéBase dentro del modal oficial, colapsable, con seis sprites/objetos por equipo.
- `TopCutBracket.tsx` - bracket Top Cut colapsable de PokéData, columnas por ronda, conectores SVG y ganador/perdedor con seeds y países.
- `PlayerMatchHistory.tsx` - historial de rondas por jugador: suizas + Top Cut, resultado verde/rojo, rival, país y placement; incluye el equipo y cada Pokémon abre su ficha.
- `TeamPokemonGrid.tsx` - grilla única de seis Pokémon para oficiales y comunidad; conserva posición, país, record y datos del set en tooltip.
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
- `ScrollToTop.tsx` - botón histórico; la flecha de volver arriba vive ahora dentro del rail `FloatingWidgetDock`.
- `QuickTables.tsx` - tablas de Tipos y Naturalezas. Se montan en el dock flotante o se abren desde el botón del titlebar y el atajo. Tipos permite seleccionar atacante/defensor por fila/columna/celda; Naturalezas usa grid × stats con +10%/-10%, búsqueda y filtro. Incluye modal "Pantalla grande / Landscape" con cierre por **X** y Escape.
- `FloatingWidgetDock.tsx` - **rail vertical único** con tablas, calendario, botón de 3 puntos y flecha de volver arriba. Mismo tamaño para todos los botones, separador, animación de apertura/cierre, `prefers-reduced-motion` y anclaje por encima del dock mobile; si hay mini-reproductor en desktop, sube para no taparlo.
- `LazyVideoFrame.tsx` - iframe de YouTube con `IntersectionObserver` (solo monta cerca del viewport), `loading="lazy"` y spinner grande hasta `onLoad`. Evita que varios embeds congelen Novedades.
- `Pagination.tsx` - paginador compacto reutilizable (`‹ 1 2 3 ›`, gap, “página X / Y”). Próximos torneos, Recientes, el calendario del día y las últimas transmisiones pagina cada grupo por separado.
- `PanelLoading.tsx` — spinner + skeleton por panel (`list`, `chart`, `cards`, `table`, `calendar`), con `aria-busy`.

## info/
- `EntityChip.tsx` — chip con `Tooltip` para ability/move/item. El tooltip incluye nombre localizado, tipo, categoría (para moves) y descripción de PokéAPI. Los items muestran sprite inline y, si falta el nombre localizado, `prettifyItemName` evita ids concatenados.
- `MoveDetailModal.tsx` — modal de detalle de movimiento (z-[55]). Usa `useModalBack`.
- `ItemDetailModal.tsx` — modal de detalle de objeto con sprite, nombre, tipo "Objeto" y sección de efecto. Usa `useModalBack` y cae a "Sin descripción disponible" sólo si todas las fuentes fallan.
- `AbilityDetailModal.tsx` — modal de detalle de habilidad. Usa `useModalBack`.

## Componentes 0.6.0

- ui/TypeLabModal.tsx - tabla 18x18, cobertura de 1-2 tipos y cobertura del equipo; atajo Ctrl+T.
- playback/PlaybackProvider.tsx - primer proveedor persistente de un solo iframe; en 0.7.0 evoluciona a sesiones independientes por pestaña.
- settings/SyncSettings.tsx - QR, URL, código, preview e importación LAN.
- dashboard/CalendarWidget.tsx - calendario flotante en esquina o libre. Reemplazado en 0.7.0 por `FeedCalendar` dentro del rail y `layout/TitlebarCalendarPanel`.
- dashboard/LiveWall.tsx - grilla fija 3x3 de 9 TVs.
- dashboard/EventSourceBadge.tsx - badge diferenciado Play! Pokémon / Limitless.
- team/StatPointSliders.tsx - 66 SP y 32 por stat.
- pages/Learn.tsx - guías, práctica, starters, amenazas y glosario.

## PanelBoard 0.6.0

- `layout/PanelBoard.tsx` - `PanelOrderGroup` + `PanelOrder`. Reordena paneles de Métricas y Regulación con pointer events (WebView2/touch) y botones subir/bajar como alternativa accesible. El orden visual usa CSS `order`, así que los paneles no se desmontan ni pierden estado al arrastrar. Persistido en `dashboardStore` v23 (`metricsOrder`, `regulationOrder`).

## Aprender 2.0 y QuickTools

- `pages/Learn.tsx` - hero con progreso, trivia de reglas, cores reales (tríos) con `Probar core`, equipos iniciales paginados, datos del meta y botón de recarga.
- `lib/natures.ts` - 25 naturalezas agrupadas por stat potenciado; `NatureTable` las muestra con buscador.
- `ui/TypeLabModal.tsx` - pestañas Tipos, Naturalezas, Cobertura y Mi equipo; exporta `TypeChartTable` y `NatureTable`.
- `settings/LiveScreensSettings.tsx` - alta, edición, borrado y reordenación de pantallas en vivo.
- `settings/SyncSettings.tsx` - flujo QR-first, selección de envío/recepción, código de 8 para desktop, enlace avanzado y explicador sin jerga de IPs.

## 0.7.0

- `layout/PanelBoard.tsx` - tablero genérico con filas, Separados/Juntos, drag & drop, ghost, autoscroll, colapso y reset. Lo usan Novedades, Torneos, Métricas y Regulación. Las filas usan `grid-cols-1` base y los paneles `min-w-0` para que ningún contenido ancho provoque scroll horizontal en mobile.
- `dashboard/TournamentsView.tsx` - Próximos + Recientes + Calendario. El panel de calendario usa el mismo `FeedCalendar` y grupos colapsables que el widget, pero estirado a todo el ancho del panel.
- `dashboard/UpcomingTournamentsSection.tsx` - paginación independiente de 10 por grupo y grupos colapsables.
- `dashboard/RecentTournamentsSection.tsx` - reutilizado por Panel → Torneos y Top Equipos. Toda la fila abre el detalle; “Ver resultados” es el mismo en oficiales y comunidad; filtros de búsqueda/país independientes y paginación 10 + 10 por grupo, sin Ver más. Oficiales y comunidad comparten altura y estructura: título, metadatos y tercera línea para premio/equipo campeón; solo cambia el acento (oro/azul) y el contenido propio de cada fuente.
- `FeedCalendar.tsx` - “Campeonatos oficiales” y “Torneos de la comunidad” son colapsables y paginan 6 eventos por grupo dentro del día seleccionado; los encabezados muestran chevron, punto de color y contador. El mismo componente se usa en Torneos, donde ocupa todo el ancho del panel, y en los paneles de calendario del titlebar/rail, que usan un ancho compacto.
- `dashboard/LiveStreamCard.tsx` - últimas transmisiones en páginas de 6, con el mismo `Pagination` que el resto. Cada tarjeta muestra la antigüedad (“ayer”, “hace 2 días”) y la duración; `lib/mediaTime.ts` centraliza el formato relativo por locale.
- `layout/TitlebarCalendarPanel.tsx` - calendario anclado al titlebar, con cierre por X, Escape, click-outside y `useModalBack`; el botón de Tablas usa el mismo patrón de modo.
- `tournament/TopCutBracket.tsx` - bracket con conectores SVG reales entre rondas; `PlayerMatchHistory` muestra el equipo del jugador y cada Pokémon abre su ficha.
- `tournament/TeamPokemonGrid.tsx` - grilla compartida de seis Pokémon para equipos oficiales (PokéBase/PokéData) y decklists de comunidad: mismo sprite de 30 px, tarjeta, item y click al detalle. El tooltip conserva objeto, habilidad y movimientos exactos cuando la fuente los publica.
- `tournament/OfficialTournamentModal.tsx` + `OfficialTeamsSection.tsx` - equipos PokéBase con respaldo PokéData, divisiones del evento, Top Cut y rondas; los torneos sin Masters no contaminan métricas. La comunidad usa la misma grilla de equipos en `TournamentStandingsDrawer`.
- `lib/platform.ts` - `isAndroidApp()` decide si se monta `MobileNavDock`; la navegación mobile no aparece en escritorio.
- `ui/FloatingWidgetDock.tsx` - rail único de widgets con flecha de subir; sólo muestra Tablas/Calendario cuando su modo es `floating`. En mobile se ancla sobre `MobileNavDock`.
- `layout/MobileNavDock.tsx` + `stores/viewTabsStore.ts` + `hooks/useViewTabsSync.ts` - vistas abiertas, accesos, historial y búsqueda del dock mobile.
- `settings/ShortcutRecorder.tsx` - grabador de combinaciones para Tablas (`Ctrl+T` por defecto).
- `ui/FormControls.tsx` - sistema único de controles: `ToggleSwitch` (on/off), `SegmentedControl` (exclusivo), `CheckboxField` (multi-selección/acknowledgement) y `SelectField` (listas largas, 36 px). Reglas en `docs/technical_docs/frontend/design-system.md`.
- `lib/syncLabels.ts` - traduce claves de sync a etiquetas humanas (“Labmaus · Regulación M-C”); nunca muestra `live_stream_urls` ni slugs.
- `playback/PlaybackProvider.tsx` - sesiones **independientes por pestaña**: cada pestaña tiene su propio conjunto de reproductores, su estado de detenido/reanudado y su mini-reproductor. Un iframe por stream activo; se conserva el mismo nodo al pasar del tile al mini, sin reparentarlo. Al cerrar una pestaña se eliminan solo sus reproductores. La continuidad (`stop`/`mini`) se configura en Ajustes y se guarda en `playbackStore`; el mini se apila a la izquierda del rail y encima del dock en mobile.
- `ui/ModalShell.tsx` - marco compartido de modales con header/footer fijos, body `modal-scroll` y cierre ESC/click-outside.
- `team/DeleteTeamConfirmModal.tsx` - confirmación de borrado con nombre del equipo.
- `settings/SyncSettings.tsx` + `lib/sync.ts` - `SyncSendOptions`, `SyncSendSelection`, `filterSyncBundle` y `syncTeamKey` para selección dinámica en ambos lados.
- `lib/learn/glossaryDetails.ts` - ejemplo y fuentes por término, con fallback de ejemplo al inglés en FR/IT/PT mientras se revisan traducciones.
