use crate::domain::format::Format;
use crate::domain::source_stats::SourceProvenance;
use crate::domain::tier::Tier;
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
    /// Win rate across every team that ran this species, 0..100. `None` when
    /// no contributing source published match records.
    #[serde(default)]
    pub win_rate: Option<f32>,
    /// Share of this species' teams that reached top cut, 0..100.
    #[serde(default)]
    pub top_cut_rate: Option<f32>,
    /// Our composite ranking score. Not a 0-100 rating: it is normalised
    /// against the strongest values in the same snapshot.
    #[serde(default)]
    pub meta_score: Option<f32>,
    #[serde(default)]
    pub tier: Option<Tier>,
    /// How many sources reported this species at all. Low values mean the
    /// numbers rest on a single upstream opinion.
    #[serde(default)]
    pub sources_covering: u8,
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
    /// One entry per source that contributed, with the regulation each one
    /// claims it is describing and its share of the merged result.
    #[serde(default)]
    pub sources: Vec<SourceProvenance>,
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
            sources: Vec::new(),
        }
    }
}
