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
pub struct TeammateUsage {
    pub name: String,
    pub usage_percent: f32,
    pub count: u32,
    pub sprite_url: String,
    #[serde(default)]
    pub sprite_fallback_url: Option<String>,
    #[serde(default)]
    pub home_sprite_url: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct MovesetUsage {
    pub moves: Vec<String>,
    pub count: u32,
    pub usage_percent: f32,
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
    #[serde(default)]
    pub top_tera: Vec<UsageEntry>,
    pub top_teammates: Vec<TeammateUsage>,
    #[serde(default)]
    pub top_natures: Vec<UsageEntry>,
    #[serde(default)]
    pub common_movesets: Vec<MovesetUsage>,
    pub sprite_url: String,
    #[serde(default)]
    pub sprite_fallback_url: Option<String>,
    #[serde(default)]
    pub home_sprite_url: Option<String>,
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
    #[serde(default)]
    pub battles_analyzed: u32,
    pub pokemon: Vec<PokemonUsage>,
    pub top_items: Vec<UsageEntry>,
    pub top_moves: Vec<UsageEntry>,
    #[serde(default)]
    pub top_abilities: Vec<UsageEntry>,
    #[serde(default)]
    pub top_tera: Vec<UsageEntry>,
    #[serde(default)]
    pub from_date: Option<String>,
    #[serde(default)]
    pub to_date: Option<String>,
}

impl MetaSnapshot {
    pub fn empty(format: Format) -> Self {
        Self {
            format,
            generated_at: Utc::now(),
            source: "no data".into(),
            tournaments_used: 0,
            total_entries: 0,
            battles_analyzed: 0,
            pokemon: Vec::new(),
            top_items: Vec::new(),
            top_moves: Vec::new(),
            top_abilities: Vec::new(),
            top_tera: Vec::new(),
            from_date: None,
            to_date: None,
        }
    }
}
