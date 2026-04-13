use crate::domain::pokemon::PokemonType;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub enum MoveCategory {
    Physical,
    Special,
    Status,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct Move {
    pub id: String,
    pub name: String,
    pub type_: PokemonType,
    pub category: MoveCategory,
    pub base_power: u16,
    pub accuracy: u16,
    pub pp: u16,
    pub description: String,
}
