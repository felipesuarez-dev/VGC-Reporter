# Panel Principal

El **Panel Principal** (Dashboard en inglés) es la pantalla de inicio y tiene cuatro vistas en este orden:
**Novedades** (vista inicial), **Torneos**, **Métricas** y **Regulación**. Cada una responde
una pregunta distinta sobre la misma temporada activa. La vista inicial se
puede fijar con **Fijar como vista inicial**.

## Métricas

Muestra el "estado del meta" de la regulación activa en un vistazo.

- **Rango de fechas de la temporada**: al abrir la app se selecciona la
  temporada activa y se muestra hasta hoy. Puedes ampliar el rango con los
  campos Desde/Hasta; si no coincide con la temporada aparece una advertencia y
  el botón para volver al rango oficial.
- **Top Pokémon**: barras horizontales (sprite + porcentaje), grid de iconos,
  treemap de "meta share" y tier list. Por defecto se muestran 10; "Ver más"
  amplía el listado.
- **Top items, movimientos y abilities**: rankings agrupados con el porcentaje
  de equipos que usan cada uno. Cada fila muestra además **qué Pokémon los usan
  más** (sprite, nombre y % de sus sets); los items conservan su sprite,
  descripción y modal de detalle.
- **Trending**: Pokémon que más suben o bajan comparando los últimos 7 días
  contra los 7 anteriores.
- **Próximos torneos** viven en la pestaña **Torneos**, no en Métricas.
- **Fuentes**: chips clickables a Labmaus, Limitless y Pikalytics.

## Regulación

Es la hoja de referencia de la temporada:

- Instantes oficiales de inicio y fin en **tu zona horaria**.
- **Días de datos**: el rango de días UTC que usan las métricas.
- Roster elegible con sprites y búsqueda a todo el ancho.
- Megas nuevas.
- **Objetos permitidos** en una cuadrícula amplia con **buscador propio**, sprite,
  nombre localizado, descripción, uso y **los Pokémon que más lo usan**. Al
  abrir un objeto, el modal muestra la lista ampliada de esos Pokémon. Si una
  fuente no tiene la descripción o el sprite, la app prueba las fuentes
  alternativas antes de mostrar un placeholder.
- Los movimientos y habilidades destacados en Métricas muestran igualmente sus
  Pokémon más frecuentes.
- Procedencia de cada fuente y nivel de confianza.

### Por qué la fecha oficial y el rango de datos pueden diferir un día

La temporada cambia en un instante oficial, por ejemplo
`2026-11-04T02:00:00Z`. En Chile eso se ve como el **3 de noviembre a las
23:00**. Los torneos se agrupan por día calendario UTC, así que el primer día
completo de competencia es el **4 de noviembre** y el último es el **1 de
diciembre**. Por eso la vista de Regulación muestra el instante local (3 nov
23:00 → 1 dic 22:59) y las métricas parten el 4 de noviembre. La app muestra
ambos rangos para que no parezca un error.

## Pestañas de escritorio

En desktop, el **navbar/titlebar** incluye pestañas:

- El **+** está junto a la lupa y abre una pestaña nueva en **Panel Principal**.
- Cada pestaña conserva su ruta y su scroll. Puedes tener varias pestañas de Panel Principal y navegar dentro de cada una.
- La pestaña activa se resalta con el acento; la **X** cierra. Al cerrar la activa se abre la vecina; si cierras la última, se crea un Panel Principal nuevo.
- Cada pestaña conserva su propia reproducción: si tienes uno o varios directos
  en una pestaña, siguen siendo de esa pestaña. Cambiar a otra no los mezcla ni
  reutiliza su reproductor. Al cerrar la pestaña se cierran sus videos.
- Al cambiar de página dentro de la misma pestaña, el ajuste **Reproducción al
  cambiar de página** decide: **Detener el video** o **Mini-reproductor en la
  esquina**. El mini aparece a la izquierda del rail de widgets (encima del dock
  en mobile) y se puede cerrar o abrir en YouTube.

## Torneos

La pestaña **Torneos** reúne los eventos en un solo lugar:

- **Próximos torneos**: pestañas **Oficiales** y **Comunidad Limitless**.
  Los oficiales incluyen majors (**LAIC, NAIC, EUIC, Regionales, Especiales y
  Worlds**) y eventos locales. País y ciudad son **múltiples**; el país arranca
  con el local de Ajustes y el combo de ciudad solo muestra las ciudades de los
  países elegidos, agrupadas por país con su bandera. Los majors nunca se ocultan
  por el filtro local. Cada grupo —**Campeonatos oficiales**, **Eventos locales**
  y **Comunidad Limitless**— tiene su propio paginador de **10 en 10** y se puede
  colapsar; no hay “Ver más/menos”.
