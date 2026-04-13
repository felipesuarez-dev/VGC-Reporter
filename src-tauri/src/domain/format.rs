use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Competitive format. Only `RegulationMA` is active in v0.0.1; the enum is kept
/// multi-variant so additional formats can be enabled later without migrations.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub enum Format {
    #[serde(rename = "regulation-m-a")]
    RegulationMA,
}

impl Format {
    pub fn limitless_code(&self) -> &'static str {
        match self {
            Format::RegulationMA => "M2A",
        }
    }

    pub fn smogon_id(&self) -> &'static str {
        // VGC 2026 Champions / Regulation M-A — Smogon format slug.
        match self {
            Format::RegulationMA => "gen9vgc2026regulationma",
        }
    }

    pub fn label(&self) -> &'static str {
        match self {
            Format::RegulationMA => "Regulation M-A",
        }
    }

    pub fn all_active() -> Vec<Format> {
        vec![Format::RegulationMA]
    }
}

impl Default for Format {
    fn default() -> Self {
        Format::RegulationMA
    }
}

impl std::fmt::Display for Format {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.label())
    }
}
