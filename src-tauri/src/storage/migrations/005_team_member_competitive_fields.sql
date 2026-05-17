-- Extend team_members with the competitive metadata required by the
-- Showdown paste format (level, gender, shiny, nickname, per-stat IVs).
-- All columns get sensible defaults so existing rows continue to validate.
ALTER TABLE team_members ADD COLUMN level INTEGER NOT NULL DEFAULT 50;
ALTER TABLE team_members ADD COLUMN gender TEXT;
ALTER TABLE team_members ADD COLUMN shiny INTEGER NOT NULL DEFAULT 0;
ALTER TABLE team_members ADD COLUMN nickname TEXT;
ALTER TABLE team_members ADD COLUMN iv_hp INTEGER NOT NULL DEFAULT 31;
ALTER TABLE team_members ADD COLUMN iv_atk INTEGER NOT NULL DEFAULT 31;
ALTER TABLE team_members ADD COLUMN iv_def INTEGER NOT NULL DEFAULT 31;
ALTER TABLE team_members ADD COLUMN iv_spa INTEGER NOT NULL DEFAULT 31;
ALTER TABLE team_members ADD COLUMN iv_spd INTEGER NOT NULL DEFAULT 31;
ALTER TABLE team_members ADD COLUMN iv_spe INTEGER NOT NULL DEFAULT 31;
