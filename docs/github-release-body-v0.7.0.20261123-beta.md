## Novedades

- **Pestaña Torneos** con Próximos torneos, Torneos recientes y Calendario.
- **Paginación independiente por grupo** en Próximos torneos: Campeonatos, Locales y Limitless, 10 por grupo y sin “Ver más/menos”.
- **Torneos recientes** con toda la fila clickeable, “Ver resultados” unificado, filtros de búsqueda/país independientes por grupo y paginación 10 + 10, sin “Ver más”.
- **Top Equipos oficiales:** el proveedor **Oficial** reúne los Top 8 de los últimos cuatro torneos oficiales publicados por PokéBase, y **Todas las fuentes** antepone hasta 8 equipos oficiales. Cada card muestra la insignia **Torneo oficial**, posición, país y enlace a la fuente, y **Oficial** aparece en la línea de Fuentes. El filtro de país local solo se activa con al menos 3 equipos de comunidad del país, para no ocultar la lista por un Top 8 oficial. Las métricas de uso no mezclan estos equipos parciales para no sesgar la muestra.
- **Calendario del día** con “Campeonatos oficiales” y “Torneos de la comunidad”, 6 eventos por grupo, ambos colapsables; el calendario de Torneos se estira a todo el ancho del panel y el widget mantiene su formato compacto.
- **Rail de widgets** unificado: tablas, calendario, botón de 3 puntos y flecha de subir con el mismo tamaño, separador y animación; agrupado por defecto.
- **Navegación mobile** híbrida: dock con historial, búsqueda, vistas abiertas y accesos; fijo abajo centrado o libre, activable/desactivable y sin esquina. Solo se monta en la app Android, con controles compactos de 36 px que no escalan con la fuente.
- **Tablas rápidas** ancladas en la barra de título o como widget flotante, con atajo grabable (`Ctrl+T` por defecto).
- **Ajustes reorganizados** en General, Widgets y navegación, Directos y pantallas, Datos y fuentes, Sincronización y Avanzado.
- **Pestañas de escritorio** en el navbar/titlebar con `+` junto a la lupa; cada pestaña conserva ruta, scroll y su propia sesión de reproducción. Mobile suma el `+` junto a la lupa en el dock de vistas.
- **Ajustes con divisores finos** entre opciones, sin línea sobre acciones.
- **Controles coherentes:** switches para on/off, segmentados para opciones exclusivas, checkboxes para multi-selección y selects de 36 px; sync con etiquetas humanas y slider de fuente con contraste por tema.
- **Scrollbars auto-ocultas** con transición suave y sin layout shift.
- **Reproducción independiente por pestaña:** cada pestaña conserva sus propios directos y su estado detener/reanudar; al cerrar la pestaña se cierran sus videos. Varios tiles pueden estar encendidos en la misma pestaña.
- **Mini-reproductor configurable:** **Ajustes → Directos y pantallas** elige entre detener el video o mantenerlo en el mini al cambiar de página dentro de la misma pestaña. El mini se apila a la izquierda del rail y encima del dock en mobile.
- **Play al primer click:** autoplay en el iframe y `playVideo` al cargar; se eliminó la sensación de tener que pulsar dos veces.
- **Imagen de respaldo de En vivo** recreada en 1920×1080 PNG, con barras nítidas y formato 16:9.
- **Carga diferida de En vivo** con spinner grande para que Novedades no se congele al entrar.
- **Sync selectivo** en ambos sentidos: el emisor elige qué envía y el receptor qué importa.
- **Aprender ampliado:** 12 guías de 9 secciones con fuentes y fecha de revisión; glosario con ejemplos propios en ES/EN/FR/IT/PT.
- **Pokédex** rediseñada con chips, contador y cards de uso/tipos/BST; spinner al cambiar el orden hasta que las cards se reacomodan.
- **Torneos recientes oficiales** con Top Cut de líneas tipo torneo, historial por rondas (verde/rojo), equipo por jugador y equipos Top 8 de PokéBase.
- **PokéData** como respaldo de standings y fuente de bracket/equipos: cubre todos los jugadores, deriva el Top Cut del historial si falta el HTML y lee divisiones `Masters`/`Master`; **Pokémon Zone** añadido a Otras fuentes y aviso legal de sitios externos.
- **En Vivo:** THATSAplusONE completa las 12 pantallas por defecto.

