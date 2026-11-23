# Fuentes de datos externas

Todo el fetching pasa por `HttpClient::get_cached` (`src-tauri/src/adapters/http_client.rs`), que persiste respuestas en SQLite con TTL por URL.

## Tabla resumen

| Fuente | Host | TTL | Headers especiales | Uso |
|---|---|---|---|---|
| Pokémon HOME (oficial) | `https://champions-news.pokemon-home.com/en/json/list.json` | 1h | — | Calendario de regulación/temporada, nuevas Megas, link al roster |
| Roster oficial | `https://web-view.app.pokemonchampions.jp/.../pokemon.html` | 1h | — | Especies elegibles de la regulación |
| Labmaus | `https://labmaus.net` | 2h top teams · 24h tournaments · 4h trending · 24h catalog | **Origin + Referer obligatorios** (`https://labmaus.net`) | Top Teams, Top Pokémon, Trending, próximos torneos, detección por fuentes |
| Limitless VGC | `https://play.limitlesstcg.com/api` | 1h listas · 24h detalle | — | Champions tournaments, standings, decklists, fallback de meta |
| Pokémon Showdown | `https://play.pokemonshowdown.com/data` | 7d | — | Pokédex base, moves, items, abilities, sprites |
| Smogon chaos | `https://www.smogon.com/stats` | 24h | — | Fallback de usage cuando el formato es muy nuevo |
| pkmn/data | `https://data.pkmn.cc` | — | — | Sets competitivos curados |
| Pikalytics | `https://www.pikalytics.com/pokedex/championstournaments/<id>` | 24h | — | Detalle por especie: items, abilities, moves, Tera, EVs, compañeros |
| Pokepaste | `https://pokepast.es/<hash>/raw` | 30d (immutable) | `Accept: text/plain` | Resolución de decklists desde Labmaus |
| PokéAPI CSV | `https://pokeapi.co/...` + mirror | 30d | — | Nombres y flavor text bilingüe (EN/ES) |
| Pokedata event locator | `https://pokedata.ovh/events/apiv2` | 6h | UA de navegador | Próximos League Challenges/Cups presenciales: dirección, coordenadas, contacto, entrada e inscripción (espejo del localizador oficial) |
| Championship Series calendar | `https://championships.pokemon.com/api/events.json` | 6h lista · 12h ficha/resultados | UA de navegador | LAIC, NAIC, EUIC, Regionales, Especiales y Worlds; fechas, sede, premio en efectivo y campeón Masters |
| Championship Series results | `https://championships.pokemon.com/api/1/services/results.json` | 12h | UA de navegador | Standings Masters oficiales (`place`, jugador, país, W/L/T y record). No publica decklists. |
| Play! Pokémon YouTube | `https://www.youtube.com/@PlayPokemon` | 5 min | `Accept-Language: en-US` | Detecta el stream **VGC** en vivo desde la pestaña `/streams` (nunca GO/TCG) |
| Item sprites | PokéAPI sprites / Showdown itemicons / PokémonDB | cache HTTP | — | Cadena de fallback para los sprites de objetos |

## Notas

- **Labmaus headers**: `LABMAUS_ORIGIN` y `LABMAUS_REFERER` en `src-tauri/src/config.rs`. Inyectados por `HttpClient` para no filtrarlos a otros hosts.
- **Pokepaste cacheado a 30 días**: los pastes son inmutables (URL = hash del contenido).
- **Sprite resolution**: `src-tauri/src/adapters/sprite_resolver.rs` decide URL primaria (Showdown), fallback (Showdown HD) y opcional Home (PokéAPI) por especie.
- **Sin `reqwest::Client::new()` directo**: cualquier fetch nuevo debe usar `HttpClient::get_cached`.
- **Pokedata** devuelve un warning PHP antes del JSON; el parser recorta al primer `{`. El modo "todos los países" omite `_country` y pagina con `/_page/N`.
- **YouTube** no es una API estable: se lee la pestaña `/streams` y se filtra `watching` + título `VGC`/`Pokémon Champions`. Un video configurado explícitamente se valida contra `videoDetails.isLive`.

## Fallbacks por dominio

- **Regulación activa**: aviso oficial + roster → detección por etiquetas/decklists de Labmaus → semilla estática M-C.
- **Meta snapshot**: Labmaus → Limitless `list_tournaments_by_format` → Smogon chaos.
- **Top Teams**: Labmaus discover_teams → Limitless top standings.
- **Trending**: Labmaus discover_teams en dos ventanas de 7 días.
- **Pokédex**: Showdown → heurísticas de sprite resolver.
- **Próximos torneos**: Limitless online + Pokedata presencial + calendario oficial de Championship Series. Si una fuente falla se muestran las demás. Los majors globales no se filtran por país/ciudad; el detalle incluye fecha multi-día, sede, premio en efectivo cuando está publicado, mapa, contacto, inscripción y `.ics`.
- **Torneos pasados**: Limitless comunidad + oficiales completados/en curso. La lista separa ambos orígenes con badge; los oficiales abren un modal con resumen, premio/campeón, standings oficiales paginados y “Lista no publicada” cuando el feed no incluye decklists.
- **Stream en vivo**: `/streams` VGC → `/live` VGC → `None` (el panel se colapsa). Nunca se usa un stream GO/TCG.
- **Nombres/descripciones de objetos**: Showdown EN + PokéAPI EN/localizado; cada locale cae a EN; el nombre cae a `prettifyItemName`. Sprites: PokéAPI → Showdown → PokémonDB → icono.
