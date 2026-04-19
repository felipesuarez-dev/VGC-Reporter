# Pokédex

La Pokédex es el catálogo completo de Pokémon, filtrable y ordenable.

## Qué verás

- Grid de cards con sprite, nombre, tipos y stats base.
- Filtros: búsqueda por nombre, tipo, ability, movimiento, generación, debilidades/fortalezas.
- Selector de orden: por uso (meta actual), por generación o alfabético.

## Qué puedes hacer

- Click en una card para abrir el **detalle** del Pokémon.
- En el detalle:
  - Stats base con barras visuales.
  - Tipos y debilidades/resistencias calculadas.
  - Moves agrupados por tier de uso (Common, Very Common, etc.) en el meta actual.
  - Sets competitivos curados (de Pikalytics Commons).
  - Datos de Pikalytics: items más comunes, abilities, EVs típicos, compañeros frecuentes, Tera más jugado.
  - Calculador rápido de matchups por tipo.
- Volver atrás conservando los filtros y la posición de scroll.

## De dónde vienen los datos

- **Stats, tipos, abilities, sprites**: de Pokémon Showdown.
- **Sets y datos detallados de meta** (items, EVs, compañeros): de Pikalytics, página Champions Tournaments.
- **Nombres y descripciones bilingües (ES/EN)**: de PokéAPI.
- **Tier de moves**: calculado a partir del meta actual de torneos Champions M-A.

Todo se cachea localmente para que la próxima visita sea instantánea.