## Correcciones

- **Live falso:** estrenos y transmisiones programadas de YouTube (`isUpcoming`, “Live in…”, “Scheduled for…”, `waiting`) ya no se muestran como directo.
- **Play! Pokémon** aparece como **No está en vivo** con su última transmisión real, **hace X** y **duración**, cuando no hay directo.
- **Últimas transmisiones:** se elige el video pasado más reciente y se descartan programados y estrenos, para que un evento futuro no aparezca como último video. “Championship Sunday” y “Videojuegos Pokémon” se reconocen como VGC.
- **Paginadores:** sin el texto “1 / N”; bastan los botones de página.
- **Refrescar En vivo** fuerza una consulta real sin caché para corregir el estado al instante.
- **Widgets** ya no tapan la flecha de subir ni el dock mobile.
- **En vivo** ya no congela Novedades: iframes diferidos y spinner grande; el estado de carga muestra un solo placeholder. La reproducción es independiente por pestaña y, dentro de una pestaña, el ajuste detener/mini decide qué pasa al cambiar de página.
- **Pantallas de En vivo:** se quitó de la lista una entrada de video suelto que no era un canal. El fallback de últimas transmisiones sigue igual.
- **Ajustes:** “Agrupar widgets” se movió a Widgets flotantes.
- **Ajustes:** calendario y tablas rápidas solo se anclan en la barra de título o como widget flotante; se eliminó “Fijar en una página”.
- **Torneos recientes:** filtros y paginación separados para oficiales/comunidad; toda la card abre el detalle.
- **Filtros de país:** múltiples en próximos, calendario, recientes, Top Equipos y detalle; arrancan con el **país local** de Ajustes. Si ese país no tiene torneos/equipos en la lista, el filtro cae a “Todos” para no dejar la vista vacía. El combo de ciudad es múltiple, solo lista las ciudades de los países elegidos y las agrupa por país con bandera/nombre.
- **Torneos recientes:** oficiales y comunidad usan la misma estructura de fila, altura y tercera línea; “Ver resultados” queda alineado con el título. El acento de color distingue la fuente.
- **Equipos:** oficiales y comunidad comparten la misma grilla de seis Pokémon, tamaño de sprite, item y click al detalle; las posiciones 1.º, 2.º, 3.º… se muestran en ambos. El tooltip conserva habilidad y movimientos cuando la fuente los publica.
- **Navegación mobile:** ya no aparece en escritorio; es exclusiva de Android. Dock compacto de 36 px y modales por encima del dock/rail.
- **Mobile:** corregido el scroll horizontal de las cuatro vistas con `grid-cols-1` y `min-w-0` en PanelBoard.
- **Reproductor:** autoplay al primer click; ya no hace falta pulsar play dos veces.
- **Carga de En vivo:** un solo placeholder con la imagen de prueba, sin el cuadro duplicado.
- **Modales** sin scrollbar permanente cuando el contenido cabe.
- **Modales apilados:** cerrar la ficha de un Pokémon desde el detalle de un torneo vuelve al torneo; no cierra todo.
- **Pokédex:** spinner y cuadrícula atenuada mientras se aplica un nuevo orden.

## Base

Construido sobre 0.6.3.20261122-beta: Sync/QR, updater Android, torneos oficiales, calendario, tablas rápidas, treemap y Learn 2.0.

## Descarga

- Windows 10/11 (en-US): `VGC.Reporter_0.7.0_x64_en-US.msi`
- Windows 10/11 (es-ES): `VGC.Reporter_0.7.0_x64_es-ES.msi`
- Android 7+ (arm64): `VGC.Reporter_v0.7.0.20261123-beta_android.apk`
- Updater: `latest.json`

### SHA-256

- MSI en-US: `fb85459ebaa698e01dc36643720d7d4406558d49962989e5e46b3ab5612a4a1f`
- MSI es-ES: `92525f1d210042e06350b1edd0216e5e8d1417f98d9073655e854f74f9caf162`
- APK arm64: `63dc6b7b0062acef9f5d94404f827f7c3281aa84bd7c999512581dc093137cf1`

> Beta sin firma Authenticode en Windows. SmartScreen → Más información → Ejecutar de todas formas.