- **Torneos recientes**: el mismo componente que usa **Top Equipos**. Toda la
  fila abre el detalle y “Ver resultados” es igual para oficiales y comunidad;
  cada grupo tiene su propia búsqueda, filtro de país y paginación de **10 en
  10**, sin “Ver más”. Los filtros de país arrancan con el **país local** de
  Ajustes (si no hay resultados, el botón “Todos los países” los limpia). Oficiales y comunidad comparten estructura, altura y
  alineación: misma fila de título, misma línea de metadatos, tercera línea
  reservada para premio/equipo campeón, fondo tenue y borde izquierdo de color.
  En un oficial, el detalle incluye **Top Cut con líneas de
  llaves tipo torneo**, historial completo por rondas (verde = victoria, rojo =
  derrota), **equipos Top 8 de PokéBase** y respaldo de equipos/standings de
  PokéData; también muestra las divisiones del evento. Si el feed oficial no
  publica la clasificación, se usa PokéData como respaldo y se indica claramente.
  Al pulsar un Pokémon de un equipo se abre su ficha encima del detalle; al
  cerrarla vuelves al torneo, no se cierra todo.
- **Calendario**: mismo componente que el widget, pero ocupa todo el ancho del
  panel en Torneos. Día actual marcado, dots por categoría, eventos personales,
  zona horaria y export `.ics`. Los grupos del día —**Campeonatos oficiales** y
  **Torneos de la comunidad**— son colapsables, muestran su contador y paginan 6
  eventos cada uno.

Los tres paneles se arrastran, agrupan, colapsan y aceptan **Separados/Juntos**
igual que el resto del Panel.

## Novedades (Feed)

Es la superficie de "qué está pasando ahora". El orden por defecto es
**Regulación → En vivo → Noticias oficiales**; puedes arrastrar los paneles para
cambiarlo. Tiene tres paneles:

1. **Regulación**: resumen de la temporada, instantes oficiales y días de datos.
2. **Transmisión en vivo**: una vitrina de pantallas de YouTube. Por defecto
   incluye **YukS VGC**, Play! Pokémon, WolfeyVGC, CybertronVGC, James Baek,
   PokeAlex, Moxie2D, MoxieBoosted, BlackStormGamesVGC, Pokémon Champions,
   **Sekiam** y **THATSAplusONE**; puedes cambiar el orden, añadir o quitar URLs
   en Ajustes (una por línea, máximo 12). El panel aparece en su
   propia fila debajo de Regulación. La primera señal en vivo se ve grande a la
   izquierda y las demás en una columna pequeña a la derecha, como YouTube; el
   botón **Destacar** cambia la principal y el selector permite pasar las
   pequeñas abajo. Cada señal tiene un **ojo** para ocultarla sin borrarla de
   la lista: queda como badge EN VIVO con el ojo cerrado y se restaura con un
   click. Si un canal no está en directo, el panel sigue visible y lo indica en
   vez de colapsarse. Los canales que no están en vivo muestran su **última
   transmisión real** con los badges "Última transmisión" y "No está en vivo",
   **hace X** y **duración**; se descartan programados y estrenos. Si el
   canal está oculto con el ojo, la última transmisión sigue visible con el
   indicador de canal oculto. El bloque **Últimas transmisiones** que aparece
   debajo de la vitrina se colapsa con su chevron y pagina 6 transmisiones por
   vez. **Vitrina TV** abre una vista
   a pantalla completa con todas las señales. Cada pantalla tiene accesos
   **Suscribirse** y **Abrir**,
   con los badges EN VIVO / canal / Oficial debajo del video.
   YouTube no permite dar "Me gusta" ni suscribirse dentro de un reproductor
   embebido sin una cuenta de Google, así que esas acciones se confirman en
   YouTube. Cada panel de Novedades carga por su cuenta con spinner y skeleton;
   un panel lento ya no bloquea los demás. Al entrar, los reproductores se
   montan de forma diferida y muestran un **spinner grande** hasta que están
   listos, para que Novedades no se congele. Cada tile crea su reproductor al
   pulsar play (puedes tener varios) y, al cambiar de página dentro de la misma
   pestaña, el ajuste **Reproducción al cambiar de página** decide entre detener
   el video o mantenerlo en el **mini-reproductor**. Puedes cambiarlo en
   **Ajustes → Directos y pantallas**.
