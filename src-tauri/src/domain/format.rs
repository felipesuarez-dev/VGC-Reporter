use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Competitive format. Multi-variant: frontend can switch freely.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Default, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub enum Format {
    #[default]
    #[serde(rename = "regulation-m-c")]
    RegulationMC,
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
            Format::RegulationMC => "reg-m-c",
            Format::RegulationMB => "reg-m-b",
            Format::RegulationMA => "reg-m-a",
            Format::RegulationI => "reg-i",
        }
    }

    /// Codes verified against the live Limitless API: VGC uses `M-A` and the
    /// SV Reg I format reports as `SVI` — not `M2A` / `I` like older guesses.
    pub fn limitless_code(&self) -> Option<&'static str> {
        match self {
            Format::RegulationMC => Some("M-C"),
            Format::RegulationMB => Some("M-B"),
            Format::RegulationMA => Some("M-A"),
            Format::RegulationI => Some("SVI"),
        }
    }

    /// Smogon publishes the Champions ladders under a `gen9champions…` prefix,
    /// NOT the `gen9vgc…` one used by the mainline VGC ladders. Verified by
    /// listing `smogon.com/stats/2026-08/chaos/`, which contains
    /// `gen9championsvgc2026regmb` (and its `bo3` sibling) and no
    /// `gen9vgc2026regmb` at all. The previous value 404'd on every request,
    /// which is why the Smogon fallback never produced data for any Champions
    /// set. Runtime override: `smogon_slug::<cache_id>` in SettingsRepo.
    pub fn default_smogon_slug(&self) -> &'static str {
        match self {
            Format::RegulationMC => "gen9championsvgc2026regmc",
            Format::RegulationMB => "gen9championsvgc2026regmb",
            Format::RegulationMA => "gen9championsvgc2026regma",
            Format::RegulationI => "gen9vgc2026regi",
        }
    }

    /// Labmaus regulation string used in the `?regulation=` query param of
    /// `/api/discover_teams`. Runtime override lives at
    /// `labmaus_name::<cache_id>` in SettingsRepo, so a new regulation can be
    /// onboarded by seeding one settings row before its static default ships.
    ///
    /// The live catalogue is discoverable at `/api/completed_tournaments`,
    /// where every row carries a `regulation` field — see
    /// `LabmausClient::discover_regulations`. Never guess these strings: M-B
    /// spent a season borrowing M-A's label as a workaround, and kept doing so
    /// after labmaus published the real one.
    pub fn default_labmaus_name(&self) -> Option<&'static str> {
        match self {
            Format::RegulationMC => Some("Regulation Set M-C"),
            Format::RegulationMB => Some("Regulation Set M-B"),
            Format::RegulationMA => Some("Regulation Set M-A"),
            Format::RegulationI => None,
        }
    }

    /// Inclusive date range of competitive data that belongs to this
    /// regulation, used to bound the labmaus queries.
    ///
    /// Returns `(start, end)` where `end == None` means "ongoing" (the caller
    /// clamps it to today). `None` overall means "no fixed range — use a
    /// rolling window". The Champions windows are disjoint, so a tournament is
    /// never counted under two regulations.
    ///
    /// M-A is capped to its final fortnight: labmaus `discover_teams` times
    /// out server-side for windows wider than ~3 weeks, and the closing two
    /// weeks are the most representative slice of a dead meta. M-B and M-C
    /// carry their real calendars; anything wider than 21 days is split by
    /// [`crate::services::date_window::chunk_window`].
    pub fn data_window(&self) -> Option<(chrono::NaiveDate, Option<chrono::NaiveDate>)> {
        let d = |y, m, day| chrono::NaiveDate::from_ymd_opt(y, m, day).expect("valid date");
        match self {
            Format::RegulationMC => Some((d(2026, 9, 9), None)),
            Format::RegulationMB => Some((d(2026, 6, 17), Some(d(2026, 9, 8)))),
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
            Format::RegulationMC => "Regulation M-C (M-4)",
            Format::RegulationMB => "Regulation M-B (M-3)",
            Format::RegulationMA => "Regulation M-A (M-2)",
            Format::RegulationI => "Regulation I",
        }
    }

    pub fn all_active() -> Vec<Format> {
        vec![
            Format::RegulationMC,
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
                Format::RegulationMC,
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

    #[test]
    fn default_is_the_active_regulation() {
        assert_eq!(Format::default(), Format::RegulationMC);
    }

    /// Guards the bug that kept the Smogon fallback dead for every Champions
    /// set: those ladders live under `gen9champions…`, never `gen9vgc2026reg…`.
    #[test]
    fn champions_smogon_slugs_use_the_champions_prefix() {
        for f in [
            Format::RegulationMC,
            Format::RegulationMB,
            Format::RegulationMA,
        ] {
            assert!(
                f.default_smogon_slug().starts_with("gen9champions"),
                "{:?} must use the gen9champions prefix, got {}",
                f,
                f.default_smogon_slug()
            );
        }
    }

    /// Each Champions regulation must query its OWN labmaus label. M-B used to
    /// borrow M-A's; labmaus has since published real M-B and M-C labels and
    /// dropped M-A from its live catalogue.
    #[test]
    fn champions_labmaus_names_are_distinct() {
        let names: HashSet<&str> = [
            Format::RegulationMC,
            Format::RegulationMB,
            Format::RegulationMA,
        ]
        .iter()
        .filter_map(|f| f.default_labmaus_name())
        .collect();
        assert_eq!(names.len(), 3, "labmaus labels must not be shared");
    }

    #[test]
    fn champions_windows_are_disjoint_and_ordered() {
        let (_, mb_end) = Format::RegulationMB.data_window().unwrap();
        let (mc_start, mc_end) = Format::RegulationMC.data_window().unwrap();
        assert!(mc_end.is_none(), "M-C is the ongoing regulation");
        assert!(
            mb_end.expect("M-B is closed") < mc_start,
            "M-B must close before M-C opens"
        );
    }
}
