# VGC Reporter 0.6.0.20261122-beta

## Cambios

- **Sincronización LAN**: flujo QR primero, código de 8 para desktop, enlace solo en opciones avanzadas, explicación sin IPs ni "bundles", vista previa y conflictos con renombrar, reemplazar u omitir. Sin nube.
- **Aprender 2.0**: progreso visual, guías, práctica diaria de tipos/velocidad/lead, trivia de reglas, cores reales del meta con "Probar core", más equipos iniciales con "Ver más", glosario y herramientas. Contenido en español, inglés, francés, italiano y portugués.
- **Tablas rápidas**: `Ctrl+T`, botón de la barra y widget global. Incluye matriz de tipos 18×18, coberturas, equipo actual y **tabla de naturalezas**. En la Pokédex quedan fijas y en Ajustes se configura si se muestran y qué pestaña abre primero.
- **Constructor Champions**: 66 Stat Points, 32 por stat, IVs 31 y nivel 50. Conversión automática EV↔SP al cambiar entre Clásico y Champions; cláusulas de especie y objeto. Champions es el modo inicial.
- **PokéBase como fuente**: equipos de torneo y comunidad (2.419 equipos comunitarios y más de 66.000 de torneo), con proveedor, origen, filtros y “Cargar en constructor”. Se respeta la atribución original.
- **Próximos torneos**: pestañas separadas **Oficiales** (Play! Pokémon presencial) y **Comunidad Limitless** (online). Se corrigió el filtro país/ciudad, se incluyen eventos de hoy, hora local e inscritos.
- **En Vivo**: la Vitrina TV es una grilla fija de 9 TVs. Cada stream se puede detener o reanudar sin tocar los demás; el ojo oculta y detiene solo ese stream. Los streams nuevos se insertan/reordenan sin apagar los existentes.
- **Mini-reproductor**: opción para mantener el directo al cambiar de página, con el mismo iframe movido entre hosts y sin robar el video al volver a Novedades.
- **Regulación**: porcentajes de usuarios de objetos como porcentaje del total de equipos, no adopción condicional. Tooltip con ambas lecturas.
- **Métricas**: treemap con sprites y tooltip rico; selector de fuentes propio con favorito; rango de fechas compartido con Top Equipos.
- **Top Equipos**: filtros por rango de fechas, proveedor, origen, país y Pokémon.
- **Calendario**: anclado en Novedades o widget flotante en esquina/libre, configurable en Ajustes.
- **UI**: coherencia visual entre Novedades, Métricas y Regulación (card de rango de fechas, headers y flechas de reordenar); drag & drop persistente en Métricas y Regulación; X de modales fija; aviso antes de abrir enlaces externos; título móvil completo.
- **Android**: barra de navegación inmersiva con swipe para mostrarla; descarga del APK y apertura del instalador del sistema.
- **Instalador**: MSI con licencia/descargo legal bilingüe, icono de acceso directo corregido y recursos de marca más legibles.
- **Temas**: Umbreon (negro absoluto con divisores amarillos), Zekrom (alto contraste oscuro eléctrico) y Reshiram (alto contraste claro). Descripciones en tooltip, no entre paréntesis.
- **Backlog**: filtro por país del campeón en torneos recientes del Panel, con bandera y estado vacío.

- **Ajustes**: secciones General, Widgets, Reproducción y directos, Datos y fuentes, Sincronización y Avanzado. El calendario y las tablas rápidas viven en Widgets.
- **Pantallas en vivo**: lista editable con añadir, editar, eliminar y mover; ya no es un textarea.
- **Live**: los tiles laterales ya no desbordan el panel; controles compactos y con mejor separación.
- **Menú**: Aprender queda después de la calculadora y antes de Ajustes.

## Correcciones

- Se eliminó el enlace de watch party por defecto que aparecía como “última transmisión”.
- Las últimas transmisiones ahora usan el primer vídeo de `/streams`, no el de mayor score.
- El ojo de un stream ya no recarga los demás iframes.
- El precio del evento se muestra en una fila propia en móvil.
- El título móvil ya no se abrevia a “VGC”.
- El combo de fuentes ya no usa el desplegable blanco nativo.
- Los eventos online sin país siguen visibles al filtrar por país.

## Plataformas

- Windows 10/11: MSI.
- Android 7+: APK arm64.
- macOS y Linux no se distribuyen en esta versión.

## Firma

Esta versión usa la llave de updater de 0.5.0. Si una instalación anterior no ofrece la actualización automática, instala el MSI o APK manualmente. En Android, desinstala la versión previa si la firma no coincide.

El MSI no está firmado con Authenticode; Windows puede mostrar SmartScreen. Usa “Más información” → “Ejecutar de todas formas”.

