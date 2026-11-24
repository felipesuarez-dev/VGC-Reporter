# Torneos oficiales y Novedades

## Listado

`ChampionsReportService` combina dos fuentes:

- Limitless para torneos de comunidad, standings y decklists.
- `ChampionshipsClient` para el calendario oficial (Worlds, Internationals, Regionals, Specials).

`official_recent` mezcla calendario completado y próximo para que un major en curso aparezca el mismo fin de semana. `enrich` añade premio en efectivo y campeón Masters desde la página oficial y el endpoint de resultados.

## Modal oficial

`OfficialTournamentModal` usa el `ChampionsTournament` ya cargado para resumen, fecha, sede, premio y campeón. Los datos se piden aparte y se cachean por nombre/fecha:

```
get_official_tournament_standings(url, start, size, name?, date?)
get_official_tournament_teams(name, date?)
get_official_tournament_detail(name, date?)
```

- `ChampionshipsClient::standings` consulta `results.json` y mapea `place`, `display_name`, país, wins/losses/ties y record.
- Si ese feed viene vacío o falla, `UpcomingTournamentsService` usa `PokedataClient::standings` y devuelve `source = "pokedata"` con `source_url`. La UI lo marca como clasificación PokéData.
- `PokedataClient::top_cut` lee `details.bracket` de la página de standings2 y devuelve las rondas (`Top 16`, `Top 8`, `Top 4`, `Finals`) con seeds, país y ganador/perdedor. Si el HTML no trae bracket (por ejemplo Brisbane), se deriva de los arrays `r` y `swiss_rounds` del JSON. La página se intenta primero con `Masters` y luego con `Master`; las divisiones se leen de `div.division` o del `nav.division-nav-ribbon`.
- `PokedataClient::standings` también construye el historial individual a partir del array `r`: rival (`i`), resultado (3 = victoria, 0 = derrota, 1 = empate), bye (`-1`), placement del rival y fase suiza/top cut.
- El detalle incluye los equipos de **todos** los jugadores publicados por PokéData, no solo el Top 8, y las divisiones del evento (`Masters`/`Master`, `Junior-Senior`, etc.). Los torneos sin Masters muestran sus divisiones y no contaminan las métricas.
- `PokebaseClient::find_tournament` empareja el evento oficial con la página de PokéBase usando `domain/event_match.rs` (fecha ±2 días, tipo, región y tokens normalizados; nunca regex sobre el nombre completo). `tournament_top8` lee `ol[aria-label="Top 8"]` y devuelve los seis Pokémon del equipo con objeto y sprite. `parse_listing_date` acepta rangos del mismo mes y cruces como `October 31-November 1, 2026`.

El feed oficial **no publica decklists**. El modal solo muestra “Publicada” cuando PokéBase devuelve equipos reales; si no, mantiene “Lista no publicada”. No se generan equipos, premios ni resultados de relleno.

## Presentación

- El **Top Cut** es un `<details>` colapsable, abierto por defecto, con scroll horizontal en mobile y columnas por ronda. Usa los tokens de tema (`--border`, `--bg-elev`, `--success`, `--danger`, `--warning`), marca al ganador en verde y dibuja los conectores SVG reales entre rondas.
- El **historial por rondas** se abre desde el chevron de cada fila de standings. Agrupa rondas suizas y Top Cut; cada celda muestra `R{n}`, rival, país, placement y un icono verde/rojo. La misma fila muestra el equipo del jugador y cada Pokémon abre su ficha; al cerrarla se vuelve al torneo.
- Los **equipos Top 8** se muestran en cards colapsables, con los seis sprites, objeto y record del jugador. La ficha de cada Pokémon se apila sobre el detalle del torneo (cerrar la ficha no cierra el torneo).
- El aviso legal de fuentes externas aparece al pie del modal y en Ajustes → Otras fuentes.

## Novedades

`RecentTournamentsSection` es la superficie reutilizable de **Panel → Torneos** y **Top Equipos** (exactamente el mismo componente y props). Toda la fila abre el detalle, "Ver resultados" es igual para oficiales y comunidad, cada grupo tiene búsqueda/país independientes y pagina 10 eventos, sin "Ver más". Se monta como panel `recent` del Feed. `dashboardStore` migra layouts antiguos insertando `recent` después de `events` y elimina `recent_tournaments` de Métricas sin duplicar el panel.

**Top Equipos** reutiliza `get_official_tournament_teams` para los últimos cuatro eventos oficiales. El proveedor **Oficial** muestra esos Top 8 y **Todas las fuentes** antepone hasta 8; cada equipo se marca con `official: true` para la insignia **Torneo oficial**. Las métricas de uso siguen usando solo decklists completas: los Top 8 oficiales son parciales y no se mezclan.

## Calendario

`FeedCalendar` expande eventos multi-día, usa la zona horaria configurada para eventos con hora y conserva fechas date-only. El día actual se marca aunque no esté seleccionado. El filtro de ciudad se aplica solo a eventos oficiales locales; comunidad y majors no se ocultan. El día seleccionado se agrupa en **Campeonatos oficiales**, **Torneos de la comunidad** y **Personales**, con un punto por categoría y paginación de 6 eventos por grupo.
