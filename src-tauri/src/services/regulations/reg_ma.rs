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

/// Canonical form used for species comparisons: lowercase, ascii-alphanumeric only.
fn canonical(name: &str) -> String {
    name.chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .map(|c| c.to_ascii_lowercase())
        .collect()
}

/// Mythical Pokémon that are universally banned in VGC formats.
const BANNED_MYTHICALS: &[&str] = &[
    "Mew",
    "Celebi",
    "Jirachi",
    "Deoxys",
    "Phione",
    "Manaphy",
    "Darkrai",
    "Shaymin",
    "Arceus",
    "Victini",
    "Keldeo",
    "Meloetta",
    "Genesect",
    "Diancie",
    "Hoopa",
    "Volcanion",
    "Magearna",
    "Marshadow",
    "Zeraora",
    "Zarude",
    "Pecharunt",
];

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
    banned: HashSet<String>,
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
            banned: BANNED_MYTHICALS.iter().map(|s| canonical(s)).collect(),
            restricted: restricted_list.iter().map(|s| canonical(s)).collect(),
            max_restricted: 1,
        }
    }

    pub fn current() -> Self {
        Self::new(current_ma_season())
    }

    /// `true` when `species` (raw Showdown display name) matches an entry in
    /// `set`, accounting for dashed forms like `Calyrex-Shadow` collapsing to
    /// the base `Calyrex` entry.
    fn matches(&self, set: &HashSet<String>, species: &str) -> bool {
        let c = canonical(species);
        if set.contains(&c) {
            return true;
        }
        // Strip trailing form suffix: "Calyrex-Shadow" → "Calyrex".
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

        for m in &team.members {
            let raw = m.species.trim();
            if raw.is_empty() {
                continue;
            }
            let key = canonical(raw);
            if !seen_species.insert(key.clone()) {
                out.push(Violation::DuplicateSpecies {
                    species: raw.to_string(),
                });
            }
            if self.matches(&self.banned, raw) {
                out.push(Violation::SpeciesNotAllowed {
                    species: raw.to_string(),
                });
                continue;
            }
            if self.matches(&self.restricted, raw) {
                restricted_count += 1;
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
            MaSeason::M1 => RESTRICTED_M2.iter().map(|s| canonical(s)).collect(),
            MaSeason::M2 => RESTRICTED_M1.iter().map(|s| canonical(s)).collect(),
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
    use crate::domain::team::TeamMember;
    use crate::domain::{format::Format, team::Team};

    fn team_of(species: &[&str]) -> Team {
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
    fn clean_team_has_no_violations() {
        let rules = RegMaRules::new(MaSeason::M1);
        let team = team_of(&[
            "Flutter Mane",
            "Urshifu",
            "Rillaboom",
            "Incineroar",
            "Amoonguss",
            "Ogerpon",
        ]);
        assert_eq!(rules.validate_team(&team), Vec::<Violation>::new());
    }

    #[test]
    fn banned_mythical_is_flagged() {
        let rules = RegMaRules::new(MaSeason::M1);
        let team = team_of(&[
            "Mew",
            "Urshifu",
            "Rillaboom",
            "Incineroar",
            "Amoonguss",
            "Ogerpon",
        ]);
        let v = rules.validate_team(&team);
        assert!(matches!(
            v.first(),
            Some(Violation::SpeciesNotAllowed { .. })
        ));
    }

    #[test]
    fn duplicate_species_flagged() {
        let rules = RegMaRules::new(MaSeason::M1);
        let team = team_of(&[
            "Urshifu",
            "Urshifu",
            "Rillaboom",
            "Incineroar",
            "Amoonguss",
            "Ogerpon",
        ]);
        let v = rules.validate_team(&team);
        assert!(v
            .iter()
            .any(|x| matches!(x, Violation::DuplicateSpecies { .. })));
    }

    #[test]
    fn two_restricted_flagged() {
        let rules = RegMaRules::new(MaSeason::M1);
        let team = team_of(&[
            "Miraidon",
            "Koraidon",
            "Rillaboom",
            "Incineroar",
            "Amoonguss",
            "Ogerpon",
        ]);
        let v = rules.validate_team(&team);
        assert!(v.iter().any(|x| matches!(
            x,
            Violation::TooManyRestricted {
                allowed: 1,
                found: 2
            }
        )));
    }

    #[test]
    fn incomplete_team_flagged() {
        let rules = RegMaRules::new(MaSeason::M1);
        let team = team_of(&["Urshifu", "Rillaboom"]);
        let v = rules.validate_team(&team);
        assert!(v
            .iter()
            .any(|x| matches!(x, Violation::TeamIncomplete { filled: 2 })));
    }

    #[test]
    fn dashed_form_matches_base_restricted() {
        let rules = RegMaRules::new(MaSeason::M1);
        let team = team_of(&[
            "Calyrex-Shadow",
            "Urshifu",
            "Rillaboom",
            "Incineroar",
            "Amoonguss",
            "Ogerpon",
        ]);
        let v = rules.validate_team(&team);
        assert!(!v
            .iter()
            .any(|x| matches!(x, Violation::TooManyRestricted { .. })));
    }
}
