# VGC Reporter 0.6.0.20261122-beta

## Cambios

- **Sincronización LAN**: QR y código de 8 caracteres (descubrimiento UDP en la misma Wi-Fi), vista previa y resolución de conflictos con renombrar, reemplazar u omitir. Sin nube.
- **Aprender**: nueva página con progreso, guías competitivas, práctica diaria de tipos, velocidad y lead, amenazas del meta, glosario y herramientas. Contenido en español, inglés, francés, italiano y portugués.
- **Tabla de tipos rápida**: `Ctrl+T`, botón en la barra y comando en el buscador. Matriz 18×18, cobertura de uno o dos tipos y cobertura del equipo actual con debilidades 4×.
- **Constructor Champions**: 66 Stat Points, 32 por stat, IVs 31 y nivel 50. Conversión automática EV↔SP al cambiar entre Clásico y Champions; cláusulas de especie y objeto. Champions es el modo inicial.
- **PokéBase como fuente**: equipos de torneo y comunidad (2.419 equipos comunitarios y más de 66.000 de torneo), con proveedor, origen, filtros y “Cargar en constructor”. Se respeta la atribución original.
- **Limitless próximos**: se lee la tabla pública `/tournaments/upcoming`, incluyendo eventos de hoy, hora local e inscritos. Badge Limitless visible.
- **En Vivo**: la Vitrina TV es una grilla fija de 9 TVs. Cada stream se puede detener o reanudar sin tocar los demás; el ojo oculta y detiene solo ese stream. Los streams nuevos se insertan/reordenan sin apagar los existentes.
- **Mini-reproductor**: opción para mantener el directo al cambiar de página, con el mismo iframe movido entre hosts y sin robar el video al volver a Novedades.
- **Regulación**: porcentajes de usuarios de objetos como porcentaje del total de equipos, no adopción condicional. Tooltip con ambas lecturas.
- **Métricas**: treemap con sprites y tooltip rico; selector de fuentes propio con favorito; rango de fechas compartido con Top Equipos.
- **Top Equipos**: filtros por rango de fechas, proveedor, origen, país y Pokémon.
- **Calendario**: anclado en Novedades o widget flotante en esquina/libre, configurable en Ajustes.
- **UI**: coherencia visual entre Novedades, Métricas y Regulación; drag & drop persistente en Métricas y Regulación (arrastrar o subir/bajar paneles); X de modales fija; aviso antes de abrir enlaces externos; título móvil completo.
- **Android**: barra de navegación inmersiva con swipe para mostrarla; descarga del APK y apertura del instalador del sistema.
- **Instalador**: MSI con licencia/descargo legal bilingüe, icono de acceso directo corregido y recursos de marca más legibles.
- **Temas**: Umbreon (negro total) y Zekrom (alto contraste).
- **Backlog**: filtro por país del campeón en torneos recientes del Panel, con bandera y estado vacío.

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


