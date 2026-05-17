# Panel

El Panel es la pantalla principal y muestra el "estado del meta" de Regulation M-A en un vistazo.

## Qué verás

- **Top Pokémon**: tres visualizaciones intercambiables con los Pokémon más usados — barras horizontales (sprite + porcentaje), grid de iconos, y un treemap de "meta share" donde cada rectángulo es proporcional al uso y está coloreado por el tipo primario. Por defecto se muestran 10; el botón "Ver más" amplía el listado.
- **Top items, movimientos, abilities y Tera**: rankings agrupados con el porcentaje de equipos que usan cada uno.
- **Trending**: Pokémon que más están subiendo o bajando en uso comparando los últimos 7 días contra los 7 anteriores.
- **Próximos torneos**: torneos VGC programados para los próximos 14 días (Limitless).
- **Champions tournaments**: torneos Champions recientes con sus standings y decklists. Click en una fila abre el cajón lateral.
- **Fuentes**: chips clickables a Labmaus, Limitless y Pikalytics.

## Qué puedes hacer

- Hacer click en un Pokémon del Top para abrir su ficha de Pokédex.
- Cambiar de regulación desde el selector (cuando haya más de una activa).
- Cambiar la cantidad de torneos que se consideran (afecta a los rankings).

## Qué significan los números

El **porcentaje de uso** de un Pokémon es la fracción de equipos que lo usan al menos una vez, no la fracción de "huecos" en los equipos. Por ejemplo, si Incineroar aparece en 60 de cada 100 equipos top, su uso es 60%, aunque cada equipo tenga 6 huecos.

Lo mismo aplica para items, abilities, moves y Tera: es el porcentaje de equipos que llevan ese ítem/move/etc.

## De dónde vienen los datos

Los porcentajes salen de los **equipos top** publicados en torneos **Champions Pokémon de los últimos 14 días**, recopilados por Labmaus. Cuando Labmaus no tiene datos, se usa Limitless como respaldo, y como último recurso las estadísticas globales de Smogon.

## Por qué los números pueden no coincidir con Pikalytics o Labmaus.net

- **Pikalytics** mide partidas de la ladder de Showdown (miles por día). Es una métrica distinta: jugar en ladder no es lo mismo que ganar un torneo Champions.
- **Labmaus.net** puede usar una ventana distinta (mensual) o filtros por país.
- **Limitless.tcg** cuenta todos los torneos VGC, no sólo los Champions de la regulación actual.
- **VGC-Reporter** se enfoca específicamente en *equipos top de torneos Champions M-A de los últimos 14 días*, que es un conjunto más pequeño y más estricto.

Las diferencias son por **alcance de fuente y ventana de tiempo**, no por errores de cálculo.
