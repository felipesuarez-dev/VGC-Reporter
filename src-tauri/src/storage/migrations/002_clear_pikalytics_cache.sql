-- v0.0.8: the Pikalytics scraper now hits /pokedex/championstournaments/ with
-- new selectors, and SetsBundle no longer has `singles`/`singles_source`. Any
-- cached response from the old endpoint or the old bundle schema is stale.
-- Both are keyed in the api_cache table (HTTP URLs and sets-bundle::<species>
-- blobs share that table via CacheRepo). Purge both prefixes on every boot —
-- this is an idempotent, cheap DELETE that keeps behaviour deterministic.
DELETE FROM api_cache WHERE url LIKE 'https://www.pikalytics.com/%';
DELETE FROM api_cache WHERE url LIKE 'sets-bundle::%';
