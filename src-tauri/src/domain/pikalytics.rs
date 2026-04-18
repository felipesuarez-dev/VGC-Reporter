use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct PikalyticsItem {
    pub name: String,
    #[serde(default)]
    pub usage_percent: Option<f32>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct PikalyticsTeammate {
    pub species: String,
    #[serde(default)]
    pub usage_percent: Option<f32>,
    #[serde(default)]
    pub sprite_url: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct PikalyticsEvSpread {
    /// Free-form label (e.g. "252 HP / 4 Def / 252 SpA"). Pikalytics renders
    /// spreads as plain text and we keep that representation verbatim.
    pub label: String,
    #[serde(default)]
    pub usage_percent: Option<f32>,
    #[serde(default)]
    pub nature: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct PikalyticsEntry {
    pub species_id: String,
    pub species_display: String,
    #[serde(default)]
    pub sprite_url: Option<String>,
    #[serde(default)]
    pub usage_percent: Option<f32>,
    #[serde(default)]
    pub common_items: Vec<PikalyticsItem>,
    #[serde(default)]
    pub common_abilities: Vec<PikalyticsItem>,
    #[serde(default)]
    pub common_moves: Vec<PikalyticsItem>,
    #[serde(default)]
    pub common_teammates: Vec<PikalyticsTeammate>,
    #[serde(default)]
    pub common_tera: Vec<PikalyticsItem>,
    #[serde(default)]
    pub ev_spreads: Vec<PikalyticsEvSpread>,
    pub source_url: String,
}
