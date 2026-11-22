use crate::domain::evs::EvSpread;
use crate::domain::format::Format;
use crate::domain::ivs::IvSpread;
use crate::domain::nature::Nature;
use crate::domain::pokemon::PokemonType;
use crate::domain::stat_points::StatPointSpread;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

pub const TEAM_SIZE: usize = 6;

fn canonical_key(value: &str) -> String {
    value
        .to_lowercase()
        .chars()
        .filter(|ch| ch.is_ascii_alphanumeric())
        .collect()
}
pub const MOVES_PER_MEMBER: usize = 4;
pub const DEFAULT_LEVEL: u8 = 50;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
#[serde(rename_all = "lowercase")]
pub enum Gender {
    Male,
    Female,
    Genderless,
}

#[derive(Debug, thiserror::Error, Serialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub enum TeamValidationError {
    #[error("Team must have exactly {TEAM_SIZE} members (got {0})")]
    WrongSize(usize),
    #[error("Slot {0}: EV spread is invalid (>252 per stat or >508 total)")]
    InvalidEvs(usize),
    #[error("Slot {0}: Stat Points are invalid (>32 per stat or >66 total)")]
    InvalidStatPoints(usize),
    #[error("Team repeats the species {0}")]
    DuplicateSpecies(String),
    #[error("Team repeats the item {0}")]
    DuplicateItem(String),
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
    #[serde(default = "default_level")]
    pub level: u8,
    #[serde(default)]
    pub gender: Option<Gender>,
    #[serde(default)]
    pub shiny: bool,
    #[serde(default)]
    pub nickname: Option<String>,
    #[serde(default)]
    pub ivs: IvSpread,
    /// Champions stat points. Kept alongside EVs so switching modes is a
    /// conversion, never a data loss.
    #[serde(default)]
    pub stat_points: StatPointSpread,
}

fn default_level() -> u8 {
    DEFAULT_LEVEL
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
            level: DEFAULT_LEVEL,
            gender: None,
            shiny: false,
            nickname: None,
            ivs: IvSpread::default(),
            stat_points: StatPointSpread::default(),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, Default)]
#[serde(rename_all = "snake_case")]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub enum BuildMode {
    #[default]
    Classic,
    Champions,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct Team {
    #[ts(type = "number | null")]
    pub id: Option<i64>,
    pub name: String,
    pub format: Format,
    #[serde(default)]
    pub build_mode: BuildMode,
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
        let mut species_seen: std::collections::HashSet<String> = std::collections::HashSet::new();
        let mut items_seen: std::collections::HashSet<String> = std::collections::HashSet::new();
        for (idx, m) in self.members.iter().enumerate() {
            if m.species.trim().is_empty() {
                return Err(TeamValidationError::EmptySpecies(idx + 1));
            }
            if self.build_mode == BuildMode::Champions {
                if !m.stat_points.is_valid() {
                    return Err(TeamValidationError::InvalidStatPoints(idx + 1));
                }
                let species = canonical_key(&m.species);
                if !species_seen.insert(species) {
                    return Err(TeamValidationError::DuplicateSpecies(m.species.clone()));
                }
                if let Some(item) = m.item.as_deref().filter(|item| !item.trim().is_empty()) {
                    let item = canonical_key(item);
                    if !items_seen.insert(item) {
                        return Err(TeamValidationError::DuplicateItem(
                            m.item.clone().unwrap_or_default(),
                        ));
                    }
                }
            } else if !m.evs.is_valid() {
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
            format: Format::ma(),
            build_mode: BuildMode::Classic,
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
