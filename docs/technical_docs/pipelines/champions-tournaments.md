# Pipeline — Champions Tournaments

## Entradas

- `list_champions_tournaments(format?, limit?)` — `commands/champions.rs`.
- `get_tournament_standings(id)` — `commands/champions.rs`.

Delegados a `ChampionsReportService` (`services/champions_report_service.rs`).

## list_recent

1. `LimitlessClient::list_tournaments_by_format(format, limit*3)` — el factor 3 cubre torneos sin decklist publicada.
2. Prefetch de `get_standings(id)` en paralelo con `futures::future::join_all`.
3. Filtra: conserva sólo torneos con al menos un standing que tenga decklist no vacía (`has_any_decklist`).
4. Mantiene los primeros `limit` que pasan el filtro.

## get_standings

1. `LimitlessClient::get_standings(id)` — llama a `?limit=500` para obtener todos los participantes. Sin este parámetro la API Limitless devuelve ~5 entradas por defecto, lo que causaba que torneos con 9+ jugadores sólo mostraran 5 equipos.
2. **Sprite batching**: recolecta nombres de display únicos (`decklist_display_name`) y los resuelve en bloque vía `PokedexService::sprite_urls_for`. Cada nombre toca pokedex una sola vez aunque aparezca en muchos teams.
3. `into_standing` mapea cada raw a `TournamentStanding`, inyectando los 3 sprite URLs (`primary`, `fallback`, `home`) desde el batch.
4. Si el batch no encontró el nombre, cae a `primary_sprite_url` / `fallback_sprite_url` heurístico.

## Filtros aplicados por Limitless

`list_tournaments_by_format` aplica:

- `filter_champions` — sólo torneos Pokémon Champions.
- `players > 0` — descarta entradas vacías.

## Errores de standings individuales

`tracing::warn!` y se descarta sólo ese torneo, no el batch entero.

## Tests

`champions_report_service.rs::tests`:

- `into_standing_maps_record_parts` — mapea record correctamente.
- `has_any_decklist_*` — cobertura de variantes.
- `sprite_map_injection_overrides_heuristic` — confirma que el batch tiene precedencia sobre la heurística.
