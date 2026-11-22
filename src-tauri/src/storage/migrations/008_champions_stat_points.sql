-- Pokémon Champions uses 66 Stat Points (max 32 per stat) instead of EVs.
-- Keep the classic columns for lossless switching and store both spreads.
ALTER TABLE teams ADD COLUMN build_mode TEXT NOT NULL DEFAULT 'classic';
ALTER TABLE team_members ADD COLUMN sp_hp INTEGER NOT NULL DEFAULT 0;
ALTER TABLE team_members ADD COLUMN sp_atk INTEGER NOT NULL DEFAULT 0;
ALTER TABLE team_members ADD COLUMN sp_def INTEGER NOT NULL DEFAULT 0;
ALTER TABLE team_members ADD COLUMN sp_spa INTEGER NOT NULL DEFAULT 0;
ALTER TABLE team_members ADD COLUMN sp_spd INTEGER NOT NULL DEFAULT 0;
ALTER TABLE team_members ADD COLUMN sp_spe INTEGER NOT NULL DEFAULT 0;
