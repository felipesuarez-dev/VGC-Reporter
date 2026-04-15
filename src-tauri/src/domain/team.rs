use crate::domain::evs::EvSpread;
use crate::domain::format::Format;
use crate::domain::nature::Nature;
use crate::domain::pokemon::PokemonType;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

pub const TEAM_SIZE: usize = 6;
pub const MOVES_PER_MEMBER: usize = 4;

#[derive(Debug, thiserror::Error, Serialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub enum TeamValidationError {
    #[error("Team must have exactly {TEAM_SIZE} members (got {0})")]
    WrongSize(usize),
    #[error("Slot {0}: EV spread is invalid (>252 per stat or >508 total)")]
    InvalidEvs(usize),
    #[error("Slot {0}: moves must be unique and at most {MOVES_PER_MEMBER}")]
    InvalidMoves(usize),
    #[error("Slot {0}: species is empty")]
    EmptySpecies(usize),
    #[error("Team name is empty")]
    EmptyName,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct TeamMember {
    pub species: String,
    pub item: Option<String>,
    pub ability: Option<String>,
    pub nature: Option<Nature>,
    pub tera_type: Option<PokemonType>,
    pub moves: Vec<String>,
    pub evs: EvSpread,
}

impl TeamMember {
    pub fn empty(species: impl Into<String>) -> Self {
        Self {
            species: species.into(),
            item: None,
            ability: None,
            nature: None,
            tera_type: None,
            moves: Vec::new(),
            evs: EvSpread::default(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct Team {
    #[ts(type = "number | null")]
    pub id: Option<i64>,
    pub name: String,
    pub format: Format,
    pub notes: Option<String>,
    pub members: Vec<TeamMember>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

impl Team {
    pub fn validate(&self) -> Result<(), TeamValidationError> {
        if self.name.trim().is_empty() {
            return Err(TeamValidationError::EmptyName);
        }
        if self.members.len() != TEAM_SIZE {
            return Err(TeamValidationError::WrongSize(self.members.len()));
        }
        for (idx, m) in self.members.iter().enumerate() {
            if m.species.trim().is_empty() {
                return Err(TeamValidationError::EmptySpecies(idx + 1));
            }
            if !m.evs.is_valid() {
                return Err(TeamValidationError::InvalidEvs(idx + 1));
            }
            if m.moves.len() > MOVES_PER_MEMBER {
                return Err(TeamValidationError::InvalidMoves(idx + 1));
            }
            let mut seen: std::collections::HashSet<&str> = std::collections::HashSet::new();
            for mv in &m.moves {
                if !seen.insert(mv.as_str()) {
                    return Err(TeamValidationError::InvalidMoves(idx + 1));
                }
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_member(species: &str) -> TeamMember {
        TeamMember::empty(species)
    }

    fn make_team(name: &str) -> Team {
        Team {
            id: None,
            name: name.to_string(),
            format: Format::RegulationMA,
            notes: None,
            members: (0..6).map(|i| make_member(&format!("pkm{i}"))).collect(),
            created_at: None,
            updated_at: None,
        }
    }

    #[test]
    fn valid_team_passes() {
        assert!(make_team("My Team").validate().is_ok());
    }

    #[test]
    fn empty_name_fails() {
        let mut t = make_team("");
        t.name = "".into();
        assert!(matches!(t.validate(), Err(TeamValidationError::EmptyName)));
    }

    #[test]
    fn wrong_size_fails() {
        let mut t = make_team("X");
        t.members.pop();
        assert!(matches!(
            t.validate(),
            Err(TeamValidationError::WrongSize(5))
        ));
    }

    #[test]
    fn duplicate_moves_fail() {
        let mut t = make_team("X");
        t.members[0].moves = vec!["tackle".into(), "tackle".into()];
        assert!(matches!(
            t.validate(),
            Err(TeamValidationError::InvalidMoves(1))
        ));
    }
}
