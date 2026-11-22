# Regulaciones y temporadas

VGC Reporter sigue la regulación de Pokémon Champions que TPC tiene publicada.
No tienes que actualizar la app cuando cambia el set.

## Dónde se ve

- **Panel**: el selector de formato muestra la regulación activa y su temporada,
  por ejemplo `Regulación M-C (M-8)`. Las regulaciones cerradas aparecen como
  archivadas; las que todavía no empiezan aparecen deshabilitadas con la fecha
  de inicio.
- **Ajustes → Regulaciones**: muestra la regulación activa, la última
  sincronización, cuántas especies son elegibles y cuántas Megas nuevas trae.
  También tiene el botón para actualizar el catálogo.
- **Constructor**: los selectores de especie, objeto y movimiento se filtran
  con la lista oficial de la regulación elegida.
- **Mis equipos**: cada equipo muestra la regulación en la que fue creado.

## Seguir la regulación activa

La opción **"Seguir automáticamente la regulación activa"** viene activada. Si
TPC publica un set nuevo, la app cambiará el formato por ti.

Si eliges otro formato manualmente, la app respeta esa elección y deja de
cambiarla. Vuelve a activar la casilla para regresar al seguimiento automático.

## Temporadas

La temporada activa se toma del aviso oficial (`M-8`, por ejemplo) y se
actualiza en el mismo instante UTC que publica TPC, normalmente a las 02:00
UTC. El cambio no depende de la zona horaria de tu equipo, pero la app muestra
ese instante convertido a **tu zona horaria**.

En Chile, `2026-11-04T02:00:00Z` se ve como el **3 de noviembre a las 23:00**.
Los torneos se agrupan por día calendario UTC, así que el primer día completo
de competencia es el **4 de noviembre** y el último es el **1 de diciembre**.
Por eso verás dos líneas:

- **Temporada M-8**: instantes oficiales en tu hora local.
- **Días de datos**: 4 nov → 1 dic, el rango que usan las métricas.

Las métricas parten del 4 de noviembre a propósito: el 3 de noviembre los
torneos todavía pertenecen a la temporada anterior.

## Objetos y Pokémon elegibles

En la vista **Regulación** cada Pokémon y cada objeto permitido muestra su
sprite, nombre localizado y **porcentaje de uso** de la temporada. Puedes
ordenar ambas listas por uso (de mayor a menor) o alfabéticamente.

En los objetos, al hacer click se abre su ficha con la imagen y el efecto. Si
PokéAPI no tiene la descripción o el sprite, la app prueba fuentes alternativas
(Showdown / PokémonDB) y, si ninguna responde, muestra un placeholder en vez de
romper la vista. Un elemento que no aparece en el top de uso medido muestra
`—`, no un 0% inventado.

## Opciones avanzadas

Dentro de Regulaciones hay un apartado **Opciones avanzadas** con overrides de
las fuentes de datos:

- etiqueta de Labmaus
- código de Limitless
- slug de Smogon

Son solo para emergencias, por ejemplo si una fuente cambia un identificador
antes de que salga una actualización. **Volver a la configuración automática**
borra los tres valores y refresca el catálogo.

## Si el aviso oficial se atrasa

La app primero intenta el calendario oficial. Si no hay ninguna regulación
activa y el aviso aún no está publicado, busca torneos recientes con decklists
reales de la nueva etiqueta. Si encuentra datos suficientes, activa el set como
**validado por fuentes** y lo marca con una advertencia. En cuanto TPC publica
el aviso oficial, la app lo reemplaza y quita la advertencia.
