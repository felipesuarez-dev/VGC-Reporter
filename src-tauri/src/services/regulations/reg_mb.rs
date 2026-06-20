use super::common::{canonical, has_forbidden_form_token};
use super::reg_ma_items::ALLOWED_ITEMS_MA;
use super::reg_ma_moves::ALLOWED_MOVES_MA;
use super::reg_ma_species::ALLOWED_SPECIES_MA;
use super::reg_mb_items::ALLOWED_ITEMS_MB_NEW;
use super::reg_mb_moves::ALLOWED_MOVES_MB_NEW;
use super::reg_mb_species::ALLOWED_SPECIES_MB_NEW;
use super::{RegulationRules, Violation};
use crate::domain::team::{Team, TEAM_SIZE};
use std::collections::HashSet;

/// Pokémon Champions Regulation M-B (season M-3, 2026-06-17 → 2026-09-02).
///
/// Differences vs M-A that matter for validation:
///   - Mega Evolutions are legal (M-A allowed none). They are listed as
///     explicit canonical entries in `ALLOWED_SPECIES_MB_NEW`; the
///     `has_forbidden_form_token` short-circuit in [`Self::matches`] is reached
///     only when an exact entry is absent, so a Mega on the allow-list passes
///     while an off-list Mega (or any Gmax/Primal/Eternamax) is still rejected.
///   - No restricted legendaries this season, so there is no max-restricted
///     cap and no cross-season enforcement.
pub struct RegMbRules {
    allowed_species: HashSet<String>,
    allowed_items: HashSet<String>,
    allowed_moves: HashSet<String>,
}

/// Union a base list with an M-B delta into one canonical lookup set.
fn union_set(base: &[&'static str], delta: &[&'static str]) -> HashSet<String> {
    base.iter().chain(delta.iter()).map(|s| canonical(s)).collect()
}

impl RegMbRules {
    pub fn current() -> Self {
        Self {
            allowed_species: union_set(ALLOWED_SPECIES_MA, ALLOWED_SPECIES_MB_NEW),
            allowed_items: union_set(ALLOWED_ITEMS_MA, ALLOWED_ITEMS_MB_NEW),
            allowed_moves: union_set(ALLOWED_MOVES_MA, ALLOWED_MOVES_MB_NEW),
        }
    }

    /// `true` when `name` matches an entry in `set`, accounting for dashed
    /// Showdown form suffixes (`Calyrex-Shadow`, `Slowking-Galar`) collapsing to
    /// the base entry. Mega forms legal in M-B are present as explicit entries,
    /// so they hit the direct match before the forbidden-form guard; off-list
    /// Mega/Gmax/Primal/Eternamax forms never collapse to their base.
    fn matches(&self, set: &HashSet<String>, name: &str) -> bool {
        let c = canonical(name);
        if set.contains(&c) {
            return true;
        }
        if has_forbidden_form_token(name) {
            return false;
        }
        if let Some(base) = name.split('-').next() {
            if set.contains(&canonical(base)) {
                return true;
            }
        }
        false
    }
}

