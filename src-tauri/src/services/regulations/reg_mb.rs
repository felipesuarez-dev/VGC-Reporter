use super::common::OpenRoster;
use super::reg_ma_items::ALLOWED_ITEMS_MA;
use super::reg_ma_moves::ALLOWED_MOVES_MA;
use super::reg_ma_species::ALLOWED_SPECIES_MA;
use super::reg_mb_items::ALLOWED_ITEMS_MB_NEW;
use super::reg_mb_moves::ALLOWED_MOVES_MB_NEW;
use super::reg_mb_species::ALLOWED_SPECIES_MB_NEW;
use super::{RegulationRules, Violation};
use crate::domain::team::Team;

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
    roster: OpenRoster,
}

impl RegMbRules {
    pub fn current() -> Self {
        Self {
            roster: OpenRoster {
                species: OpenRoster::union(ALLOWED_SPECIES_MA, ALLOWED_SPECIES_MB_NEW),
                items: OpenRoster::union(ALLOWED_ITEMS_MA, ALLOWED_ITEMS_MB_NEW),
                moves: OpenRoster::union(ALLOWED_MOVES_MA, ALLOWED_MOVES_MB_NEW),
            },
        }
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
        self.roster.validate(team)
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
        assert!(OpenRoster::matches(&rules.roster.species, "Incineroar"));
        assert!(OpenRoster::matches(&rules.roster.species, "Garchomp"));
    }

    #[test]
    fn new_base_species_allowed() {
        let rules = RegMbRules::current();
        assert!(OpenRoster::matches(&rules.roster.species, "Gholdengo"));
        assert!(OpenRoster::matches(&rules.roster.species, "Annihilape"));
        assert!(OpenRoster::matches(&rules.roster.species, "Metagross"));
    }

    #[test]
    fn legal_megas_allowed() {
        let rules = RegMbRules::current();
        assert!(OpenRoster::matches(
            &rules.roster.species,
            "Charizard-Mega-X"
        ));
        assert!(OpenRoster::matches(
            &rules.roster.species,
            "Charizard-Mega-Y"
        ));
        assert!(OpenRoster::matches(&rules.roster.species, "Raichu-Mega-X"));
        assert!(OpenRoster::matches(&rules.roster.species, "Raichu-Mega-Y"));
        assert!(OpenRoster::matches(&rules.roster.species, "Gengar-Mega"));
        assert!(OpenRoster::matches(&rules.roster.species, "Dragonite-Mega"));
    }

    #[test]
    fn banned_megas_and_gmax_rejected() {
        let rules = RegMbRules::current();
        // -Mega-Z forms are banned; never added to the allow-list.
        assert!(!OpenRoster::matches(
            &rules.roster.species,
            "Lucario-Mega-Z"
        ));
        assert!(!OpenRoster::matches(
            &rules.roster.species,
            "Garchomp-Mega-Z"
        ));
        // Gmax / Primal forms remain illegal in every Champions regulation.
        assert!(!OpenRoster::matches(
            &rules.roster.species,
            "Charizard-Gmax"
        ));
        assert!(!OpenRoster::matches(&rules.roster.species, "Kyogre-Primal"));
    }

    #[test]
    fn new_mega_stones_allowed() {
        let rules = RegMbRules::current();
        assert!(OpenRoster::matches(&rules.roster.items, "Raichunite X"));
        assert!(OpenRoster::matches(&rules.roster.items, "Sceptilite"));
        assert!(OpenRoster::matches(&rules.roster.items, "Staraptite"));
    }

    #[test]
    fn new_signature_moves_allowed() {
        let rules = RegMbRules::current();
        assert!(OpenRoster::matches(&rules.roster.moves, "Make It Rain"));
        assert!(OpenRoster::matches(&rules.roster.moves, "Rage Fist"));
        assert!(OpenRoster::matches(&rules.roster.moves, "Spirit Break"));
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
