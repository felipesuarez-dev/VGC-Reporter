# VGC Reporter 0.7.0.20261123-beta

Nueva versión con pestaña **Torneos**, paginación independiente por grupo, rail
de widgets rediseñado, navegación mobile híbrida, atajo configurable y una
biblioteca de Aprender ampliada con fuentes en cinco idiomas.

## Cambios

- **Panel Principal con cuatro vistas:** Novedades, **Torneos**, Métricas y Regulación.
- **Torneos:** Próximos torneos, Torneos recientes y Calendario en una pestaña propia.
- **Próximos torneos:** paginador **independiente por grupo** (Campeonatos, Locales y Limitless), 10 eventos por grupo, sin “Ver más/menos”.
- **Layout unificado:** Separados/Juntos, drag & drop y colapsables en las cuatro vistas.
- **Torneos recientes:** mismo componente en Panel → Torneos y Top Equipos. Toda la fila abre el detalle, “Ver resultados” es igual en oficiales y comunidad, los filtros de búsqueda/país son independientes por grupo y cada uno pagina 10 eventos, sin “Ver más”.
- **Top Equipos oficiales:** el proveedor **Oficial** reúne los Top 8 de los últimos cuatro torneos oficiales publicados por PokéBase y **Todas las fuentes** antepone hasta 8 equipos oficiales. Cada card muestra la insignia **Torneo oficial**, posición, país y enlace a la fuente, y **Oficial** aparece en la línea de Fuentes. El filtro de país local solo se activa si hay al menos 3 equipos de comunidad de ese país, para que un Top 8 oficial no oculte la lista comunitaria. Las métricas de uso no mezclan estos equipos porque solo hay decklists parciales de top cut y sesgarían la muestra.
- **Calendario del día:** “Campeonatos oficiales” y “Torneos de la comunidad” son colapsables, muestran su contador y paginan 6 eventos por grupo. El calendario de Torneos usa el mismo componente que el widget y se estira a todo el ancho del panel.
- **Rail de widgets:** un solo objeto vertical con tablas, calendario, botón de 3 puntos y flecha de subir; mismos tamaños, separador y animación suave. Agrupado por defecto.
- **Navegación mobile:** dock flotante con atrás/adelante, búsqueda, vistas abiertas y accesos; fijo abajo centrado o libre arrastrable, activable/desactivable y sin opción de esquina. Solo se monta en la app Android. Controles compactos de 36 px que no crecen con el tamaño de fuente.
- **Topbar mobile:** oculta atrás/adelante/lupa cuando el dock está activo.
- **Tablas rápidas:** ancladas en la barra de título o como widget flotante, con atajo grabable (`Ctrl+T` por defecto) que abre y cierra; fuera de Novedades y Pokédex.
- **Pestañas de escritorio** en el navbar/titlebar con `+` junto a la lupa; cada pestaña conserva ruta, scroll y **su propia sesión de reproducción**, cierra con X y la última crea un Panel Principal nuevo.
- **Mobile:** el dock de vistas suma un `+` junto a la lupa para crear una vista nueva; la hoja mantiene vistas abiertas + accesos.
- **Reproducción por pestaña:** los directos de una pestaña no se reutilizan ni se mezclan con otra. Cada tile crea su propio reproductor y varios pueden estar encendidos en la misma pestaña; al cerrar la pestaña se cierran sus videos.
- **Mini-reproductor configurable:** al cambiar de página dentro de la misma pestaña, **Ajustes → Directos y pantallas** decide entre **Detener el video** o **Mini-reproductor**. El mini se apila a la izquierda del rail y encima del dock en mobile.
- **Play al primer click:** el iframe se crea con autoplay y recibe `playVideo`, sin el doble play que hacía falta antes.
- **Ajustes:** divisores finos entre opciones, sin línea sobre acciones como “Abrir tablas rápidas”.
- **Ajustes:** grupos y cards reorganizados (Widgets y navegación incluye rail, calendario, tablas y dock mobile), con Expandir/Contraer todo.
- **Controles coherentes:** switches para on/off, segmentados para opciones exclusivas, checkboxes solo para multi-selección y selects de 36 px; sincronización con etiquetas humanas (“Labmaus · Regulación M-C”) y slider de fuente con contraste por tema.
- **Scrollbars:** invisibles en reposo; aparecen con transición suave al hacer scroll y se ocultan tras ~900 ms.
- **Sync dinámico:** el emisor elige qué equipos/ajustes/UI envía y el receptor elige qué importar de ese subconjunto.
- **Aprender:** 12 guías de **9 secciones** con ejemplo práctico, errores comunes, checklist, fuentes verificables y fecha de revisión.
- **Glosario:** 80+ términos con ejemplo propio en **ES/EN/FR/IT/PT** y fuentes.
- **Pokédex:** rediseño visual con chips de filtros, contador y cards con uso/tipos/BST. Al cambiar el orden se muestra un spinner sobre la cuadrícula atenuada hasta que las cards se reordenan.
- **Torneos recientes oficiales:** Top Cut con líneas de llaves tipo torneo, historial completo por rondas con victorias en verde y derrotas en rojo, equipo por jugador y equipos Top 8 de PokéBase.
- **PokéData:** standings de respaldo, bracket Top Cut derivado del historial cuando falta el HTML, equipos de todos los jugadores, divisiones del evento y soporte para `Masters`/`Master`; enlaces a la fuente y aviso legal en Ajustes y en el detalle del torneo.
- **Cobertura oficial:** Puebla, Brisbane y Buenos Aires con todos los jugadores y equipos disponibles. Los torneos sin Masters muestran sus divisiones y no afectan las métricas.
- **Pokémon Zone:** añadido a Otras fuentes como enlace externo, sin scraping.
- **Pantallas de En vivo:** THATSAplusONE entra en los 12 defaults.
- **Vitrina TV:** safe-area en Android para no quedar bajo el status bar/navbar.

