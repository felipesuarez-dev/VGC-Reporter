# Calculador de daño

Calculadora de daño integrada (motor `@smogon/calc`, generación 9) — la misma que usan las herramientas estándar de la comunidad.

## Qué verás

- Dos paneles "Atacante" y "Defensor" con: especie, item, ability, naturaleza, EVs, IVs, nivel, Tera, boosts de stats, estado.
- Selector de movimiento.
- Modificadores globales: clima (sol, lluvia, arena, nieve), terreno (eléctrico, psíquico, herbal, brumoso), Trick Room, Tailwind, etc.
- Resultado: rango de daño en HP, porcentaje, posibilidad de OHKO/2HKO, descripción detallada.

## Qué puedes hacer

- Calcular cuánto daño hace un movimiento dado un escenario.
- Probar variantes (cambiar EVs, item o Tera) para ajustar tus spreads.
- Ver el detalle textual del cálculo para verificar exactamente qué modificadores se aplicaron.

## De dónde vienen los datos

- Listas de Pokémon, items y movimientos: de Pokémon Showdown (la misma fuente que el resto de la app).
- Motor de cálculo: librería `@smogon/calc` Gen 9, mantenida por la comunidad y validada contra los mecanismos del juego.

## Notas

- El cálculo es **determinístico**: con los mismos inputs siempre da el mismo rango.
- La aleatoriedad en el juego viene del **damage roll** (16 valores entre 0.85× y 1.00×). El calculador te da el rango completo y la probabilidad de OHKO/2HKO.
