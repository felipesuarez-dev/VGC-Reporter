use crate::domain::pokemon::PokemonType;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Tera Type uses the same type list as Pokémon (including Stellar).
/// We alias to keep the domain small.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct TeraType(pub PokemonType);

impl From<PokemonType> for TeraType {
    fn from(t: PokemonType) -> Self {
        TeraType(t)
    }
}
