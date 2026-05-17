-- Basculegion was split into its gendered forms (Basculegion-M and
-- Basculegion-F have different stats — Atk 112 vs SpA 112). Existing
-- team members saved as plain "Basculegion" need to be remapped so they
-- still validate against the new allow-list. We default to -M because
-- it is more common in competitive play; users can edit the team to
-- switch to -F if that was the intended form.
UPDATE team_members
SET species = 'Basculegion-M'
WHERE species = 'Basculegion';
