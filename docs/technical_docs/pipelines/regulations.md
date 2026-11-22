# Pipeline - Regulaciones dinámicas

## Objetivo

La app no debe requerir una release nueva cuando TPC publica una regulación o
mueve una fecha. El catálogo de regulaciones se descubre en runtime, se valida
contra el calendario oficial y, solo si el aviso oficial aún no existe, contra
fuentes de torneos con decklists reales.

## Entradas

| Fuente | Uso | Frecuencia |
|---|---|---|
| `champions-news.pokemon-home.com/en/json/list.json` | Índice de avisos. Se filtran `infoKind` 11 (temporada) y 12 (regulación). | TTL 1 h |
| Artículo oficial de la regulación | Código (`M-C`), fechas UTC, nuevas Megas y link al roster elegible. | TTL 1 h |
| Artículo oficial de la temporada | Nombre (`M-8`) y fechas del split. | TTL 1 h |
| `web-view.app.pokemonchampions.jp/.../pokemon.html` | Lista oficial de especies elegibles (`const pokemons = [[id, ?, "Nombre"], ...]`). | TTL 1 h |
| Labmaus `completed_tournaments` | Detección de una regulación aún no publicada por TPC. | Solo si no hay regulación activa. |
| Labmaus `discover_teams` | Confirma que la regulación detectada tiene datos reales (≥1 decklist). | Solo en la detección por fuentes. |

## Flujo

1. `RegulationService::ensure_fresh(force)` revisa el TTL en memoria (6 h).
   `force=true` (botón de Settings) ignora también la caché HTTP.
2. Se publican siempre los snapshots estáticos M-A / M-B / M-C. La app queda
   usable incluso sin red.
3. `OfficialRegulationClient::discover` elige el aviso más reciente por
   `pubAt`/`stAt`, parsea las dos primeras fechas UTC del artículo, las nuevas
   Megas y el link al roster.
4. `apply_official` actualiza el snapshot estático si el código ya existe o
   agrega uno nuevo. El origen pasa a `official` y la confianza a `high`.
5. Si **no** hay ninguna regulación activa (por ejemplo, el día del cambio con
   el aviso oficial atrasado), `detect_sources` busca etiquetas
   `Regulation Set M-X` en torneos completados de los últimos 30 días y exige
   al menos una decklist en los últimos 14 días. La lista de especies observada
   se completa con la allow-list de M-C y el resultado se publica como
   `source_validated` con confianza `medium` (≥10 equipos) o `low`.
6. `domain::regulation::publish` reemplaza el registry en memoria. `Format`,
   `rules_for_code`, los selectores y los servicios de datos leen de ahí.

## Reglas de validación

- El roster oficial es la lista de especies autoritativa. Si el oficial choca
  con una fuente, gana el oficial.
- Un equipo se valida con `DynamicRules`, que reutiliza `OpenRoster`
  (species/items/moves) y aplica el límite de restringidos del snapshot.
- `DuplicateItem` se evalúa en todos los validadores (M-A, M-B, M-C y
  dinámicos).
- Una fuente que declara otra regulación se excluye del merge (`weight = 0`) y
  se muestra en provenance como no vigente. Champteams declara M-B y por eso
  hoy no contamina el meta de M-C.
- Una regulación `archived` no se borra: queda seleccionable si el usuario
  activa "Mostrar archivadas". Una `upcoming` se muestra deshabilitada con la
  fecha de inicio publicada.

## Fechas

Todas las fechas se guardan como instantes RFC 3339 en UTC. El cambio de
regulación ocurre en el instante publicado (habitualmente `02:00 UTC`), no a
medianoche local ni en una fecha hardcodeada. El frontend reevalúa el estado
cada minuto y el backend cada 6 h o al refrescar.

La ventana de datos de una regulación (`data_start` / `data_end`) usa el último
día completo: si el aviso termina `2026-12-02T01:59Z`, el último día de datos
es `2026-12-01`.

Las temporadas aplican la misma regla en `SeasonInfo::data_window`: el inicio
conserva la fecha UTC del instante (`2026-11-04T02:00Z` → `2026-11-04`) y un
final antes de las 06:00 UTC retrocede un día (`2026-12-02T01:59Z` →
`2026-12-01`). En Chile esos instantes se ven como 3 nov 23:00 → 1 dic 22:59,
pero los torneos se agrupan por día UTC, así que las métricas parten el 4 de
noviembre. La UI muestra ambos rangos (`feed.data_days`) para evitar la
sensación de que la fecha oficial y el filtro no coinciden.

## Uso por objeto

El snapshot de meta devuelve `top_items` con hasta 200 entradas para que la
vista Regulación pueda mostrar el uso de casi todo el allow-list, no sólo del
top 10 del Dashboard. El merge normaliza las claves (minúsculas alfanuméricas)
para unir variantes como `Focus Sash` y `Focussash`, suma sus aportes ponderados
y conserva el nombre con espacios para mostrar. La vista usa la misma ventana
de temporada que Métricas; lo que no aparece en el top medido se muestra como
`—`.

## Overrides avanzados

Settings → Regulaciones → Opciones avanzadas permite fijar manualmente:

- `labmaus_name::<id>`
- `limitless_code::<id>`
- `smogon_slug::<id>`

Son una salida de emergencia. El botón "Volver a la configuración automática"
borra las tres claves y fuerza un refresco. La UI advierte que no son el camino
normal.

## Archivos clave

- `src-tauri/src/adapters/official_regulation_client.rs`
- `src-tauri/src/services/regulation_service.rs`
- `src-tauri/src/services/regulations/dynamic.rs`
- `src-tauri/src/domain/regulation.rs`
- `src-tauri/src/domain/format.rs`
- `frontend/src/hooks/useRegulationCatalog.ts`
- `frontend/src/lib/regulations.ts`
- `frontend/src/pages/Settings.tsx`

## Verificación en vivo

`bun scripts/probe-sources.ts` comprueba etiquetas de Labmaus, slugs de Smogon,
la regulación declarada por Champteams y el calendario/roster oficial. Es la
forma rápida de detectar un cambio upstream antes de taggear.
