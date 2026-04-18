-- v0.0.8.20260417: switch to labmaus-primary for meta and top-teams.
-- Old cache blobs from meta-snapshot-v6 and top-teams::v5 are stale (different
-- shape, different sources), and there was no labmaus/trending cache before,
-- so any accidental test data under those keys should go too. The HTTP cache
-- entries keyed by full URL survive and remain useful.
DELETE FROM api_cache WHERE url LIKE 'meta-snapshot-%';
DELETE FROM api_cache WHERE url LIKE 'top-teams::%';
DELETE FROM api_cache WHERE url LIKE 'trending::%';
