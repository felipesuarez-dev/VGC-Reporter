//! Provenance of the data behind a meta snapshot.
//!
//! The app aggregates several upstream sources instead of picking a single
//! winner, so every snapshot has to be able to say *where each number came
//! from*. That matters beyond bookkeeping: sources disagree about which
//! regulation they are describing, and at least one of them keeps serving a
//! previous set's data under the current set's URL. Showing "Regulation M-C"
//! over numbers computed from M-B tournaments would be a lie, so the label is
//! always read back from the payload rather than assumed from the request.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// An upstream data provider.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub enum SourceId {
    #[serde(rename = "labmaus")]
    Labmaus,
    #[serde(rename = "limitless")]
    Limitless,
    #[serde(rename = "champteams")]
    Champteams,
    #[serde(rename = "smogon")]
    Smogon,
}

impl SourceId {
    pub fn as_str(&self) -> &'static str {
        match self {
            SourceId::Labmaus => "labmaus",
            SourceId::Limitless => "limitless",
            SourceId::Champteams => "champteams",
            SourceId::Smogon => "smogon",
        }
    }

    /// How much the merge trusts this source, independent of sample size.
    ///
    /// Labmaus and Limitless report real tournament results and are the
    /// reference. Champteams is a derived, well-curated aggregate but is
    /// second-hand. Smogon is ladder data, not tournament data, and applies
    /// its own ruleset on top of the official one, so it only breaks ties when
    /// nothing better exists.
    pub fn trust(&self) -> f32 {
        match self {
            SourceId::Labmaus => 1.0,
            SourceId::Limitless => 1.0,
            SourceId::Champteams => 0.8,
            SourceId::Smogon => 0.3,
        }
    }

    pub fn all() -> [SourceId; 4] {
        [
            SourceId::Labmaus,
            SourceId::Limitless,
            SourceId::Champteams,
            SourceId::Smogon,
        ]
    }
}

impl std::fmt::Display for SourceId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

/// What one source contributed to a snapshot, and how far it should be
/// trusted for the format that was actually requested.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct SourceProvenance {
    pub source: SourceId,
    /// The regulation the source itself claims this data describes, parsed out
    /// of its payload — never inferred from the request. `None` when the
    /// payload says nothing, which is treated as "cannot vouch for it".
    #[serde(default)]
    pub declared_regulation: Option<String>,
    /// Whether `declared_regulation` matches the requested format. Drives the
    /// recency weight and lets the UI flag a source as out-of-period.
    pub matches_active_format: bool,
    pub teams: u32,
    pub tournaments: u32,
    #[serde(default)]
    pub from_date: Option<String>,
    #[serde(default)]
    pub to_date: Option<String>,
    /// Share of the merged result attributable to this source, 0..1.
    /// Filled in after the merge, so it is 0 until then.
    #[serde(default)]
    pub weight: f32,
}

impl SourceProvenance {
    /// Weight before normalisation: sample size, scaled by how much the source
    /// is trusted and by whether it is actually describing the requested
    /// regulation.
    ///
    /// Sample size enters as `ln(1 + teams)` rather than raw count. The
    /// hundredth team tells us far more than the twelve-thousandth, and with a
    /// linear count one big source simply decides the answer: a 12k-team
    /// sample would outvote a 550-team one twenty-two to one, which no
    /// trust or recency factor can sensibly claw back.
    ///
    /// The recency factor is what stops a large STALE sample from drowning a
    /// small fresh one — a source carrying 12k teams from the previous set
    /// must not outvote 550 teams from the set the user actually asked for. It
    /// is a penalty rather than an exclusion, so a brand-new regulation still
    /// shows a usable meta instead of an empty page, and it lifts on its own
    /// the moment that source starts publishing current data.
    pub fn raw_weight(&self) -> f32 {
        let recency = if self.matches_active_format {
            1.0
        } else {
            STALE_SOURCE_WEIGHT
        };
        (1.0 + self.teams as f32).ln() * self.source.trust() * recency
    }
}

/// Multiplier applied to a source whose declared regulation is not the one
/// being requested.
pub const STALE_SOURCE_WEIGHT: f32 = 0.25;

#[cfg(test)]
mod tests {
    use super::*;

    fn provenance(source: SourceId, teams: u32, matches: bool) -> SourceProvenance {
        SourceProvenance {
            source,
            declared_regulation: None,
            matches_active_format: matches,
            teams,
            tournaments: 0,
            from_date: None,
            to_date: None,
            weight: 0.0,
        }
    }

    #[test]
    fn source_ids_are_unique() {
        let mut ids: Vec<&str> = SourceId::all().iter().map(|s| s.as_str()).collect();
        ids.sort_unstable();
        ids.dedup();
        assert_eq!(ids.len(), SourceId::all().len());
    }

    #[test]
    fn tournament_sources_outrank_the_ladder() {
        assert!(SourceId::Labmaus.trust() > SourceId::Smogon.trust());
        assert!(SourceId::Limitless.trust() > SourceId::Champteams.trust());
    }

    /// The case this whole mechanism exists for: a big sample describing the
    /// PREVIOUS regulation must not outweigh a small sample describing the
    /// current one.
    #[test]
    fn a_large_stale_sample_loses_to_a_small_current_one() {
        let stale = provenance(SourceId::Champteams, 12_113, false);
        let current = provenance(SourceId::Labmaus, 551, true);
        assert!(
            current.raw_weight() > stale.raw_weight(),
            "current {} should outweigh stale {}",
            current.raw_weight(),
            stale.raw_weight()
        );
    }

    /// ...but the same source, once it catches up, should win on sample size.
    #[test]
    fn the_penalty_lifts_when_the_source_catches_up() {
        let caught_up = provenance(SourceId::Champteams, 12_113, true);
        let current = provenance(SourceId::Labmaus, 551, true);
        assert!(caught_up.raw_weight() > current.raw_weight());
    }

    /// A source that returned nothing must contribute nothing — and must not
    /// produce a NaN when the merge normalises the weights.
    #[test]
    fn an_empty_source_contributes_no_weight() {
        let w = provenance(SourceId::Labmaus, 0, true).raw_weight();
        assert_eq!(w, 0.0);
        assert!(w.is_finite());
    }

    #[test]
    fn weight_grows_with_sample_size_but_with_diminishing_returns() {
        let small = provenance(SourceId::Labmaus, 100, true).raw_weight();
        let medium = provenance(SourceId::Labmaus, 1_000, true).raw_weight();
        let large = provenance(SourceId::Labmaus, 10_000, true).raw_weight();
        assert!(small < medium && medium < large, "must be monotonic");
        assert!(
            (large - medium) < (medium - small) * 1.5,
            "each tenfold increase must add less than the previous one"
        );
    }
}
