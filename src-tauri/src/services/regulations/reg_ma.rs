use super::common::{canonical, lookup_set};
use super::reg_ma_items::ALLOWED_ITEMS_MA;
use super::reg_ma_moves::ALLOWED_MOVES_MA;
use super::reg_ma_species::ALLOWED_SPECIES_MA;
use super::{RegulationRules, Violation};
use crate::domain::team::{Team, TEAM_SIZE};
use chrono::{NaiveDate, Utc};
use std::collections::HashSet;

/// Season slice inside Pokémon Champions Regulation M-A.
/// The dates come from the Play! Pokémon 2026 season calendar.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MaSeason {
    M1,
    M2,
}

impl MaSeason {
    pub fn code(self) -> &'static str {
        match self {
            MaSeason::M1 => "M-1",
            MaSeason::M2 => "M-2",
        }
    }
}

/// Resolve the active M-A season from today's date.
/// M-1: 2026-04-08 → 2026-05-12. M-2: 2026-05-13 → 2026-06-17.
pub fn current_ma_season() -> MaSeason {
    let today = Utc::now().date_naive();
    let m2_start = NaiveDate::from_ymd_opt(2026, 5, 13).expect("valid date");
    if today >= m2_start {
        MaSeason::M2
    } else {
        MaSeason::M1
    }
}

/// Cover legendaries available in M-1. A team may include at most one.
const RESTRICTED_M1: &[&str] = &[
    "Mewtwo",
    "Lugia",
    "Ho-Oh",
    "Kyogre",
    "Groudon",
    "Rayquaza",
    "Dialga",
    "Palkia",
    "Giratina",
    "Reshiram",
    "Zekrom",
    "Kyurem",
    "Xerneas",
    "Yveltal",
    "Zygarde",
    "Cosmog",
    "Cosmoem",
    "Solgaleo",
    "Lunala",
    "Necrozma",
    "Zacian",
    "Zamazenta",
    "Eternatus",
    "Calyrex",
    "Koraidon",
    "Miraidon",
    "Terapagos",
];

/// Cover legendaries available in M-2. The list widens relative to M-1.
const RESTRICTED_M2: &[&str] = &[
    "Mewtwo",
    "Lugia",
    "Ho-Oh",
    "Kyogre",
    "Groudon",
    "Rayquaza",
    "Dialga",
    "Palkia",
    "Giratina",
    "Reshiram",
    "Zekrom",
    "Kyurem",
    "Xerneas",
    "Yveltal",
    "Zygarde",
    "Cosmog",
    "Cosmoem",
    "Solgaleo",
    "Lunala",
    "Necrozma",
    "Zacian",
    "Zamazenta",
    "Eternatus",
    "Calyrex",
    "Koraidon",
    "Miraidon",
    "Terapagos",
];

pub struct RegMaRules {
    season: MaSeason,
    allowed_species: HashSet<String>,
    allowed_items: HashSet<String>,
    allowed_moves: HashSet<String>,
    restricted: HashSet<String>,
    max_restricted: u8,
}

impl RegMaRules {
    pub fn new(season: MaSeason) -> Self {
        let restricted_list = match season {
            MaSeason::M1 => RESTRICTED_M1,
            MaSeason::M2 => RESTRICTED_M2,
        };
        Self {
            season,
            allowed_species: lookup_set(ALLOWED_SPECIES_MA),
            allowed_items: lookup_set(ALLOWED_ITEMS_MA),
            allowed_moves: lookup_set(ALLOWED_MOVES_MA),
            restricted: lookup_set(restricted_list),
            max_restricted: 1,
        }
    }

    pub fn current() -> Self {
        Self::new(current_ma_season())
    }

    /// `true` when `species` (raw display name) matches an entry in `set`,
    /// accounting for dashed Showdown form suffixes (`Calyrex-Shadow`,
    /// `Slowking-Galar`) collapsing to the base entry.
    fn matches(&self, set: &HashSet<String>, species: &str) -> bool {
        let c = canonical(species);
        if set.contains(&c) {
            return true;
        }
        if let Some(base) = species.split('-').next() {
            if set.contains(&canonical(base)) {
                return true;
            }
        }
        false
    }
}

