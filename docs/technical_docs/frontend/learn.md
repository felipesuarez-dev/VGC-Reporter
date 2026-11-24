# Aprender 2.0

## Contenido

`lib/learnContent.ts` es la fachada. Los datos viven separados por responsabilidad:

- `lib/learn/guides.ts`: 12 guías × 5 idiomas, 6 secciones base por guía.
- `lib/learn/guideExtras.ts`: 3 secciones adicionales por guía (ejemplo práctico, errores comunes, checklist), fuentes por guía y fecha de revisión; la fachada concatena y expone 9 secciones.
- `lib/learn/glossary.ts`: 80 términos reales × 5 idiomas y 6 categorías.
- `lib/learn/glossaryDetails.ts`: ejemplo propio en ES/EN/FR/IT/PT y fuentes por término.
- `lib/learn/trivia.ts`: pool ampliado de reglas, con respuesta y explicación.
- `lib/learn/cores.ts`: 11 arquetipos con roles, condición de victoria, cómo se juega y variantes.
- `lib/learn/practice.ts`: generadores puros de práctica diaria.
- `lib/learn/insights.ts`: algoritmo puro de “Datos que importan”.
- `lib/learn/coreTeams.ts`: construye un equipo de prueba usando solo especies del meta actual.

Cada seed declara las cinco traducciones juntas para que una guía no pueda existir en un idioma y faltar en otro.

## Práctica

`dailyPractice({ t, dateKey, meta, pokedex, count: 10 })` usa un PRNG determinista por fecha. Genera:

- tipos: atacante súper efectivo contra un defensor;
- velocidad: comparación con `base_stats.spe` reales;
- lead: mejor respuesta defensiva a una amenaza del meta;
- naturaleza: efecto +10%/−10%;
- Stat Points: conversión a EVs de Showdown;
- cláusulas: especie, objeto y Focus Sash repetido.

Cada pregunta incluye opciones, respuesta correcta y explicación obligatoria. El progreso se guarda por fecha en `vgc-learn-practice-YYYY-MM-DD`; la racha usa `vgc-learn-streak`.

## Insights

`computeMetaInsights(snapshot, trending)` exige `MIN_INSIGHT_SAMPLE = 30` equipos para win rate y top cut. La confianza se calcula con muestra y `sources_covering`:

- alta: ≥100 equipos y ≥2 fuentes;
- media: ≥30 equipos;
- baja: el resto.

Las cards son: mejor win rate, mejor top cut, amenaza emergente, respuesta anti-meta, speed control y objeto clave. Una muestra de 2 equipos nunca puede ganar una card.

## Cores

`buildArchetypeTeam` puntúa especies del meta según el arquetipo (tipos, habilidades, movimientos y stats base), elige hasta seis y rellena el equipo con los datos reales de item/ability/moves/nature del snapshot. Si hay menos de tres especies utilizables, el botón “Probar core” queda deshabilitado y explica que no hay muestra suficiente.
