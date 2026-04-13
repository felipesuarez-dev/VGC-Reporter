use crate::domain::evs::EvSpread;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// A single competitive set (item, ability, nature, EVs, moves).
/// Sourced from `data.pkmn.cc`. Fields are tolerant — items/abilities can be
/// missing for ability-locked or item-less sets.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct PokemonSet {
    pub name: String,
    pub item: Option<String>,
    pub ability: Option<String>,
    pub nature: Option<String>,
    /// Tera type(s) recommended for this set. May be empty.
    pub tera_types: Vec<String>,
    pub evs: EvSpread,
    /// Move list. Each slot is at most one move; alternative options are
    /// joined with " / " for display (e.g. `"Air Slash / Dragon Pulse"`).
    pub moves: Vec<String>,
}

/// Bundle of curated sets for a Pokémon, split by play style.
/// `*_source` carries the slug actually used after the fallback chain (so the
/// UI can disclose where the data came from).
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct SetsBundle {
    pub species: String,
    pub doubles: Vec<PokemonSet>,
    pub singles: Vec<PokemonSet>,
    pub doubles_source: Option<String>,
    pub singles_source: Option<String>,
}
