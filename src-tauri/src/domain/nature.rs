use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub enum Nature {
    Hardy,
    Lonely,
    Brave,
    Adamant,
    Naughty,
    Bold,
    Docile,
    Relaxed,
    Impish,
    Lax,
    Timid,
    Hasty,
    Serious,
    Jolly,
    Naive,
    Modest,
    Mild,
    Quiet,
    Bashful,
    Rash,
    Calm,
    Gentle,
    Sassy,
    Careful,
    Quirky,
}

impl Nature {
    pub fn all() -> [Nature; 25] {
        use Nature::*;
        [
            Hardy, Lonely, Brave, Adamant, Naughty, Bold, Docile, Relaxed, Impish, Lax, Timid,
            Hasty, Serious, Jolly, Naive, Modest, Mild, Quiet, Bashful, Rash, Calm, Gentle, Sassy,
            Careful, Quirky,
        ]
    }
}