impl RegulationRules for RegMbRules {
    fn code(&self) -> &'static str {
        "regulation-m-b"
    }

    fn allowed_species(&self) -> Vec<String> {
        ALLOWED_SPECIES_MA
            .iter()
            .chain(ALLOWED_SPECIES_MB_NEW.iter())
            .map(|s| s.to_string())
            .collect()
    }

    fn allowed_items(&self) -> Vec<String> {
        ALLOWED_ITEMS_MA
            .iter()
            .chain(ALLOWED_ITEMS_MB_NEW.iter())
            .map(|s| s.to_string())
            .collect()
    }

    fn allowed_moves(&self) -> Vec<String> {
        ALLOWED_MOVES_MA
            .iter()
            .chain(ALLOWED_MOVES_MB_NEW.iter())
            .map(|s| s.to_string())
            .collect()
    }

    fn validate_team(&self, team: &Team) -> Vec<Violation> {
        let mut out: Vec<Violation> = Vec::new();

        let filled: u8 = team
            .members
            .iter()
            .filter(|m| !m.species.trim().is_empty())
            .count() as u8;
        if (filled as usize) < TEAM_SIZE {
            out.push(Violation::TeamIncomplete { filled });
        }

        let mut seen_species: HashSet<String> = HashSet::new();

        for (idx, m) in team.members.iter().enumerate() {
            let raw = m.species.trim();
            if raw.is_empty() {
                continue;
            }
            let slot = (idx + 1) as u8;

            let key = canonical(raw);
            if !seen_species.insert(key.clone()) {
                out.push(Violation::DuplicateSpecies {
                    species: raw.to_string(),
                });
            }

            if !self.matches(&self.allowed_species, raw) {
                out.push(Violation::SpeciesNotAllowed {
                    species: raw.to_string(),
                });
                continue;
            }

            match &m.item {
                Some(item) if !item.trim().is_empty() => {
                    let item_str = item.trim();
                    if !self.matches(&self.allowed_items, item_str) {
                        out.push(Violation::ItemNotAllowed {
                            slot,
                            species: raw.to_string(),
                            item: item_str.to_string(),
                        });
                    }
                }
                _ => out.push(Violation::MissingItem {
                    slot,
                    species: raw.to_string(),
                }),
            }

            if m.ability.as_deref().unwrap_or("").trim().is_empty() {
                out.push(Violation::MissingAbility {
                    slot,
                    species: raw.to_string(),
                });
            }

            if m.nature.is_none() {
                out.push(Violation::MissingNature {
                    slot,
                    species: raw.to_string(),
                });
            }

            let valid_moves: Vec<&String> =
                m.moves.iter().filter(|s| !s.trim().is_empty()).collect();
            if valid_moves.len() < 4 {
                out.push(Violation::MissingMoves {
                    slot,
                    species: raw.to_string(),
                    have: valid_moves.len() as u8,
                    need: 4,
                });
            }
            for mv in &valid_moves {
                if !self.matches(&self.allowed_moves, mv) {
                    out.push(Violation::MoveNotAllowed {
                        slot,
                        species: raw.to_string(),
                        mv: mv.to_string(),
                    });
                }
            }

            if m.evs.total() == 0 {
                out.push(Violation::EvsNotAssigned {
                    slot,
                    species: raw.to_string(),
                });
            }
        }

        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::evs::EvSpread;
    use crate::domain::nature::Nature;
    use crate::domain::team::TeamMember;
    use crate::domain::{format::Format, team::Team};

    fn complete_member(species: &str) -> TeamMember {
        TeamMember {
            species: species.into(),
            item: Some("Leftovers".into()),
            ability: Some("Levitate".into()),
            nature: Some(Nature::Adamant),
            tera_type: None,
            moves: vec![
                "Earthquake".into(),
                "Protect".into(),
                "Rock Slide".into(),
                "Iron Head".into(),
            ],
            evs: EvSpread {
                hp: 252,
                atk: 252,
                spe: 4,
                ..Default::default()
            },
            level: 50,
            gender: None,
            shiny: false,
            nickname: None,
            ivs: Default::default(),
        }
    }

    fn complete_team(species: &[&str]) -> Team {
        let mut members: Vec<TeamMember> = species.iter().map(|s| complete_member(s)).collect();
        while members.len() < 6 {
            members.push(complete_member("Garchomp"));
        }
        Team {
            id: None,
            name: "t".into(),
            format: Format::RegulationMB,
            notes: None,
            members,
            created_at: None,
            updated_at: None,
        }
    }

    #[test]
    fn delta_counts_match() {
        assert_eq!(ALLOWED_SPECIES_MB_NEW.len(), 97);
        assert_eq!(ALLOWED_ITEMS_MB_NEW.len(), 16);
        assert_eq!(ALLOWED_MOVES_MB_NEW.len(), 10);
    }

    #[test]
    fn inherits_m_a_species() {
        let rules = RegMbRules::current();
        assert!(rules.matches(&rules.allowed_species, "Incineroar"));
        assert!(rules.matches(&rules.allowed_species, "Garchomp"));
    }

    #[test]
    fn new_base_species_allowed() {
        let rules = RegMbRules::current();
        assert!(rules.matches(&rules.allowed_species, "Gholdengo"));
        assert!(rules.matches(&rules.allowed_species, "Annihilape"));
        assert!(rules.matches(&rules.allowed_species, "Metagross"));
    }

    #[test]
    fn legal_megas_allowed() {
        let rules = RegMbRules::current();
        assert!(rules.matches(&rules.allowed_species, "Charizard-Mega-X"));
        assert!(rules.matches(&rules.allowed_species, "Charizard-Mega-Y"));
        assert!(rules.matches(&rules.allowed_species, "Raichu-Mega-X"));
        assert!(rules.matches(&rules.allowed_species, "Raichu-Mega-Y"));
        assert!(rules.matches(&rules.allowed_species, "Gengar-Mega"));
        assert!(rules.matches(&rules.allowed_species, "Dragonite-Mega"));
    }

    #[test]
    fn banned_megas_and_gmax_rejected() {
        let rules = RegMbRules::current();
        // -Mega-Z forms are banned; never added to the allow-list.
        assert!(!rules.matches(&rules.allowed_species, "Lucario-Mega-Z"));
        assert!(!rules.matches(&rules.allowed_species, "Garchomp-Mega-Z"));
        // Gmax / Primal forms remain illegal in every Champions regulation.
        assert!(!rules.matches(&rules.allowed_species, "Charizard-Gmax"));
        assert!(!rules.matches(&rules.allowed_species, "Kyogre-Primal"));
    }

    #[test]
    fn new_mega_stones_allowed() {
        let rules = RegMbRules::current();
        assert!(rules.matches(&rules.allowed_items, "Raichunite X"));
        assert!(rules.matches(&rules.allowed_items, "Sceptilite"));
        assert!(rules.matches(&rules.allowed_items, "Staraptite"));
    }

    #[test]
    fn new_signature_moves_allowed() {
        let rules = RegMbRules::current();
        assert!(rules.matches(&rules.allowed_moves, "Make It Rain"));
        assert!(rules.matches(&rules.allowed_moves, "Rage Fist"));
        assert!(rules.matches(&rules.allowed_moves, "Spirit Break"));
    }

    #[test]
    fn complete_team_has_no_violations() {
        let rules = RegMbRules::current();
        let team = complete_team(&[
            "Gholdengo",
            "Metagross",
            "Incineroar",
            "Rotom",
            "Whimsicott",
            "Kingambit",
        ]);
        assert_eq!(rules.validate_team(&team), Vec::<Violation>::new());
    }

    #[test]
    fn off_list_species_rejected() {
        let rules = RegMbRules::current();
        let team = complete_team(&[
            "Mew",
            "Metagross",
            "Incineroar",
            "Rotom",
            "Whimsicott",
            "Kingambit",
        ]);
        let v = rules.validate_team(&team);
        assert!(v
            .iter()
            .any(|x| matches!(x, Violation::SpeciesNotAllowed { .. })));
    }
}
