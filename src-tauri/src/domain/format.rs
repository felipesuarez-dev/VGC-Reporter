use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Competitive format. Multi-variant: frontend can switch freely.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub enum Format {
    #[serde(rename = "regulation-m-a")]
    RegulationMA,
    #[serde(rename = "champions-singles")]
    ChampionsSingles,
    #[serde(rename = "regulation-i")]
    RegulationI,
    #[serde(rename = "gen9-ou")]
    Gen9Ou,
}

impl Format {
    /// Stable internal slug used as cache key. Never changes — decoupled from
    /// upstream Limitless/Smogon naming.
    pub fn cache_id(&self) -> &'static str {
        match self {
            Format::RegulationMA => "reg-m-a",
            Format::ChampionsSingles => "champ-singles",
            Format::RegulationI => "reg-i",
            Format::Gen9Ou => "gen9-ou",
        }
    }

    /// `None` = format does not live on Limitless (e.g. singles OU).
    /// Codes verified against the live Limitless API: VGC uses `M-A` and the
    /// SV Reg I format reports as `SVI` — not `M2A` / `I` like older guesses.
    pub fn limitless_code(&self) -> Option<&'static str> {
        match self {
            Format::RegulationMA => Some("M-A"),
            Format::ChampionsSingles => None,
            Format::RegulationI => Some("SVI"),
            Format::Gen9Ou => None,
        }
    }

    /// Default Smogon slug. For Reg M-A this is a guess that can be replaced
    /// dynamically via SettingsRepo (`smogon_slug::<cache_id>`) once discovery
    /// finds the real slug.
    pub fn default_smogon_slug(&self) -> &'static str {
        match self {
            Format::RegulationMA => "gen9vgc2026regma",
            Format::ChampionsSingles => "gen9vgc2026regmasingles",
            Format::RegulationI => "gen9vgc2026regi",
            Format::Gen9Ou => "gen9ou",
        }
    }

    /// Rating cutoffs to probe in order (high → low). VGC and singles use
    /// different ladder tiers.
    pub fn rating_ladder(&self) -> &'static [u32] {
        match self {
            Format::Gen9Ou | Format::ChampionsSingles => &[1825, 1695, 1500, 0],
            _ => &[1760, 1630, 1500, 0],
        }
    }

    /// Closed formats pin a specific month; active formats return `None` and
    /// rewind from the current month.
    pub fn anchor_month(&self) -> Option<(i32, u32)> {
        None
    }

    pub fn label(&self) -> &'static str {
        match self {
            Format::RegulationMA => "Regulation M-A",
            Format::ChampionsSingles => "Champions Singles",
            Format::RegulationI => "Regulation I",
            Format::Gen9Ou => "Gen 9 OU",
        }
    }

    pub fn all_active() -> Vec<Format> {
        vec![
            Format::RegulationMA,
            Format::ChampionsSingles,
            Format::RegulationI,
            Format::Gen9Ou,
        ]
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
    fn gen9_ou_is_singles_only() {
        assert!(Format::Gen9Ou.limitless_code().is_none());
        assert!(Format::RegulationMA.limitless_code().is_some());
        assert!(Format::RegulationI.limitless_code().is_some());
    }

    #[test]
    fn all_active_includes_champions_singles_first_after_doubles() {
        let active = Format::all_active();
        assert_eq!(active.len(), 4);
        assert_eq!(active[0], Format::RegulationMA);
        assert_eq!(active[1], Format::ChampionsSingles);
    }

    #[test]
    fn champions_singles_is_offline() {
        assert!(Format::ChampionsSingles.limitless_code().is_none());
        assert_eq!(Format::ChampionsSingles.cache_id(), "champ-singles");
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
