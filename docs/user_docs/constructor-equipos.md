# Constructor de equipos

Pantalla para armar tus propios equipos VGC con validación automática contra la regulación activa.

## Qué verás

- 6 slots para los miembros del equipo.
- Por cada miembro: especie, item, ability, naturaleza, Tera type, hasta 4 movimientos y los 6 EVs (HP/Atk/Def/SpA/SpD/Spe).
- Indicadores de validación: total de EVs (máx 508), por stat (máx 252), movimientos únicos.
- Acciones: importar desde texto Showdown, exportar a texto Showdown, guardar.

## Qué puedes hacer

- **Crear un equipo nuevo** desde cero.
- **Importar** un equipo pegando texto en formato Pokémon Showdown. Si algún Pokémon no se reconoce, te aparece un diálogo para resolverlo manualmente.
- **Exportar** el equipo como texto Showdown para pegarlo en otra herramienta.
- **Guardar** el equipo con un nombre. Queda disponible en *Mis equipos*.
- **Validar** el equipo: la app marca violaciones de la regulación (especie baneada, item ilegal, etc.).

## EVs

- Máximo 252 por stat.
- Máximo 508 totales.
- Los sliders te avisan visualmente cuando te pasas.

## De dónde vienen los datos

- Lista de Pokémon, items, abilities y movimientos: de Pokémon Showdown.
- Movimientos válidos por especie (learnsets): combinación de Showdown y datos curados.
- Reglas de la regulación: definidas localmente en el código (`regulations`), siguiendo las reglas oficiales de Play! Pokémon.
