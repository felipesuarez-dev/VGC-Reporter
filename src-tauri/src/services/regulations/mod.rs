pub mod common;
pub mod reg_ma;
mod reg_ma_items;
mod reg_ma_moves;
mod reg_ma_species;
pub mod reg_mb;
mod reg_mb_items;
mod reg_mb_moves;
mod reg_mb_species;

use crate::domain::team::Team;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

pub use reg_ma::{current_ma_season, MaSeason, RegMaRules};
pub use reg_mb::RegMbRules;

#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq, Eq)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum Violation {
    TeamIncomplete {
        filled: u8,
    },
    SpeciesNotAllowed {
        species: String,
    },
    ItemBanned {
        species: String,
        item: String,
    },
    MoveBanned {
        species: String,
        mv: String,
    },
    TooManyRestricted {
        allowed: u8,
        found: u8,
    },
    RestrictedNotInSeason {
        species: String,
        season: String,
    },
    DuplicateSpecies {
        species: String,
    },
    DuplicateItem {
        item: String,
    },
    MissingItem {
        slot: u8,
        species: String,
    },
    MissingAbility {
        slot: u8,
        species: String,
    },
    MissingNature {
        slot: u8,
        species: String,
    },
    MissingMoves {
        slot: u8,
        species: String,
        have: u8,
        need: u8,
    },
    EvsNotAssigned {
        slot: u8,
        species: String,
    },
    ItemNotAllowed {
        slot: u8,
        species: String,
        item: String,
    },
    MoveNotAllowed {
        slot: u8,
        species: String,
        mv: String,
    },
}

pub trait RegulationRules: Send + Sync {
    fn code(&self) -> &'static str;
    fn validate_team(&self, team: &Team) -> Vec<Violation>;
    fn allowed_species(&self) -> Vec<String>;
    fn allowed_items(&self) -> Vec<String>;
    fn allowed_moves(&self) -> Vec<String>;
}

pub fn rules_for_code(code: &str) -> Option<Box<dyn RegulationRules>> {
    match code {
        "regulation-m-b" | "reg-m-b" | "RegulationMB" => Some(Box::new(RegMbRules::current())),
        "regulation-m-a" | "reg-m-a" | "RegulationMA" => Some(Box::new(RegMaRules::current())),
        _ => None,
    }
}