3. **Noticias oficiales**: avisos de Pokémon Champions paginados de 6 en 6.
   Las imágenes usan un skeleton con brillo y aparecen con un fade; si una
   imagen falla se muestra un placeholder limpio. Al hacer click se abre un
   **modal dentro de la app** que renderiza la página oficial; "Abrir en el
   navegador" queda siempre disponible.
Los torneos recientes y próximos, junto con el calendario, ahora viven en la
pestaña **Torneos**.

### Calendario de torneos

- Navega mes a mes con las flechas o vuelve a **Hoy**.
- El día actual se marca siempre, aunque esté seleccionado otro día.
- Los días con eventos tienen un punto por categoría (oficial, comunidad,
  personal); el tooltip resume los eventos.
- Al tocar un día se agrupan **Campeonatos oficiales**, **Torneos de la
  comunidad** y **Personales**, con su dirección completa y ficha. Los dos
  primeros grupos se pliegan con su chevron y conservan el contador; el
  calendario de Torneos usa el mismo componente que el widget y se estira a todo
  el ancho del panel.
- El filtro de ciudad solo se aplica a oficiales locales: comunidad y majors
  siguen visibles. País y ciudad son múltiples; las ciudades se agrupan por país
  y el combo de ciudad solo muestra las de los países seleccionados.
- **Añadir evento** crea un evento **personal** (título, fecha, hora, lugar y
  notas) que queda guardado en el calendario de la app. Estos eventos llevan el
  badge **Personal** y se pueden eliminar.
- **Exportar .ics** junto a un torneo descarga el archivo para Google Calendar,
  Outlook o Apple Calendar.
- Los filtros de país y ciudad son los mismos de la lista de próximos torneos.

### Paneles dinámicos

- **Arrastra** el asa de cualquier panel para moverlo.
- Suelta en un **borde lateral** (o en el centro) para dejar dos o más paneles
  **en la misma fila**.
- Suelta en el **borde superior o inferior** para dejar ese panel en su propia
  fila.
- Los botones **Separados** y **Juntos** aplican el layout a todos los paneles.
- El mismo patrón funciona en **Novedades, Torneos, Métricas y Regulación**.
- Cada panel se puede **colapsar** con la flecha; "Contraer todo" / "Expandir
  todo" lo hace en bloque.
- El orden, la agrupación y el estado colapsado se guardan en el equipo.

## Navegación mobile

En pantallas pequeñas, la app muestra un **dock flotante** sobre el contenido:

- **Atrás / Adelante** usan el historial de la vista actual.
- **Lupa** abre el buscador global.
- **`+` junto a la lupa** crea una vista nueva en Panel Principal.
- **Vistas abiertas** abre una hoja con las vistas visitadas y accesos a todas
  las secciones. Puedes cambiar de vista, cerrarla o abrir otra sin perder la
  actual. Es el equivalente mobile de las pestañas de escritorio.
- Por defecto está **fijo abajo centrado**. En Ajustes puedes elegirlo **libre**
  y arrastrarlo con el asa; no hay opción de esquina.
- Al estar activo, el topbar oculta atrás/adelante/lupa para no duplicar
  controles. El dock se puede **desactivar** en Ajustes.

## Qué significan los números

El **porcentaje de uso** de un Pokémon es la fracción de equipos que lo usan al
menos una vez, no la fracción de "huecos" en los equipos. Por ejemplo, si
Incineroar aparece en 60 de cada 100 equipos top, su uso es 60%, aunque cada
equipo tenga 6 huecos.

Lo mismo aplica para items, abilities, moves y Tera: es el porcentaje de equipos
que llevan ese ítem/move/etc.

## De dónde vienen los datos

Los porcentajes salen de los **equipos top** publicados en torneos **Champions
Pokémon de la temporada activa**, recopilados por Labmaus. Cuando Labmaus no
tiene datos, se usa Limitless como respaldo, y como último recurso las
estadísticas globales de Smogon.

## Por qué los números pueden no coincidir con Pikalytics o Labmaus.net

- **Pikalytics** mide partidas de la ladder de Showdown (miles por día). Es una
  métrica distinta: jugar en ladder no es lo mismo que ganar un torneo
  Champions.
- **Labmaus.net** puede usar una ventana distinta (mensual) o filtros por país.
- **Limitless.tcg** cuenta todos los torneos VGC, no sólo los Champions de la
  regulación actual.
- **VGC-Reporter** se enfoca específicamente en *equipos top de torneos
  Champions de la temporada activa*, que es un conjunto más pequeño y más
  estricto.

Las diferencias son por **alcance de fuente y ventana de tiempo**, no por
errores de cálculo.
