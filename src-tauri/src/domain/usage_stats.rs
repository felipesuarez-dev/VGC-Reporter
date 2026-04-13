use crate::domain::format::Format;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct UsageEntry {
    pub name: String,
    pub usage_percent: f32,
    pub count: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct PokemonUsage {
    pub species: String,
    pub usage_percent: f32,
    pub count: u32,
    pub top_items: Vec<UsageEntry>,
    pub top_moves: Vec<UsageEntry>,
    pub top_abilities: Vec<UsageEntry>,
    pub top_tera: Vec<UsageEntry>,
    pub top_teammates: Vec<UsageEntry>,
    pub sprite_url: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct MoveUsage {
    pub name: String,
    pub usage_percent: f32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct TeraUsage {
    pub tera_type: String,
    pub usage_percent: f32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct MetaSnapshot {
    pub format: Format,
    pub generated_at: DateTime<Utc>,
    pub source: String,
    pub tournaments_used: u32,
    pub total_entries: u32,
    pub pokemon: Vec<PokemonUsage>,
    pub top_items: Vec<UsageEntry>,
    pub top_moves: Vec<UsageEntry>,
    pub top_tera: Vec<UsageEntry>,
}
