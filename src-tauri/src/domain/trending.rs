use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct TrendingPokemon {
    pub species: String,
    pub sprite_url: String,
    #[serde(default)]
    pub sprite_fallback_url: Option<String>,
    #[serde(default)]
    pub home_sprite_url: Option<String>,
    pub change_percentage: f32,
    pub day1_percentage: f32,
    pub day2_percentage: f32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct TrendingReport {
    pub rising: Vec<TrendingPokemon>,
    pub falling: Vec<TrendingPokemon>,
    #[serde(default)]
    pub from_date: Option<String>,
    #[serde(default)]
    pub to_date: Option<String>,
}

impl TrendingReport {
    pub fn empty() -> Self {
        Self {
            rising: Vec::new(),
            falling: Vec::new(),
            from_date: None,
            to_date: None,
        }
    }
}
