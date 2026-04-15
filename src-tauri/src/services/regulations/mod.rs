pub mod reg_ma;

use crate::domain::team::Team;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

pub use reg_ma::{current_ma_season, MaSeason, RegMaRules};

#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq, Eq)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum Violation {
    TeamIncomplete { filled: u8 },
    SpeciesNotAllowed { species: String },
    ItemBanned { species: String, item: String },
    MoveBanned { species: String, mv: String },
    TooManyRestricted { allowed: u8, found: u8 },
    RestrictedNotInSeason { species: String, season: String },
    DuplicateSpecies { species: String },
    DuplicateItem { item: String },
}

pub trait RegulationRules: Send + Sync {
    fn code(&self) -> &'static str;
    fn validate_team(&self, team: &Team) -> Vec<Violation>;
}

pub fn rules_for_code(code: &str) -> Option<Box<dyn RegulationRules>> {
    match code {
        "regulation-m-a" | "reg-m-a" | "RegulationMA" => Some(Box::new(RegMaRules::current())),
        _ => None,
    }
}
