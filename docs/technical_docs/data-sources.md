# Fuentes de datos externas

Todo el fetching pasa por `HttpClient::get_cached` (`src-tauri/src/adapters/http_client.rs`), que persiste respuestas en SQLite con TTL por URL.

## Tabla resumen

| Fuente | Host | TTL | Headers especiales | Uso |
|---|---|---|---|---|
| Labmaus | `https://labmaus.net` | 2h top teams · 24h tournaments · 4h trending · 24h catalog | **Origin + Referer obligatorios** (`https://labmaus.net`) | Top Teams, Top Pokémon, Trending, próximos torneos |
| Limitless VGC | `https://play.limitlesstcg.com/api` | 1h listas · 24h detalle | — | Champions tournaments, standings, decklists, fallback de meta |
| Pokémon Showdown | `https://play.pokemonshowdown.com/data` | 7d | — | Pokédex base, moves, items, abilities, sprites |
| Smogon chaos | `https://www.smogon.com/stats` | 24h | — | Fallback de usage cuando el formato es muy nuevo |
| pkmn/data | `https://data.pkmn.cc` | — | — | Sets competitivos curados |
| Pikalytics | `https://www.pikalytics.com/pokedex/championstournaments/<id>` | 24h | — | Detalle por especie: items, abilities, moves, Tera, EVs, compañeros |
| Pokepaste | `https://pokepast.es/<hash>/raw` | 30d (immutable) | `Accept: text/plain` | Resolución de decklists desde Labmaus |
| PokéAPI CSV | `https://pokeapi.co/...` + mirror | 30d | — | Nombres y flavor text bilingüe (EN/ES) |

## Notas

- **Labmaus headers**: `LABMAUS_ORIGIN` y `LABMAUS_REFERER` en `src-tauri/src/config.rs`. Inyectados por `HttpClient` para no filtrarlos a otros hosts.
- **Pokepaste cacheado a 30 días**: los pastes son inmutables (URL = hash del contenido).
- **Sprite resolution**: `src-tauri/src/adapters/sprite_resolver.rs` decide URL primaria (Showdown), fallback (Showdown HD) y opcional Home (PokéAPI) por especie.
- **Sin `reqwest::Client::new()` directo**: cualquier fetch nuevo debe usar `HttpClient::get_cached`.

## Fallbacks por dominio

- **Meta snapshot**: Labmaus → Limitless `list_tournaments_by_format` → Smogon chaos.
- **Top Teams**: Labmaus discover_teams → Limitless top standings.
- **Trending**: Labmaus discover_teams en dos ventanas de 7 días.
- **Pokédex**: Showdown → heurísticas de sprite resolver.
