use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Competitive format. Multi-variant: frontend can switch freely.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Default, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub enum Format {
    #[default]
    #[serde(rename = "regulation-m-a")]
    RegulationMA,
    #[serde(rename = "regulation-i")]
    RegulationI,
}

impl Format {
    /// Stable internal slug used as cache key. Never changes — decoupled from
    /// upstream Limitless/Smogon naming.
    pub fn cache_id(&self) -> &'static str {
        match self {
            Format::RegulationMA => "reg-m-a",
            Format::RegulationI => "reg-i",
        }
    }

    /// Codes verified against the live Limitless API: VGC uses `M-A` and the
    /// SV Reg I format reports as `SVI` — not `M2A` / `I` like older guesses.
    pub fn limitless_code(&self) -> Option<&'static str> {
        match self {
            Format::RegulationMA => Some("M-A"),
            Format::RegulationI => Some("SVI"),
        }
    }

    /// Default Smogon slug. For Reg M-A this is a guess that can be replaced
    /// dynamically via SettingsRepo (`smogon_slug::<cache_id>`) once discovery
    /// finds the real slug.
    pub fn default_smogon_slug(&self) -> &'static str {
        match self {
            Format::RegulationMA => "gen9vgc2026regma",
            Format::RegulationI => "gen9vgc2026regi",
        }
    }

    /// Rating cutoffs to probe in order (high → low). VGC doubles ladder tiers.
    pub fn rating_ladder(&self) -> &'static [u32] {
        &[1760, 1630, 1500, 0]
    }

    /// Closed formats pin a specific month; active formats return `None` and
    /// rewind from the current month.
    pub fn anchor_month(&self) -> Option<(i32, u32)> {
        None
    }

    pub fn label(&self) -> &'static str {
        match self {
            Format::RegulationMA => "Regulation M-A (M-1)",
            Format::RegulationI => "Regulation I",
        }
    }

    pub fn all_active() -> Vec<Format> {
        vec![Format::RegulationMA, Format::RegulationI]
    }
}

impl std::fmt::Display for Format {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.label())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    #[test]
    fn cache_ids_are_unique() {
        let ids: HashSet<&str> = Format::all_active().iter().map(|f| f.cache_id()).collect();
        assert_eq!(ids.len(), Format::all_active().len());
    }

    #[test]
    fn all_active_is_doubles_only() {
        let active = Format::all_active();
        assert_eq!(active, vec![Format::RegulationMA, Format::RegulationI]);
        for f in &active {
            assert!(f.limitless_code().is_some());
        }
    }

    #[test]
    fn rating_ladder_descends() {
        for f in Format::all_active() {
            let ladder = f.rating_ladder();
            for w in ladder.windows(2) {
                assert!(w[0] >= w[1], "ladder not descending for {:?}", f);
            }
        }
    }
}
