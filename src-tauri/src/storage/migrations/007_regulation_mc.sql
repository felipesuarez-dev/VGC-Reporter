-- Regulation M-C onboarding.
--
-- 001_init.sql seeds `active_format` with INSERT OR IGNORE, so every existing
-- install keeps whatever it was first created with (regulation-m-a) forever.
-- Move anyone still pinned to a closed Champions set onto the active one.
--
-- Idempotent by construction (UPDATE ... WHERE / DELETE ... WHERE), so it
-- survives the re-run that db.rs does on every launch. See CLAUDE.md Regla 2.
UPDATE settings
   SET value = 'regulation-m-c'
 WHERE key = 'active_format'
   AND value IN ('regulation-m-a', 'regulation-m-b');

-- Runtime overrides win over the static defaults in Format::default_*.
-- M-B's rows were written while it borrowed M-A's labmaus label and while the
-- Smogon slug was missing its `gen9champions` prefix; leaving them in place
-- would keep serving the broken values after this release fixes the defaults.
DELETE FROM settings
 WHERE key IN (
   'labmaus_name::reg-m-b',
   'labmaus_name::reg-m-a',
   'smogon_slug::reg-m-b',
   'smogon_slug::reg-m-a'
 );

-- The meta/top-teams/trending payload shape changes in this release; drop the
-- cached blobs so the first launch refetches instead of deserialising a stale
-- snapshot into mostly-empty new fields.
DELETE FROM cache WHERE key LIKE 'meta-snapshot-%'
                     OR key LIKE 'top-teams::%'
                     OR key LIKE 'trending::%';