## Correcciones

- **En vivo:** un estreno o transmisión programada de YouTube (`isUpcoming`, `scheduledStartTime`, “Live in…”, “Scheduled for…”, “waiting”) ya **no** se muestra como directo. Solo se acepta una señal fuerte de live.
- **Play! Pokémon:** si no hay directo, muestra su última transmisión real con badge **No está en vivo**, **hace X** y **duración**.
- **Refrescar En vivo:** fuerza una consulta real (sin caché de 2 min) para corregir un estado falso de inmediato.
- **Reproducción continua:** dentro de la misma pestaña, el ajuste `stop`/`mini` decide si el directo se detiene o sigue en el **mini-reproductor**; en mobile se coloca a la izquierda del rail y encima del dock. Cambiar de pestaña no detiene ni reutiliza los reproductores de la otra.
- **Carga de En vivo:** los iframes se montan de forma diferida y muestran un **spinner grande** hasta estar listos, evitando que Novedades se congele al entrar.
- **Carga de En vivo:** el estado de carga muestra **un solo** placeholder con la tarjeta de prueba, sin el segundo cuadro duplicado.
- **Imagen de respaldo:** recreada en **1920×1080 PNG** con barras nítidas y recorte 16:9; ya no se estira ni se ve comprimida.
- **Pantallas de En vivo:** se limpió una entrada de video suelto que no era un canal; las pantallas por defecto son solo canales y el fallback de últimas transmisiones se mantiene.
- **Próximos torneos:** los contadores y “página X de Y” corresponden a cada grupo, no a una lista mezclada.
- **Filtros de país:** múltiples en próximos, calendario, recientes, Top Equipos y detalle; arrancan con el país local de Ajustes y caen a “Todos” si no hay datos de ese país (o menos de 3 en una clasificación). El combo de ciudad solo lista las ciudades de los países elegidos, agrupadas por país con bandera y nombre.
- **Torneos recientes:** filtros y paginación separados para oficiales y comunidad; toda la card es clickeable y ya no hay “Ver más”. Ambos grupos comparten altura, estructura y alineación; solo cambia el acento de color.
- **Equipos oficiales y comunidad:** misma grilla de seis Pokémon, mismas tarjetas y click al detalle. Las posiciones 1.º/2.º/3.º se ven en ambos y el tooltip conserva item, habilidad y movimientos.
- **Calendario:** cada grupo del día pagina 6 eventos, las etiquetas dicen “Campeonatos oficiales” y “Torneos de la comunidad”, y ambos grupos se pliegan con su chevron.
- **Mobile:** el dock flotante se redujo a controles de 36 px (~206 px de ancho con fuente 22) y ya no tapa los modales; el rail y el mini quedan debajo del backdrop.
- **Mobile:** PanelBoard usa `grid-cols-1` y `min-w-0`; las cuatro vistas dejan de tener scroll horizontal a 390 px.
- **Últimas transmisiones:** se elige la transmisión pasada más reciente real y se descartan los programados y estrenos, para que un evento futuro no aparezca como último video. Cada card muestra **hace X** y **duración**, y títulos como “Championship Sunday” o “Videojuegos Pokémon” se reconocen como VGC.
- **Últimas transmisiones:** se muestran 6 por página en lugar de acumular todas.
- **Paginadores:** se eliminó el texto “1 / N” junto a las flechas; los botones numerados ya indican la página.
- **Ajustes:** calendario y tablas rápidas solo pueden anclarse en la barra de título o vivir como widget flotante; se eliminó “Fijar en una página”.
- **Navegación mobile:** ya no se monta en escritorio; es exclusiva de la app Android.
- **Widgets:** la flecha de subir y el botón de 3 puntos ya no se ven como dos círculos sueltos ni se tapan entre sí.
- **Ajustes:** “Agrupar widgets” salió de la card de Tablas y ahora vive en Widgets flotantes.
- **Modales:** sin scrollbar permanente cuando el contenido cabe.
- **Modales apilados:** cerrar la ficha de un Pokémon abierta desde el detalle de un torneo (X, Escape o back) vuelve al torneo; solo se cierra todo al cerrar el modal padre.
- **Pokédex:** al cambiar el orden aparece un spinner y la cuadrícula se atenúa hasta que las cards se reordenan.

