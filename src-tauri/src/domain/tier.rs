//! Tier placement (S/A/B/C/D) computed from our own composite score.
//!
//! Deliberately not copied from any upstream tier list: those only cover the
//! top ~100 species, go stale when their snapshot does, and disappear if the
//! source does. This runs on whatever the merge produced, so it always covers
//! the full meta and survives any single source going down.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub enum Tier {
    S,
    A,
    B,
    C,
    D,
}

impl Tier {
    pub fn as_str(&self) -> &'static str {
        match self {
            Tier::S => "S",
            Tier::A => "A",
            Tier::B => "B",
            Tier::C => "C",
            Tier::D => "D",
        }
    }
}

impl std::fmt::Display for Tier {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

/// Signals that feed the composite, per species.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct TierInput {
    /// Share of teams running this species, 0..100.
    pub usage_percent: f32,
    /// Observed win rate, 0..100. `None` when no source reported records.
    pub win_rate: Option<f32>,
    /// Games behind `win_rate`; drives how far the rate is shrunk.
    pub games: u32,
    /// Share of this species' teams that reached top cut, 0..100.
    pub top_cut_rate: Option<f32>,
}

const W_USAGE: f32 = 0.45;
const W_WIN_RATE: f32 = 0.35;
const W_TOP_CUT: f32 = 0.20;

/// Pseudo-games added toward the mean before a win rate is believed. A species
/// seen in three games with a perfect record contributes almost nothing; one
/// seen in three hundred contributes nearly all of its observed edge.
const SHRINKAGE_GAMES: f32 = 50.0;

/// Below this many species there is no distribution worth cutting, so the
/// z-score bands would be false precision.
const MIN_FOR_FULL_TIERS: usize = 12;

/// Composite score for one species, normalised against the strongest values in
/// the same meta so the scale stays readable as a meta matures.
///
/// The win-rate term is shrunk toward the population mean, which is what stops
/// a 2-game 100% record from outranking a 300-game 55% one.
pub fn meta_score(input: TierInput, max_usage: f32, max_top_cut: f32, mean_win_rate: f32) -> f32 {
    let usage_norm = safe_ratio(input.usage_percent, max_usage);

    // A species with no record data falls back to the population mean, which
    // makes the term neutral instead of a penalty: a source that simply does
    // not publish records must not push everything it covers downward.
    let observed = input.win_rate.unwrap_or(mean_win_rate);
    let games = input.games as f32;
    let shrunk =
        (observed * games + mean_win_rate * SHRINKAGE_GAMES) / (games + SHRINKAGE_GAMES).max(1.0);
    // Re-centre on the mean so an average win rate contributes nothing either
    // way, and clamp so one runaway value cannot dominate the composite.
    let win_norm = (0.5 + (shrunk - mean_win_rate) / 20.0).clamp(0.0, 1.0);

    let top_cut_norm = input
        .top_cut_rate
        .map(|v| safe_ratio(v, max_top_cut))
        .unwrap_or(0.0);

    100.0 * (W_USAGE * usage_norm + W_WIN_RATE * win_norm + W_TOP_CUT * top_cut_norm)
}

fn safe_ratio(value: f32, max: f32) -> f32 {
    if max <= 0.0 {
        0.0
    } else {
        (value / max).clamp(0.0, 1.0)
    }
}

/// Assign a tier per score, cutting on standard deviations from the mean
/// rather than fixed thresholds.
///
/// Fixed cutoffs would need retuning every time the meta's shape changes; a
/// z-score adapts on its own to a young meta (flat, everything near the mean)
/// and a settled one (a few clear outliers). Order of the output matches the
/// order of the input.
pub fn assign_tiers(scores: &[f32]) -> Vec<Tier> {
    if scores.is_empty() {
        return Vec::new();
    }

    // Too few data points for a distribution to mean anything: split on the
    // median and say no more than that.
    if scores.len() < MIN_FOR_FULL_TIERS {
        let median = median_of(scores);
        return scores
            .iter()
            .map(|s| if *s >= median { Tier::A } else { Tier::C })
            .collect();
    }

    let n = scores.len() as f32;
    let mean = scores.iter().sum::<f32>() / n;
    let variance = scores.iter().map(|s| (s - mean).powi(2)).sum::<f32>() / n;
    let std_dev = variance.sqrt();

    // Every score identical — a real case when a brand-new regulation has one
    // tournament and everything is tied. No spread means no ranking.
    if std_dev <= f32::EPSILON {
        return vec![Tier::C; scores.len()];
    }

    scores
        .iter()
        .map(|s| {
            let z = (s - mean) / std_dev;
            if z >= 1.5 {
                Tier::S
            } else if z >= 0.5 {
                Tier::A
            } else if z >= -0.25 {
                Tier::B
            } else if z >= -1.0 {
                Tier::C
            } else {
                Tier::D
            }
        })
        .collect()
}

