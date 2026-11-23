# Panel Principal

El **Panel Principal** (Dashboard en inglés) es la pantalla de inicio y tiene tres vistas en este orden:
**Novedades** (vista inicial), **Métricas** y **Regulación**. Cada una responde
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
- **Próximos torneos**: pestañas **Oficiales** y **Comunidad Limitless**.
  Oficiales reúne los majors de la temporada (**LAIC, NAIC, EUIC, Regionales,
  Especiales y Worlds**) y los eventos presenciales locales. Cada major lleva
  un **badge de nivel** (Mundial/Internacional/Regional/Especial), rango de
  fechas multi-día y, cuando la organización lo publica, el **premio en
  efectivo** con su divisa. Los majors son globales: el filtro país/ciudad solo
  afecta a los eventos locales y nunca los oculta. Por defecto se muestran
  **todos los países**; los combobox de país y **ciudad** tienen buscador y
  puedes marcar un país favorito con la estrella. Cada fila indica su **fuente**
  y abre una ficha con dirección, mapa, contacto, entrada, inscripción,
  categoría, evento premier, estado, ID del torneo, código postal, web del local
  y **Exportar .ics** multi-día. El precio y el premio se muestran como badges.
- **Calendario**: los majors oficiales se expanden a todos sus días y se
  destacan con borde/punto dorado. La hora de cada evento respeta la **zona
  horaria configurada** en Ajustes; las fechas de solo día no se desplazan.
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

## Novedades (Feed)

Es la superficie de "qué está pasando ahora". El orden por defecto es
**Regulación → En vivo → Noticias oficiales → Torneos recientes → Torneos**;
puedes arrastrar los paneles para cambiarlo. Tiene cinco paneles:

1. **Regulación**: resumen de la temporada, instantes oficiales y días de datos.
2. **Transmisión en vivo**: una vitrina de pantallas de YouTube. Por defecto
   incluye **YukS VGC**, Play! Pokémon, WolfeyVGC, CybertronVGC, James Baek,
   PokeAlex, Moxie2D, Pokémon Champions, **Sekiam**, el canal chileno
   **IRNemesis** y un watch party en vivo; puedes cambiar el orden, añadir o
   quitar URLs en Ajustes (una por línea, máximo 12). El panel aparece en su
   propia fila debajo de Regulación. La primera señal en vivo se ve grande a la
   izquierda y las demás en una columna pequeña a la derecha, como YouTube; el
   botón **Destacar** cambia la principal y el selector permite pasar las
   pequeñas abajo. Cada señal tiene un **ojo** para ocultarla sin borrarla de
   la lista: queda como badge EN VIVO con el ojo cerrado y se restaura con un
   click. Si un canal no está en directo, el panel sigue visible y lo indica en
   vez de colapsarse. Los canales que no están en vivo muestran su **última
   transmisión** con los badges “Última transmisión” y “No está en vivo”; si el
   canal está oculto con el ojo, la última transmisión sigue visible con el
   indicador de canal oculto. El bloque **Últimas transmisiones** que aparece
   debajo de la vitrina se colapsa con su chevron. **Vitrina TV** abre una vista
   a pantalla completa con todas las señales. Cada pantalla tiene accesos
   **Suscribirse** y **Abrir**,
   con los badges EN VIVO / canal / Oficial debajo del video.
   YouTube no permite dar "Me gusta" ni suscribirse dentro de un reproductor
   embebido sin una cuenta de Google, así que esas acciones se confirman en
   YouTube. Cada panel de Novedades carga por su cuenta con spinner y skeleton;
   un panel lento ya no bloquea los demás.
3. **Noticias oficiales**: avisos de Pokémon Champions paginados de 6 en 6.
   Las imágenes usan un skeleton con brillo y aparecen con un fade; si una
   imagen falla se muestra un placeholder limpio. Al hacer click se abre un
   **modal dentro de la app** que renderiza la página oficial; "Abrir en el
   navegador" queda siempre disponible.
4. **Torneos recientes**: oficiales y comunidad, con grupos colapsables igual
   que los paneles del Panel Principal. Los oficiales abren un **modal interno**
   con resumen, fecha/rango, sede, premio, campeón, standings oficiales
   paginados, “Lista no publicada” cuando el feed no la publica, equipo campeón
   solo si la fuente lo entrega y “Abrir en el navegador”. Los comunitarios
   conservan standings/decklists y el cajón completo. Un major en curso aparece
   ese mismo fin de semana.
5. **Torneos**: próximos eventos con filtros de país/ciudad, favorito con
   estrella, buscador de texto (nombre, local o dirección, sin importar
   tildes) y fuente visible. La pestaña **Oficiales** separa los **campeonatos
   de la temporada** (LAIC, NAIC, EUIC, Regionales, Especiales y Worlds) de los
   eventos locales; los majors llevan badge de nivel, rango multi-día y premio
   en efectivo cuando está publicado. El listado muestra la dirección completa
   de cada evento. Click en un evento abre una ficha con organizador, teléfono,
   web, local, dirección, mapa OpenStreetMap, entrada, premio, inscripción,
   categoría, evento premier, estado, ID y **Exportar .ics** multi-día. Los
   datos que faltan en el listado se leen de la página oficial de Pokémon y se
   muestran dentro de la ficha; como esa página bloquea los iframes, la app no
   la embebe y mantiene **Abrir en el navegador** como respaldo. La pestaña
   **Calendario** muestra esos mismos eventos en un calendario mensual, con los
   días de campeonato destacados y las horas en la zona horaria configurada. La
   tercera pestaña, **Tablas**, embebe las tablas rápidas de Tipos y Naturalezas.

### Calendario de torneos

- Navega mes a mes con las flechas o vuelve a **Hoy**.
- El día actual se marca siempre, aunque esté seleccionado otro día.
- Los días con eventos tienen un punto por categoría (oficial, comunidad,
  personal); el tooltip resume los eventos.
- Al tocar un día se agrupan **Oficiales**, **Comunidad** y **Personales**, con
  su dirección completa y ficha.
- El filtro de ciudad solo se aplica a oficiales locales: comunidad y majors
  siguen visibles.
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
- Cada panel se puede **colapsar** con la flecha; "Contraer todo" / "Expandir
  todo" lo hace en bloque.
- El orden, la agrupación y el estado colapsado se guardan en el equipo.

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
