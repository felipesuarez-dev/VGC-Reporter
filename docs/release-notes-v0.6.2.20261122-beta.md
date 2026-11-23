# VGC Reporter 0.6.2.20261122-beta

Release de sincronización LAN, updater Android interno, torneos oficiales con resultados, calendario, tablas rápidas y Aprender 2.0.

## Sincronización y QR

- Ticket versionado `vgcreporter://sync?v=1&code=...&token=...&host=...&port=...`; el QR ya no transporta los equipos.
- Código de 8 caracteres sin ambigüedades y token de 128 bits.
- Sesión de 5 minutos, un solo uso, token obligatorio y payload máximo de 8 MiB.
- Estados visibles: esperando, conectado, transfiriendo, recibido, importado, expirado, cancelado y error.
- Botón **Enviar todo** con preview de equipos, ajustes y preferencias.
- Escáner Android a pantalla completa con `checkPermissions`/`requestPermissions`; si el permiso está bloqueado, **Abrir Ajustes** usa `openAppSettings`.
- Fallback manual por código y por ticket/URL avanzada.
- Conflictos renombrar/reemplazar/omitir y cierre de la sesión tras la transferencia.

## Updater Android y escritorio

- Android descarga el APK dentro de la app con progreso real y cancelación.
- Verificación de tamaño, SHA-256 y firma del APK contra la app instalada antes de instalar.
- Instalación con FileProvider, `FLAG_GRANT_READ_URI_PERMISSION` y `application/vnd.android.package-archive`.
- Si falta “instalar apps desconocidas”, abre directamente los ajustes del permiso.
- “Abrir en GitHub” queda como opción secundaria.
- `latest.json` incluye `size` y `sha256` del APK.
- Desktop: diagnóstico visible de versión actual/remota, URL, firma y error exacto; fallback MSI.

## Torneos, calendario y Novedades

- **Torneos recientes** pasa de Métricas a un panel propio de Novedades.
- `RecentTournamentsSection` reutilizable; migración de layouts persistidos sin duplicar el panel.
- Los grupos **Campeonatos oficiales** y **Torneos de comunidad** se pueden colapsar con el mismo patrón de chevron/hover del Panel Principal.
- Majors pasados abren un modal interno con resumen, fecha/rango, sede, premio, campeón, standings oficiales paginados y “Lista no publicada”.
- El equipo campeón solo se muestra si la fuente lo entrega; si no existe, se mantiene “Lista no publicada” sin inventar datos.
- Próximos oficiales muestran campeón cuando ya hay resultados.
- Calendario: hoy siempre marcado, agrupación Oficiales/Comunidad/Personales, dots por categoría, tooltip, botón Hoy y filtro de ciudad solo para oficiales locales.
- El ojo de los eventos tiene una zona táctil mayor y no queda pegado al borde.

## Tablas rápidas y widget

- Modo **panel** como tercera pestaña de Novedades junto a Próximos/Calendario.
- Modo **flotante** en esquina o posición libre; Ajustes → Widgets.
- Card colapsable en Pokédex.
- Tabla de tipos con selección de atacante/defensor por fila, columna o celda, resumen, resaltado y botón limpiar.
- Tabla de naturalezas en grid × stats con +10%/−10%, resumen, búsqueda y filtro por stat.
- Modal **Pantalla grande / Landscape** con celdas grandes, cierre con la **X** y Escape.
- Sticky headers, zebra, contraste por tema, scroll con sombra y tamaños táctiles.

## Constructor, navbar y coherencia

- Constructor en orden **Champions / Showdown**; el texto “Clásico” pasa a “Showdown”. `BuildMode::Classic` se conserva internamente.
- Navbar móvil con atrás/adelante reutilizando `navHistoryStore`, títulos traducidos, tema/idioma compactos y layout que cabe a 360 px.
- `100dvh` + safe-area top/bottom/left/right en landscape.
- Menús de tema e idioma con el mismo componente, ancho, padding, hover, búsqueda y **estrella** en el seleccionado.
- Sidebar: ES “Panel Principal”, IT “Pannello principale”, PT “Painel principal”.

## Carga, gradientes y treemap

- `PanelLoading` con spinner + skeleton por panel; el Feed ya no se bloquea esperando la fuente más lenta.
- Gradiente `card-hero` compartido en Regulación, card de Regulación y rango de fechas.
- Treemap con `foreignObject` HTML, ellipsis real, etiquetas ocultas si no caben, sprite/% por tamaño, tooltip completo y contraste calculado para Umbreon/Zekrom/Reshiram.
- Cabeceras de tipos y celdas usan color de texto por luminancia: Eléctrico y otros fondos claros llevan texto oscuro, no blanco.

## Aprender 2.0

- Práctica de 10 preguntas/día desde generadores de tipos, velocidad, lead, naturaleza, Stat Points y cláusulas, con explicación obligatoria, puntaje y racha.
- Trivia de reglas ampliada y validada.
- Glosario de 80+ términos reales en 5 idiomas, 6 categorías, buscador, chips e índice alfabético en modal.
- 12 guías de 6 secciones con ejemplos, errores, checklist y ejercicio.
- 11 arquetipos de cores con roles, condición de victoria, cómo se juega, variantes y “Probar core” desde el meta actual.
- Insights puros con muestra mínima, win rate, top-cut rate, uso, `sources_covering` y confianza; una muestra de 2 equipos no puede ganar una card.

## En Vivo

- Los canales que no están en vivo muestran su última transmisión con los badges **Última transmisión** y **No está en vivo**.
- Si el canal está oculto con el ojo, la última transmisión sigue visible y marca el estado oculto.

## Documentación

- README ES/EN, docs técnicos de sync/updater/Aprender/torneos oficiales, docs de usuario, capturas y VALIDACION.md.
- Plane: tarjeta 0.6.2 y comentarios en 64/86/91.

## Plataformas

- Windows 10/11: MSI x64 (en-US / es-ES).
- Android 7+ (arm64): APK firmado, updater interno y sideload.

## Artefactos y hashes

| Archivo | SHA-256 |
|---|---|
| `VGC.Reporter_0.6.2_x64_en-US.msi` | `B5A17357C0DD705B42A6C057A0B35E1DCB704AF82093C024AC079A46BB7D1F15` |
| `VGC.Reporter_0.6.2_x64_es-ES.msi` | `2E1083EAF7263AF430FFE0BCB76CF7BEB6C35D632D796D26B1F0796BE1683C86` |
| `VGC.Reporter_v0.6.2.20261122-beta_android.apk` | `3D6DE9DF1DD7DF92500ADFF8701169839FFABB93F35218EB91C0C07D47533E3F` |

La app release se abrió y validó localmente antes de publicar. La validación física de Android y la prueba real del updater se realizan después de publicar; los binarios no cambian.
