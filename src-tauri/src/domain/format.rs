use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Competitive format. Multi-variant: frontend can switch freely.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Default, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub enum Format {
    #[default]
    #[serde(rename = "regulation-m-b")]
    RegulationMB,
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
            Format::RegulationMB => "reg-m-b",
            Format::RegulationMA => "reg-m-a",
            Format::RegulationI => "reg-i",
        }
    }

    /// Codes verified against the live Limitless API: VGC uses `M-A` and the
    /// SV Reg I format reports as `SVI` — not `M2A` / `I` like older guesses.
    pub fn limitless_code(&self) -> Option<&'static str> {
        match self {
            Format::RegulationMB => Some("M-B"),
            Format::RegulationMA => Some("M-A"),
            Format::RegulationI => Some("SVI"),
        }
    }

    /// Default Smogon slug. For Reg M-A this is a guess that can be replaced
    /// dynamically via SettingsRepo (`smogon_slug::<cache_id>`) once discovery
    /// finds the real slug.
    pub fn default_smogon_slug(&self) -> &'static str {
        match self {
            Format::RegulationMB => "gen9vgc2026regmb",
            Format::RegulationMA => "gen9vgc2026regma",
            Format::RegulationI => "gen9vgc2026regi",
        }
    }

    /// Labmaus regulation string used in the `?regulation=` query param of
    /// `/api/discover_teams`. Runtime override lives at
    /// `labmaus_name::<cache_id>` in SettingsRepo (same pattern as
    /// `smogon_slug`), so a new regulation can be onboarded by seeding one
    /// settings row before its static default is known.
    ///
    /// NOTE (2026-06): labmaus has NOT created a dedicated "Regulation Set M-B"
    /// regulation yet — it still serves the active-season (M-B era) teams under
    /// the `Regulation Set M-A` label (verified: that label returns hundreds of
    /// post-2026-06-17 teams, while every M-B string returns 0). Since M-B is
    /// the active season, it must query the label that actually holds the live
    /// data. When labmaus adds a real M-B regulation, flip this back to
    /// `"Regulation Set M-B"` (or set the `labmaus_name::reg-m-b` settings
    /// override) — no other code changes needed.
    pub fn default_labmaus_name(&self) -> Option<&'static str> {
        match self {
            Format::RegulationMB => Some("Regulation Set M-A"),
            Format::RegulationMA => Some("Regulation Set M-A"),
            _ => None,
        }
    }

    /// Inclusive date range of competitive data that belongs to this
    /// regulation, used to bound the labmaus queries. This is what actually
    /// separates M-A from M-B data: labmaus serves both under the same
    /// `Regulation Set M-A` label, so only the DATE distinguishes them.
    ///
    /// Returns `(start, end)` where `end == None` means "ongoing" (the caller
    /// clamps it to today). `None` overall means "no fixed range — use a
    /// rolling window". The two Champions windows are disjoint (M-A ends the
    /// 16th, M-B starts the 17th) so a tournament is never counted under both.
    ///
    /// M-A (the closed M-2 season) is capped to its final two weeks
    /// (2026-06-03 → 2026-06-16): labmaus `discover_teams` times out
    /// server-side (~30s) for windows wider than ~3 weeks, so the full M-2
    /// season can't be fetched in one request. The last fortnight is the
    /// reliable, most representative slice of the closing meta. M-B is the
    /// active season, fetched from its launch (2026-06-17) up to today.
    pub fn data_window(&self) -> Option<(chrono::NaiveDate, Option<chrono::NaiveDate>)> {
        let d = |y, m, day| chrono::NaiveDate::from_ymd_opt(y, m, day).expect("valid date");
        match self {
            Format::RegulationMB => Some((d(2026, 6, 17), None)),
            Format::RegulationMA => Some((d(2026, 6, 3), Some(d(2026, 6, 16)))),
            Format::RegulationI => None,
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
            Format::RegulationMB => "Regulation M-B (M-3)",
            Format::RegulationMA => "Regulation M-A (M-2)",
            Format::RegulationI => "Regulation I",
        }
    }

    pub fn all_active() -> Vec<Format> {
        vec![
            Format::RegulationMB,
            Format::RegulationMA,
            Format::RegulationI,
        ]
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
        assert_eq!(
            active,
            vec![
                Format::RegulationMB,
                Format::RegulationMA,
                Format::RegulationI,
            ]
        );
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
