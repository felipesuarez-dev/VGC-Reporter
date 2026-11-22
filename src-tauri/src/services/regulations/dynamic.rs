use super::common::{canonical, OpenRoster};
use super::{RegulationRules, Violation};
use crate::domain::regulation::{self, RegulationSnapshot};
use crate::domain::team::Team;
use std::collections::HashSet;

/// Rules for a regulation that was not compiled into the binary. The lists
/// come from the official eligible page plus the curated seed inherited from
/// the previous regulation.
pub struct DynamicRules {
    code: String,
    species: Vec<String>,
    items: Vec<String>,
    moves: Vec<String>,
    roster: OpenRoster,
    restricted: HashSet<String>,
    max_restricted: u8,
}

impl DynamicRules {
    pub fn from_snapshot(snap: &RegulationSnapshot) -> Self {
        let species_set = snap
            .species
            .iter()
            .map(|s| canonical(s))
            .collect::<HashSet<_>>();
        let items_set = snap
            .items
            .iter()
            .map(|s| canonical(s))
            .collect::<HashSet<_>>();
        let moves_set = snap
            .moves
            .iter()
            .map(|s| canonical(s))
            .collect::<HashSet<_>>();
        Self {
            code: snap.info.id.clone(),
            species: snap.species.clone(),
            items: snap.items.clone(),
            moves: snap.moves.clone(),
            roster: OpenRoster {
                species: species_set,
                items: items_set,
                moves: moves_set,
            },
            restricted: snap.restricted.iter().map(|s| canonical(s)).collect(),
            max_restricted: snap.max_restricted,
        }
    }

    pub fn from_code(code: &str) -> Option<Self> {
        regulation::snapshot(code).map(|snap| Self::from_snapshot(&snap))
    }
}

pub fn from_code(code: &str) -> Option<DynamicRules> {
    DynamicRules::from_code(code)
}

impl RegulationRules for DynamicRules {
    fn code(&self) -> &str {
        &self.code
    }

    fn allowed_species(&self) -> Vec<String> {
        self.species.clone()
    }

    fn allowed_items(&self) -> Vec<String> {
        self.items.clone()
    }

    fn allowed_moves(&self) -> Vec<String> {
        self.moves.clone()
    }

    fn validate_team(&self, team: &Team) -> Vec<Violation> {
        let mut out = self.roster.validate(team);
        if self.max_restricted > 0 {
            let found = team
                .members
                .iter()
                .filter(|m| self.restricted.contains(&canonical(&m.species)))
                .count() as u8;
            if found > self.max_restricted {
                out.push(Violation::TooManyRestricted {
                    allowed: self.max_restricted,
                    found,
                });
            }
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::regulation::{
        RegulationConfidence, RegulationInfo, RegulationOrigin, RegulationSnapshot,
        RegulationStatus,
    };

    fn snapshot() -> RegulationSnapshot {
        RegulationSnapshot {
            info: RegulationInfo {
                id: "regulation-m-d".into(),
                label: "Regulation M-D".into(),
                code: "M-D".into(),
                start_at: "2026-12-02T02:00:00Z".into(),
                end_at: None,
                status: RegulationStatus::Active,
                origin: RegulationOrigin::Official,
                confidence: RegulationConfidence::High,
                seasons: Vec::new(),
                active_season: None,
                eligible_count: 2,
                new_species: Vec::new(),
                new_megas: Vec::new(),
                new_items: Vec::new(),
                new_moves: Vec::new(),
                sources: Vec::new(),
                warnings: Vec::new(),
            },
            species: vec!["Pikachu".into(), "Absol-Mega-Z".into()],
            items: vec!["Leftovers".into()],
            moves: vec!["Protect".into()],
            megas: vec!["Absol-Mega-Z".into()],
            restricted: vec!["Pikachu".into()],
            max_restricted: 1,
            limitless_code: Some("M-D".into()),
            labmaus_name: Some("Regulation Set M-D".into()),
            smogon_slug: None,
            data_start: Some("2026-12-02".into()),
            data_end: None,
        }
    }

    #[test]
    fn dynamic_rules_expose_the_new_roster() {
        let rules = DynamicRules::from_snapshot(&snapshot());
        assert_eq!(rules.allowed_species(), vec!["Pikachu", "Absol-Mega-Z"]);
        assert_eq!(rules.allowed_items(), vec!["Leftovers"]);
        assert_eq!(rules.allowed_moves(), vec!["Protect"]);
        assert!(!rules.allowed_species().iter().any(|name| name == "Patrat"));
    }
}
