# Pipeline — Trending

## Entrada
Command `get_trending(format)` — `commands/trending.rs`.
Delegado a `TrendingService::get_trending` — `services/trending_service.rs`.

## Resolución de fuente

1. Lee `SettingsRepo::get("labmaus_name::<format>")` para override runtime.
2. Si no existe, usa `Format::default_labmaus_name()`.

Esto permite rotular nuevas regulations sin re-deploy.

## Ventana

- Total: `LABMAUS_WINDOW_DAYS = 14`.
- Se divide en dos mitades de 7 días: `prev` (días -14..-7) y `curr` (días -7..0).
- Ensanchamiento adaptativo cuando el sample es escaso (`TRENDING_MIN_WINDOW_TEAMS=20.0`).

## Pesos por placement

| Placement | Weight |
|---|---|
| Top 8 (`TRENDING_PLACEMENT_TOPCUT`) | `TRENDING_WEIGHT_TOPCUT = 3.0` |
| 9–32 (`TRENDING_PLACEMENT_DAY2`) | `TRENDING_WEIGHT_DAY2 = 2.0` |
| Resto | `TRENDING_WEIGHT_DEFAULT = 1.0` |

Un peso por team, no por miembro.

## Score

Para cada especie:

1. `count_curr`, `count_prev` (sumas ponderadas).
2. Tasa Bayesiana con shrinkage hacia `TRENDING_PRIOR_RATE = 0.01`, peso `TRENDING_BAYES_K = 8.0`.
3. Score = delta porcentual + `TRENDING_BETA_LOG * log((curr + ε) / (prev + ε))` con `ε = 0.005`.
4. Filtro de muestra mínima: `max(TRENDING_SAMPLE_FRACTION * total, TRENDING_MIN_SAMPLE_FLOOR)`.

## Output

`TrendingReport`:

- `rising`: top 15 con score > 0, sort desc.
- `falling`: top 15 con score < 0, sort asc.
- `window_days`: para que el frontend lo muestre. Lleva `serde(default)` por compatibilidad de cache.

## Sprites

`to_domain` resuelve sprites con `canonical_display_name` y `primary_sprite_url` por especie.
