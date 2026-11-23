# Torneos oficiales y Novedades

## Listado

`ChampionsReportService` combina dos fuentes:

- Limitless para torneos de comunidad, standings y decklists.
- `ChampionshipsClient` para el calendario oficial (Worlds, Internationals, Regionals, Specials).

`official_recent` mezcla calendario completado y próximo para que un major en curso aparezca el mismo fin de semana. `enrich` añade premio en efectivo y campeón Masters desde la página oficial y el endpoint de resultados.

## Modal oficial

`OfficialTournamentModal` usa el `ChampionsTournament` ya cargado para resumen, fecha, sede, premio y campeón. Los standings se piden aparte:

```
get_official_tournament_standings(url, start, size)
```

`ChampionshipsClient::standings` consulta `results.json` y mapea `place`, `display_name`, país, wins/losses/ties y record. El feed oficial **no publica decklists**; por eso la fila de lista dice “Lista no publicada” en vez de inventar datos.

## Novedades

`RecentTournamentsSection` es la superficie reutilizable: lista oficiales, comunidad, filtros, paginación y abre el modal/drawer correspondiente. Cada grupo tiene su propio estado colapsable con el patrón de chevron/hover del Panel Principal. Se monta como panel `recent` del Feed. `dashboardStore` migra layouts antiguos insertando `recent` después de `events` y elimina `recent_tournaments` de Métricas sin duplicar el panel.

El modal oficial solo renderiza el equipo campeón cuando `champion_team` viene con datos de la fuente; si no, mantiene “Lista no publicada”. No se generan equipos, premios ni resultados de relleno.

## Calendario

`FeedCalendar` expande eventos multi-día, usa la zona horaria configurada para eventos con hora y conserva fechas date-only. El día actual se marca aunque no esté seleccionado. El filtro de ciudad se aplica solo a eventos oficiales locales; comunidad y majors no se ocultan. El día seleccionado se agrupa en Oficiales, Comunidad y Personales, con un punto por categoría.