## Base 0.6.3

Incluye todo lo publicado en [0.6.3.20261122-beta](https://github.com/felipesuarez-dev/VGC-Reporter/releases/tag/v0.6.3.20261122-beta):
Sync/QR, updater Android interno, torneos oficiales, calendario, tablas rápidas,
treemap, Aprender 2.0 y validación del updater de escritorio.

## Plataformas

- Windows 10/11: MSI x64 (en-US / es-ES).
- Android 7+ (arm64): APK firmado, updater interno y sideload.

## Artefactos y hashes

Compilados el 2026-11-24:

- `VGC.Reporter_0.7.0_x64_en-US.msi` — 6.385.664 bytes — SHA-256 `fb85459ebaa698e01dc36643720d7d4406558d49962989e5e46b3ab5612a4a1f`
- `VGC.Reporter_0.7.0_x64_es-ES.msi` — 6.385.664 bytes — SHA-256 `92525f1d210042e06350b1edd0216e5e8d1417f98d9073655e854f74f9caf162`
- `VGC.Reporter_v0.7.0.20261123-beta_android.apk` — 19.945.802 bytes — SHA-256 `63dc6b7b0062acef9f5d94404f827f7c3281aa84bd7c999512581dc093137cf1`
- `latest.json` — manifiesto del updater con tamaño y SHA-256 del APK.

## Validación

Compilación completada el 2026-11-24 (MSI en-US/es-ES y APK arm64 firmado).
Pendiente la prueba instalada del MSI/APK. Checklist en
`scripts/release-local.ps1`: updater 0.6.3 → 0.7.0, APK en Android físico,
safe-area de Vitrina TV, sync selectivo, detección live, paginación por grupo,
rail de widgets, dock mobile, atajo configurable, Top Cut, rondas y equipos
PokéBase/PokéData del LAIC, Puebla, Brisbane y Buenos Aires, filtros y paginación
de recientes, calendario, últimas transmisiones, widgets anclados al titlebar,
reproducción independiente por pestaña, autoplay al primer click, modo
detener/mini y nueva imagen de respaldo 1920×1080.
