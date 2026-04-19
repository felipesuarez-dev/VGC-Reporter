# Pipeline — Top Teams

## Entrada
Command `get_top_teams(format, limit?)` — `commands/top_teams.rs`.
Delegado a `TopTeamsService::get_top_teams_report`.

## Flujo principal — Labmaus

`services/top_teams_service.rs`:

1. `LabmausClient::get_discover_teams(from, to, regulation)` con ventana 14d.
2. Toma los primeros `limit` teams según el orden devuelto por Labmaus (placement-based).
3. Resuelve `pokepaste_url` en paralelo (concurrencia 16) vía `PokepasteClient::get_team`.
4. `build_top_team` ensambla cada `TopTeam` con torneo, placing, jugador, país, record, y los 6 miembros (item, ability, tera, EVs, IVs, moves).
5. Sprite por miembro vía `PokedexService::sprite_urls_for(species)`.
6. Filtra equipos con menos de 3 miembros válidos.

## Fallback — Limitless

Cuando Labmaus no devuelve nada útil:

- `LimitlessClient::list_tournaments_by_format` → 10 torneos más recientes.
- Por cada torneo, top 8 standings.
- Construye `TopTeam` desde `decklist` inline.
- Mismo filtro de mínimo 3 miembros.

## Output

```rust
TopTeamsReport { teams: Vec<TopTeam>, meta: TopTeamsMeta }
```

`TopTeamsMeta` indica `source` (`"labmaus.net + pokepast.es"` o `"limitless.tcg"`) y `fetched_at`.

## Notas

- No hay re-scoring: el orden viene del placement de la fuente.
- Cache por URL en `HttpClient` (Labmaus 2h, Pokepaste 30d).