impl RegulationRules for RegMaRules {
    fn code(&self) -> &'static str {
        "regulation-m-a"
    }

    fn allowed_species(&self) -> Vec<String> {
        ALLOWED_SPECIES_MA.iter().map(|s| s.to_string()).collect()
    }

    fn allowed_items(&self) -> Vec<String> {
        ALLOWED_ITEMS_MA.iter().map(|s| s.to_string()).collect()
    }

    fn allowed_moves(&self) -> Vec<String> {
        ALLOWED_MOVES_MA.iter().map(|s| s.to_string()).collect()
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
        let mut restricted_count: u8 = 0;

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

            if self.matches(&self.restricted, raw) {
                restricted_count += 1;
            }

            match &m.item {
                None => out.push(Violation::MissingItem {
                    slot,
                    species: raw.to_string(),
                }),
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

        if restricted_count > self.max_restricted {
            out.push(Violation::TooManyRestricted {
                allowed: self.max_restricted,
                found: restricted_count,
            });
        }

        // Season enforcement hook: if a team imports a Pokémon that is only
        // in the other season's restricted list, flag it.
        let other_set: HashSet<String> = match self.season {
            MaSeason::M1 => lookup_set(RESTRICTED_M2),
            MaSeason::M2 => lookup_set(RESTRICTED_M1),
        };
        for m in &team.members {
            let raw = m.species.trim();
            if raw.is_empty() {
                continue;
            }
            if !self.matches(&self.restricted, raw) && self.matches(&other_set, raw) {
                out.push(Violation::RestrictedNotInSeason {
                    species: raw.to_string(),
                    season: self.season.code().to_string(),
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
        }
    }

    fn complete_team(species: &[&str]) -> Team {
        let mut members: Vec<TeamMember> =
            species.iter().map(|s| complete_member(s)).collect();
        while members.len() < 6 {
            members.push(complete_member("Garchomp"));
        }
        Team {
            id: None,
            name: "t".into(),
            format: Format::RegulationMA,
            notes: None,
            members,
            created_at: None,
            updated_at: None,
        }
    }

    fn empty_team(species: &[&str]) -> Team {
        let mut members: Vec<TeamMember> = species.iter().map(|s| TeamMember::empty(*s)).collect();
        while members.len() < 6 {
            members.push(TeamMember::empty(""));
        }
        Team {
            id: None,
            name: "t".into(),
            format: Format::RegulationMA,
            notes: None,
            members,
            created_at: None,
            updated_at: None,
        }
    }

    #[test]
    fn allowed_species_count_matches_186() {
        assert_eq!(ALLOWED_SPECIES_MA.len(), 186);
    }

    #[test]
    fn allowed_items_count_matches_117() {
        assert_eq!(ALLOWED_ITEMS_MA.len(), 117);
    }

    #[test]
    fn allowed_moves_count_matches_467() {
        assert_eq!(ALLOWED_MOVES_MA.len(), 467);
    }

    #[test]
    fn allowed_species_includes_venusaur_and_hydrapple() {
        let rules = RegMaRules::new(MaSeason::M1);
        assert!(rules.matches(&rules.allowed_species, "Venusaur"));
        assert!(rules.matches(&rules.allowed_species, "Hydrapple"));
    }

    #[test]
    fn allowed_species_excludes_mythicals_and_offlist() {
        let rules = RegMaRules::new(MaSeason::M1);
        assert!(!rules.matches(&rules.allowed_species, "Mew"));
        assert!(!rules.matches(&rules.allowed_species, "Magearna"));
        assert!(!rules.matches(&rules.allowed_species, "Pumpkaboo"));
        assert!(!rules.matches(&rules.allowed_species, "Unown"));
    }

    #[test]
    fn complete_team_has_no_violations() {
        let rules = RegMaRules::new(MaSeason::M1);
        let team = complete_team(&[
            "Garchomp",
            "Tinkaton",
            "Incineroar",
            "Rotom",
            "Whimsicott",
            "Kingambit",
        ]);
        assert_eq!(rules.validate_team(&team), Vec::<Violation>::new());
    }

    #[test]
    fn validate_rejects_team_with_missing_item() {
        let rules = RegMaRules::new(MaSeason::M1);
        let mut team = complete_team(&["Garchomp"; 6]);
        // duplicate species generates noise — overwrite with unique allowed set
        team.members = vec![
            complete_member("Garchomp"),
            complete_member("Tinkaton"),
            complete_member("Incineroar"),
            complete_member("Rotom"),
            complete_member("Whimsicott"),
            complete_member("Kingambit"),
        ];
        team.members[2].item = None;
        let v = rules.validate_team(&team);
        assert!(v
            .iter()
            .any(|x| matches!(x, Violation::MissingItem { slot: 3, .. })));
    }

    #[test]
    fn validate_rejects_team_with_zero_evs() {
        let rules = RegMaRules::new(MaSeason::M1);
        let mut team = complete_team(&[
            "Garchomp",
            "Tinkaton",
            "Incineroar",
            "Rotom",
            "Whimsicott",
            "Kingambit",
        ]);
        team.members[0].evs = EvSpread::default();
        let v = rules.validate_team(&team);
        assert!(v
            .iter()
            .any(|x| matches!(x, Violation::EvsNotAssigned { slot: 1, .. })));
    }

    #[test]
    fn validate_rejects_team_with_unknown_item() {
        let rules = RegMaRules::new(MaSeason::M1);
        let mut team = complete_team(&[
            "Garchomp",
            "Tinkaton",
            "Incineroar",
            "Rotom",
            "Whimsicott",
            "Kingambit",
        ]);
        team.members[0].item = Some("Booster Energy".into());
        let v = rules.validate_team(&team);
        assert!(v
            .iter()
            .any(|x| matches!(x, Violation::ItemNotAllowed { slot: 1, .. })));
    }

    #[test]
    fn validate_rejects_team_with_unknown_move() {
        let rules = RegMaRules::new(MaSeason::M1);
        let mut team = complete_team(&[
            "Garchomp",
            "Tinkaton",
            "Incineroar",
            "Rotom",
            "Whimsicott",
            "Kingambit",
        ]);
        team.members[0].moves[0] = "Hidden Power".into();
        let v = rules.validate_team(&team);
        assert!(v
            .iter()
            .any(|x| matches!(x, Violation::MoveNotAllowed { slot: 1, .. })));
    }

    #[test]
    fn validate_rejects_team_with_missing_moves() {
        let rules = RegMaRules::new(MaSeason::M1);
        let mut team = complete_team(&[
            "Garchomp",
            "Tinkaton",
            "Incineroar",
            "Rotom",
            "Whimsicott",
            "Kingambit",
        ]);
        team.members[0].moves = vec!["Earthquake".into(), "Protect".into()];
        let v = rules.validate_team(&team);
        assert!(v.iter().any(|x| matches!(
            x,
            Violation::MissingMoves {
                slot: 1,
                have: 2,
                need: 4,
                ..
            }
        )));
    }

    #[test]
    fn species_not_allowed_when_off_list() {
        let rules = RegMaRules::new(MaSeason::M1);
        let team = complete_team(&[
            "Magearna",
            "Tinkaton",
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

    #[test]
    fn duplicate_species_flagged() {
        let rules = RegMaRules::new(MaSeason::M1);
        let team = complete_team(&[
            "Garchomp",
            "Garchomp",
            "Incineroar",
            "Rotom",
            "Whimsicott",
            "Kingambit",
        ]);
        let v = rules.validate_team(&team);
        assert!(v
            .iter()
            .any(|x| matches!(x, Violation::DuplicateSpecies { .. })));
    }

    #[test]
    fn incomplete_team_flagged() {
        let rules = RegMaRules::new(MaSeason::M1);
        let team = empty_team(&["Garchomp", "Tinkaton"]);
        let v = rules.validate_team(&team);
        assert!(v
            .iter()
            .any(|x| matches!(x, Violation::TeamIncomplete { filled: 2 })));
    }

    #[test]
    fn dashed_form_matches_base_species() {
        // Slowking-Galar (Showdown form name) should still match the base
        // entry "Slowking" in the allow list.
        let rules = RegMaRules::new(MaSeason::M1);
        let team = complete_team(&[
            "Slowking-Galar",
            "Tinkaton",
            "Incineroar",
            "Rotom",
            "Whimsicott",
            "Kingambit",
        ]);
        let v = rules.validate_team(&team);
        assert!(!v
            .iter()
            .any(|x| matches!(x, Violation::SpeciesNotAllowed { .. })));
    }
}
