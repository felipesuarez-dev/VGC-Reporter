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
| PokéBase | `https://pokebase.app/pokemon-champions` | 12h | UA de navegador | Equipos de comunidad/torneo y **Top 8 de torneos oficiales** (`ol[aria-label="Top 8"]`). Se empareja el nombre oficial del evento con fecha/tipo/región/tokens. |
| PokéData standings2 | `https://www.pokedata.ovh/standings2` | 6h | UA de navegador | Standings Masters independientes, **bracket Top Cut**, **historial completo por rondas**, equipos de todos los jugadores y divisiones (`Masters`/`Master`) de oficiales. Respaldo si el feed oficial viene vacío; los datos pueden ser no oficiales. |
| Pokémon Zone | `https://www.pokemon-zone.com/champions/tournaments/` | — | — | Fuente externa de consulta; Cloudflare bloquea el fetch directo (403), así que se abre en el navegador y no se scrapea. |
| Championship Series calendar | `https://championships.pokemon.com/api/events.json` | 6h lista · 12h ficha/resultados | UA de navegador | LAIC, NAIC, EUIC, Regionales, Especiales y Worlds; fechas, sede, premio en efectivo y campeón Masters |
| Championship Series results | `https://championships.pokemon.com/api/1/services/results.json` | 12h | UA de navegador | Standings Masters oficiales (`place`, jugador, país, W/L/T y record). No publica decklists. |
| Play! Pokémon YouTube | `https://www.youtube.com/@PlayPokemon` | 5 min | `Accept-Language: en-US` | Detecta el stream **VGC** en vivo desde la pestaña `/streams` (nunca GO/TCG) y la última transmisión pasada real con duración y antigüedad |
| Item sprites | PokéAPI sprites / Showdown itemicons / PokémonDB | cache HTTP | — | Cadena de fallback para los sprites de objetos |

## Notas

- **Labmaus headers**: `LABMAUS_ORIGIN` y `LABMAUS_REFERER` en `src-tauri/src/config.rs`. Inyectados por `HttpClient` para no filtrarlos a otros hosts.
- **Pokepaste cacheado a 30 días**: los pastes son inmutables (URL = hash del contenido).
- **Sprite resolution**: `src-tauri/src/adapters/sprite_resolver.rs` decide URL primaria (Showdown), fallback (Showdown HD) y opcional Home (PokéAPI) por especie.
- **Sin `reqwest::Client::new()` directo**: cualquier fetch nuevo debe usar `HttpClient::get_cached`.
- **Pokedata** devuelve un warning PHP antes del JSON; el parser recorta al primer `{`. El modo "todos los países" omite `_country` y pagina con `/_page/N`.
- **PokéData standings2** publica el JSON en `/standings2/standings/<id>_Masters.json` (o `_Master.json`) y renderiza el bracket en `details.bracket`; se cachean ambos 6h. Si falta el HTML, el Top Cut se deriva de `r` y `swiss_rounds`. El historial de rondas sale del array `r` de cada jugador, cruzado por `i` con el resto de la tabla; también se leen los equipos de todos los jugadores y las divisiones. La fuente se marca como no oficial en la UI.
- **Emparejamiento de torneos**: `domain/event_match.rs` compara fecha ±2 días, tipo (World/International/Regional/Special), región (LAIC/NAIC/EUIC) y tokens normalizados. No se usan regex sobre el nombre completo. Se rechazan las filas TCG de PokéBase. `parse_listing_date` soporta rangos del mismo mes y cruces como `October 31-November 1, 2026`.
- **Pokémon Zone** devuelve 403 por Cloudflare; se ofrece como enlace externo y no se intenta scrapear.
- **Aviso legal**: PokéBase, PokéData y Pokémon Zone no están afiliados, patrocinados ni respaldados por The Pokémon Company International Inc., Nintendo, Creatures Inc. ni GAME FREAK Inc., ni asociados de ninguna forma con ellos. Sus datos pueden ser no oficiales.
- **YouTube** no es una API estable: se lee la pestaña `/streams` y se filtra `watching` + título `VGC`/`Pokémon Champions`/`Championship Sunday`/`Videojuegos Pokémon`. Para la última transmisión se descartan programados/estrenos y se ordena por `Streamed N ago`; la duración sale de `thumbnailBadgeViewModel`. Un video configurado explícitamente se valida contra `videoDetails.isLive`.

## Fallbacks por dominio

- **Regulación activa**: aviso oficial + roster → detección por etiquetas/decklists de Labmaus → semilla estática M-C.
- **Meta snapshot**: Labmaus → Limitless `list_tournaments_by_format` → Smogon chaos.
- **Top Teams**: Labmaus discover_teams → Limitless top standings.
- **Trending**: Labmaus discover_teams en dos ventanas de 7 días.
- **Pokédex**: Showdown → heurísticas de sprite resolver.
- **Próximos torneos**: Limitless online + Pokedata presencial + calendario oficial de Championship Series. Si una fuente falla se muestran las demás. Los majors globales no se filtran por país/ciudad; el detalle incluye fecha multi-día, sede, premio en efectivo cuando está publicado, mapa, contacto, inscripción y `.ics`.
- **Torneos pasados**: Limitless comunidad + oficiales completados/en curso. La lista separa ambos orígenes con badge; los oficiales abren un modal con resumen, premio/campeón, standings oficiales paginados (PokéData como respaldo), **Top Cut con líneas de llaves**, **historial por rondas** con victorias/derrotas, divisiones del evento y **equipos Top 8 de PokéBase** con respaldo de equipos PokéData. Si ninguna fuente publica equipos, se indica “Lista no publicada”.
- **Stream en vivo**: `/streams` VGC → `/live` VGC → `None` (el panel se colapsa). Nunca se usa un stream GO/TCG. La **última transmisión** se elige de la misma pestaña descartando programados/estrenos, con duración y “hace X”.
- **Nombres/descripciones de objetos**: Showdown EN + PokéAPI EN/localizado; cada locale cae a EN; el nombre cae a `prettifyItemName`. Sprites: PokéAPI → Showdown → PokémonDB → icono.