fn median_of(scores: &[f32]) -> f32 {
    let mut sorted: Vec<f32> = scores.to_vec();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let mid = sorted.len() / 2;
    if sorted.len() % 2 == 0 {
        (sorted[mid - 1] + sorted[mid]) / 2.0
    } else {
        sorted[mid]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn input(usage: f32, win: Option<f32>, games: u32, top_cut: Option<f32>) -> TierInput {
        TierInput {
            usage_percent: usage,
            win_rate: win,
            games,
            top_cut_rate: top_cut,
        }
    }

    #[test]
    fn usage_drives_the_score_when_nothing_else_differs() {
        let high = meta_score(input(8.0, None, 0, None), 8.0, 1.0, 50.0);
        let low = meta_score(input(1.0, None, 0, None), 8.0, 1.0, 50.0);
        assert!(high > low);
    }

    /// The reason the win-rate term is shrunk at all.
    #[test]
    fn a_tiny_perfect_record_loses_to_a_large_good_one() {
        let lucky = meta_score(input(1.0, Some(100.0), 2, None), 8.0, 1.0, 50.0);
        let proven = meta_score(input(1.0, Some(56.0), 400, None), 8.0, 1.0, 50.0);
        assert!(
            proven > lucky,
            "400 games at 56% ({proven}) should beat 2 games at 100% ({lucky})"
        );
    }

    /// A source that publishes no records must not drag everything it covers
    /// below a source that does.
    #[test]
    fn a_missing_win_rate_is_neutral_not_a_penalty() {
        let unknown = meta_score(input(4.0, None, 0, None), 8.0, 1.0, 50.0);
        let average = meta_score(input(4.0, Some(50.0), 300, None), 8.0, 1.0, 50.0);
        assert!((unknown - average).abs() < 0.01);
    }

    #[test]
    fn zero_maxima_do_not_produce_nan() {
        let s = meta_score(input(0.0, None, 0, Some(0.0)), 0.0, 0.0, 50.0);
        assert!(s.is_finite(), "score must stay finite, got {s}");
    }

    #[test]
    fn a_dominant_outlier_lands_in_s() {
        let mut scores = vec![10.0_f32; 30];
        scores.push(200.0);
        let tiers = assign_tiers(&scores);
        assert_eq!(tiers.last(), Some(&Tier::S));
    }

    #[test]
    fn a_spread_meta_uses_every_tier() {
        let scores: Vec<f32> = (0..100).map(|i| i as f32).collect();
        let tiers = assign_tiers(&scores);
        for want in [Tier::S, Tier::A, Tier::B, Tier::C, Tier::D] {
            assert!(tiers.contains(&want), "{want:?} should appear");
        }
    }

    #[test]
    fn tiers_never_improve_as_the_score_drops() {
        let scores: Vec<f32> = (0..60).map(|i| (60 - i) as f32).collect();
        let tiers = assign_tiers(&scores);
        let rank = |t: &Tier| match t {
            Tier::S => 0,
            Tier::A => 1,
            Tier::B => 2,
            Tier::C => 3,
            Tier::D => 4,
        };
        for w in tiers.windows(2) {
            assert!(rank(&w[0]) <= rank(&w[1]), "tiers must be monotonic");
        }
    }

    /// A brand-new regulation with one tournament: everything tied. Inventing
    /// a ranking out of that would be noise presented as signal.
    #[test]
    fn an_all_tied_meta_gets_one_flat_tier() {
        let tiers = assign_tiers(&[42.0; 20]);
        assert!(tiers.iter().all(|t| *t == Tier::C));
    }

    #[test]
    fn too_few_species_fall_back_to_a_median_split() {
        let tiers = assign_tiers(&[1.0, 2.0, 3.0, 100.0]);
        assert_eq!(tiers.len(), 4);
        assert!(tiers.iter().all(|t| *t == Tier::A || *t == Tier::C));
        assert_eq!(tiers.last(), Some(&Tier::A));
    }

    #[test]
    fn an_empty_meta_yields_no_tiers() {
        assert!(assign_tiers(&[]).is_empty());
    }

    #[test]
    fn output_length_always_matches_input() {
        for n in [0usize, 1, 5, 12, 40] {
            let scores: Vec<f32> = (0..n).map(|i| i as f32).collect();
            assert_eq!(assign_tiers(&scores).len(), n);
        }
    }
}
