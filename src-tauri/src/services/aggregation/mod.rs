//! Multi-source merge.
//!
//! Every source is mapped into one normalised shape and then combined, instead
//! of picking a single winner and discarding the rest. A winner-takes-all
//! cascade throws away real signal — the losing sources usually agree on the
//! shape of the meta and disagree only at the margins, which is exactly where
//! averaging helps — and it makes the app's numbers hostage to whichever
//! source happens to be up.
//!
//! Three properties matter more than the arithmetic:
//!
//! 1. **One source failing never fails the snapshot.** Sources are fetched
//!    independently and a failure removes that source from the merge, nothing
//!    else.
//! 2. **Provenance survives the merge.** The result carries what each source
//!    claimed to be describing, so the UI can be honest about a source serving
//!    last season's data.
//! 3. **The merge is the same code path for one source or four**, so asking
//!    for a single source is the degenerate case, not a second implementation.

pub mod records;

use crate::adapters::sprite_resolver::canonical_id;
use crate::domain::source_stats::{SourceId, SourceProvenance};
use crate::domain::tier::{assign_tiers, meta_score, TierInput};
use crate::domain::usage_stats::{MovesetUsage, PokemonUsage, TeammateUsage, UsageEntry};
use std::collections::HashMap;

/// One source's view of a format, normalised so the merge does not care where
/// it came from.
#[derive(Debug, Clone)]
pub struct SourceSnapshot {
    pub provenance: SourceProvenance,
    pub entries: Vec<SourceEntry>,
    /// Format-wide breakdowns, already team-fraction.
    pub top_items: Vec<UsageEntry>,
    pub top_moves: Vec<UsageEntry>,
    pub top_abilities: Vec<UsageEntry>,
    pub top_tera: Vec<UsageEntry>,
}

/// One species as reported by one source.
#[derive(Debug, Clone)]
pub struct SourceEntry {
    /// `canonical_id` of the species — the merge key. Using the display name
    /// would split `Rotom-Wash` from `Wash-Rotom`.
    pub key: String,
    pub display: String,
    pub canonical: String,
    pub usage_percent: f32,
    pub count: u32,
    pub win_rate: Option<f32>,
    /// Games behind `win_rate`, so the tier maths can shrink small samples.
    pub games: u32,
    pub top_cut_rate: Option<f32>,
    pub top_items: Vec<UsageEntry>,
    pub top_moves: Vec<UsageEntry>,
    pub top_abilities: Vec<UsageEntry>,
    pub top_tera: Vec<UsageEntry>,
    pub top_natures: Vec<UsageEntry>,
    pub top_teammates: Vec<TeammateUsage>,
    pub common_movesets: Vec<MovesetUsage>,
    pub sprite_url: String,
    pub sprite_fallback_url: Option<String>,
    pub home_sprite_url: Option<String>,
}

/// Result of merging several sources.
pub struct MergeOutcome {
    pub pokemon: Vec<PokemonUsage>,
    pub top_items: Vec<UsageEntry>,
    pub top_moves: Vec<UsageEntry>,
    pub top_abilities: Vec<UsageEntry>,
    pub top_tera: Vec<UsageEntry>,
    /// Provenance with `weight` filled in, one entry per contributing source.
    pub sources: Vec<SourceProvenance>,
}

const TOP_N: usize = 10;

/// Merge every source into one snapshot body.
///
/// Usage is a weighted mean over ALL contributing sources, with a species
/// absent from a source counting as 0% there. That is the standard reading of
/// a usage share — "of everything played, this much was X" — and it avoids
/// inflating a species that one thin source happens to like. It does bias
/// slightly low for species that fall outside a truncated source's published
/// top-N, but those sit in the tail (well under 1% usage) where the difference
/// does not change anything a reader would act on.
///
/// Win rate is different: it is averaged only over sources that actually
/// reported one, because "did not publish records" is not the same claim as
/// "won zero games".
pub fn merge(snapshots: Vec<SourceSnapshot>) -> MergeOutcome {
    let contributing: Vec<SourceSnapshot> = snapshots
        .into_iter()
        .filter(|s| !s.entries.is_empty())
        .collect();

    if contributing.is_empty() {
        return MergeOutcome {
            pokemon: Vec::new(),
            top_items: Vec::new(),
            top_moves: Vec::new(),
            top_abilities: Vec::new(),
            top_tera: Vec::new(),
            sources: Vec::new(),
        };
    }

    let raw_weights: Vec<f32> = contributing
        .iter()
        .map(|s| s.provenance.raw_weight())
        .collect();
    let total_weight: f32 = raw_weights.iter().sum();
    // Every source reported data but all weights collapsed to zero (possible
    // when each has teams == 0). Fall back to an equal split rather than
    // dividing by zero and emitting NaN across the whole snapshot.
    let weights: Vec<f32> = if total_weight <= 0.0 {
        vec![1.0 / contributing.len() as f32; contributing.len()]
    } else {
        raw_weights.iter().map(|w| w / total_weight).collect()
    };

    let mut merged: HashMap<String, Accumulator> = HashMap::new();
    for (snapshot, weight) in contributing.iter().zip(weights.iter()) {
        for entry in &snapshot.entries {
            merged
                .entry(entry.key.clone())
                .or_insert_with(|| Accumulator::new(entry))
                .add(entry, *weight, snapshot.provenance.source);
        }
    }

    let mut rows: Vec<Accumulator> = merged.into_values().collect();
    // Deterministic order before scoring: usage desc, then key, so an
    // identical input always produces an identical snapshot.
    rows.sort_by(|a, b| {
        b.usage
            .partial_cmp(&a.usage)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| a.key.cmp(&b.key))
    });

    let max_usage = rows.first().map(|r| r.usage).unwrap_or(0.0);
    let max_top_cut = rows
        .iter()
        .filter_map(|r| r.top_cut_rate())
        .fold(0.0_f32, f32::max);
    let mean_win_rate = mean_of(rows.iter().filter_map(|r| r.win_rate()));

    let scores: Vec<f32> = rows
        .iter()
        .map(|r| {
            meta_score(
                TierInput {
                    usage_percent: r.usage,
                    win_rate: r.win_rate(),
                    games: r.games,
                    top_cut_rate: r.top_cut_rate(),
                },
                max_usage,
                max_top_cut,
                mean_win_rate,
            )
        })
        .collect();
    let tiers = assign_tiers(&scores);

    let pokemon: Vec<PokemonUsage> = rows
        .iter()
        .zip(scores.iter())
        .zip(tiers.iter())
        .map(|((row, score), tier)| row.finish(*score, *tier))
        .collect();

    let sources: Vec<SourceProvenance> = contributing
        .iter()
        .zip(weights.iter())
        .map(|(s, w)| SourceProvenance {
            weight: *w,
            ..s.provenance.clone()
        })
        .collect();

    MergeOutcome {
        top_items: merge_entries(&contributing, &weights, |s| &s.top_items),
        top_moves: merge_entries(&contributing, &weights, |s| &s.top_moves),
        top_abilities: merge_entries(&contributing, &weights, |s| &s.top_abilities),
        top_tera: merge_entries(&contributing, &weights, |s| &s.top_tera),
        pokemon,
        sources,
    }
}

/// Weighted merge of a format-wide breakdown list.
fn merge_entries<F>(snapshots: &[SourceSnapshot], weights: &[f32], pick: F) -> Vec<UsageEntry>
where
    F: Fn(&SourceSnapshot) -> &Vec<UsageEntry>,
{
    let mut acc: HashMap<String, (f32, u32)> = HashMap::new();
    for (snapshot, weight) in snapshots.iter().zip(weights.iter()) {
        for entry in pick(snapshot) {
            let slot = acc.entry(entry.name.clone()).or_insert((0.0, 0));
            slot.0 += entry.usage_percent * weight;
            slot.1 += entry.count;
        }
    }
    top_n(acc)
}

fn top_n(acc: HashMap<String, (f32, u32)>) -> Vec<UsageEntry> {
    let mut out: Vec<UsageEntry> = acc
        .into_iter()
        .map(|(name, (usage, count))| UsageEntry {
            name,
            usage_percent: usage,
            count,
        })
        .collect();
    out.sort_by(|a, b| {
        b.usage_percent
            .partial_cmp(&a.usage_percent)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| a.name.cmp(&b.name))
    });
    out.truncate(TOP_N);
    out
}

fn mean_of(values: impl Iterator<Item = f32>) -> f32 {
    let (sum, n) = values.fold((0.0_f32, 0_u32), |(s, n), v| (s + v, n + 1));
    if n == 0 {
        50.0
    } else {
        sum / n as f32
    }
}

/// Per-species weighted accumulator.
struct Accumulator {
    key: String,
    display: String,
    usage: f32,
    count: u32,
    /// Weighted win-rate numerator and the weight that actually carried a win
    /// rate, kept apart so "no records" does not read as "0% wins".
    win_rate_sum: f32,
    win_rate_weight: f32,
    games: u32,
    top_cut_sum: f32,
    top_cut_weight: f32,
    sources: Vec<SourceId>,
    items: HashMap<String, (f32, u32)>,
    moves: HashMap<String, (f32, u32)>,
    abilities: HashMap<String, (f32, u32)>,
    tera: HashMap<String, (f32, u32)>,
    natures: HashMap<String, (f32, u32)>,
    teammates: Vec<TeammateUsage>,
    movesets: Vec<MovesetUsage>,
    sprite_url: String,
    sprite_fallback_url: Option<String>,
    home_sprite_url: Option<String>,
}

impl Accumulator {
    fn new(entry: &SourceEntry) -> Self {
        Self {
            key: entry.key.clone(),
            display: entry.display.clone(),
            usage: 0.0,
            count: 0,
            win_rate_sum: 0.0,
            win_rate_weight: 0.0,
            games: 0,
            top_cut_sum: 0.0,
            top_cut_weight: 0.0,
            sources: Vec::new(),
            items: HashMap::new(),
            moves: HashMap::new(),
            abilities: HashMap::new(),
            tera: HashMap::new(),
            natures: HashMap::new(),
            teammates: Vec::new(),
            movesets: Vec::new(),
            sprite_url: entry.sprite_url.clone(),
            sprite_fallback_url: entry.sprite_fallback_url.clone(),
            home_sprite_url: entry.home_sprite_url.clone(),
        }
    }

    fn add(&mut self, entry: &SourceEntry, weight: f32, source: SourceId) {
        self.usage += entry.usage_percent * weight;
        self.count += entry.count;
        if !self.sources.contains(&source) {
            self.sources.push(source);
        }
        if let Some(wr) = entry.win_rate {
            self.win_rate_sum += wr * weight;
            self.win_rate_weight += weight;
            self.games += entry.games;
        }
        if let Some(tc) = entry.top_cut_rate {
            self.top_cut_sum += tc * weight;
            self.top_cut_weight += weight;
        }
        accumulate(&mut self.items, &entry.top_items, weight);
        accumulate(&mut self.moves, &entry.top_moves, weight);
        accumulate(&mut self.abilities, &entry.top_abilities, weight);
        accumulate(&mut self.tera, &entry.top_tera, weight);
        accumulate(&mut self.natures, &entry.top_natures, weight);
        // Teammates and movesets are structured payloads rather than plain
        // name/percent pairs, so the richest source wins instead of being
        // averaged into something no source actually reported.
        if entry.top_teammates.len() > self.teammates.len() {
            self.teammates = entry.top_teammates.clone();
        }
        if entry.common_movesets.len() > self.movesets.len() {
            self.movesets = entry.common_movesets.clone();
        }
        if self.sprite_url.is_empty() {
            self.sprite_url = entry.sprite_url.clone();
        }
        if self.sprite_fallback_url.is_none() {
            self.sprite_fallback_url = entry.sprite_fallback_url.clone();
        }
        if self.home_sprite_url.is_none() {
            self.home_sprite_url = entry.home_sprite_url.clone();
        }
    }

    fn win_rate(&self) -> Option<f32> {
        if self.win_rate_weight <= 0.0 {
            None
        } else {
            Some(self.win_rate_sum / self.win_rate_weight)
        }
    }

    fn top_cut_rate(&self) -> Option<f32> {
        if self.top_cut_weight <= 0.0 {
            None
        } else {
            Some(self.top_cut_sum / self.top_cut_weight)
        }
    }

    fn finish(&self, score: f32, tier: crate::domain::tier::Tier) -> PokemonUsage {
        PokemonUsage {
            species: self.display.clone(),
            usage_percent: self.usage,
            count: self.count,
            top_items: top_n(self.items.clone()),
            top_moves: top_n(self.moves.clone()),
            top_abilities: top_n(self.abilities.clone()),
            top_tera: top_n(self.tera.clone()),
            top_teammates: self.teammates.clone(),
            top_natures: top_n(self.natures.clone()),
            common_movesets: self.movesets.clone(),
            sprite_url: self.sprite_url.clone(),
            sprite_fallback_url: self.sprite_fallback_url.clone(),
            home_sprite_url: self.home_sprite_url.clone(),
            win_rate: self.win_rate(),
            top_cut_rate: self.top_cut_rate(),
            meta_score: Some(score),
            tier: Some(tier),
            sources_covering: self.sources.len() as u8,
        }
    }
}

fn accumulate(acc: &mut HashMap<String, (f32, u32)>, entries: &[UsageEntry], weight: f32) {
    for entry in entries {
        let slot = acc.entry(entry.name.clone()).or_insert((0.0, 0));
        slot.0 += entry.usage_percent * weight;
        slot.1 += entry.count;
    }
}

/// Convenience for adapters building a [`SourceEntry`] from a display name.
pub fn entry_key(display: &str) -> String {
    canonical_id(display)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::tier::Tier;

    fn provenance(source: SourceId, teams: u32, matches: bool) -> SourceProvenance {
        SourceProvenance {
            source,
            declared_regulation: None,
            matches_active_format: matches,
            teams,
            tournaments: 1,
            from_date: None,
            to_date: None,
            weight: 0.0,
        }
    }

    fn entry(display: &str, usage: f32) -> SourceEntry {
        SourceEntry {
            key: entry_key(display),
            display: display.to_string(),
            canonical: display.to_string(),
            usage_percent: usage,
            count: 1,
            win_rate: None,
            games: 0,
            top_cut_rate: None,
            top_items: Vec::new(),
            top_moves: Vec::new(),
            top_abilities: Vec::new(),
            top_tera: Vec::new(),
            top_natures: Vec::new(),
            top_teammates: Vec::new(),
            common_movesets: Vec::new(),
            sprite_url: format!("https://sprites/{display}.png"),
            sprite_fallback_url: None,
            home_sprite_url: None,
        }
    }

    fn snapshot(
        source: SourceId,
        teams: u32,
        matches: bool,
        entries: Vec<SourceEntry>,
    ) -> SourceSnapshot {
        SourceSnapshot {
            provenance: provenance(source, teams, matches),
            entries,
            top_items: Vec::new(),
            top_moves: Vec::new(),
            top_abilities: Vec::new(),
            top_tera: Vec::new(),
        }
    }

    #[test]
    fn no_sources_yields_an_empty_result_not_a_panic() {
        let out = merge(Vec::new());
        assert!(out.pokemon.is_empty());
        assert!(out.sources.is_empty());
    }

    /// A source that returned nothing must not appear in the provenance list
    /// claiming a share of the result.
    #[test]
    fn empty_sources_are_dropped_from_provenance() {
        let out = merge(vec![
            snapshot(
                SourceId::Labmaus,
                100,
                true,
                vec![entry("Incineroar", 40.0)],
            ),
            snapshot(SourceId::Smogon, 500, true, Vec::new()),
        ]);
        assert_eq!(out.sources.len(), 1);
        assert_eq!(out.sources[0].source, SourceId::Labmaus);
    }

    #[test]
    fn a_single_source_passes_its_usage_through_unchanged() {
        let out = merge(vec![snapshot(
            SourceId::Labmaus,
            100,
            true,
            vec![entry("Incineroar", 40.0)],
        )]);
        assert_eq!(out.pokemon.len(), 1);
        assert!((out.pokemon[0].usage_percent - 40.0).abs() < 0.01);
        assert!((out.sources[0].weight - 1.0).abs() < 0.001);
    }

    #[test]
    fn weights_sum_to_one() {
        let out = merge(vec![
            snapshot(
                SourceId::Labmaus,
                500,
                true,
                vec![entry("Incineroar", 40.0)],
            ),
            snapshot(
                SourceId::Champteams,
                9000,
                true,
                vec![entry("Incineroar", 20.0)],
            ),
            snapshot(
                SourceId::Smogon,
                3000,
                true,
                vec![entry("Incineroar", 10.0)],
            ),
        ]);
        let total: f32 = out.sources.iter().map(|s| s.weight).sum();
        assert!((total - 1.0).abs() < 0.001, "weights summed to {total}");
    }

    /// The merged value must land between the inputs, never outside them.
    #[test]
    fn merged_usage_lies_between_the_sources() {
        let out = merge(vec![
            snapshot(
                SourceId::Labmaus,
                500,
                true,
                vec![entry("Incineroar", 40.0)],
            ),
            snapshot(
                SourceId::Limitless,
                500,
                true,
                vec![entry("Incineroar", 20.0)],
            ),
        ]);
        let usage = out.pokemon[0].usage_percent;
        assert!((20.0..=40.0).contains(&usage), "got {usage}");
    }

    /// A species only one source reports counts as 0% in the others, so it
    /// cannot leapfrog a species everybody reports.
    #[test]
    fn a_species_missing_from_a_source_counts_as_zero_there() {
        let out = merge(vec![
            snapshot(
                SourceId::Labmaus,
                500,
                true,
                vec![entry("Incineroar", 30.0), entry("Rillaboom", 30.0)],
            ),
            snapshot(
                SourceId::Limitless,
                500,
                true,
                vec![entry("Incineroar", 30.0)],
            ),
        ]);
        let incineroar = out
            .pokemon
            .iter()
            .find(|p| p.species == "Incineroar")
            .unwrap();
        let rillaboom = out
            .pokemon
            .iter()
            .find(|p| p.species == "Rillaboom")
            .unwrap();
        assert!(
            incineroar.usage_percent > rillaboom.usage_percent,
            "the species both sources report must rank higher"
        );
        assert_eq!(incineroar.sources_covering, 2);
        assert_eq!(rillaboom.sources_covering, 1);
    }

    /// Species keys collapse to the canonical id, so alternate spellings of
    /// the same Pokemon merge instead of splitting the meta in two.
    #[test]
    fn alternate_spellings_merge_into_one_species() {
        let out = merge(vec![
            snapshot(
                SourceId::Labmaus,
                500,
                true,
                vec![entry("Rotom-Wash", 10.0)],
            ),
            snapshot(
                SourceId::Limitless,
                500,
                true,
                vec![entry("Wash-Rotom", 10.0)],
            ),
        ]);
        assert_eq!(out.pokemon.len(), 1, "both spellings are one species");
        assert_eq!(out.pokemon[0].sources_covering, 2);
    }

    /// "Published no records" must not be averaged in as a 0% win rate.
    #[test]
    fn a_source_without_records_does_not_dilute_the_win_rate() {
        let mut with_records = entry("Incineroar", 30.0);
        with_records.win_rate = Some(60.0);
        with_records.games = 400;
        let out = merge(vec![
            snapshot(SourceId::Labmaus, 500, true, vec![with_records]),
            snapshot(
                SourceId::Limitless,
                500,
                true,
                vec![entry("Incineroar", 30.0)],
            ),
        ]);
        let wr = out.pokemon[0].win_rate.expect("win rate should survive");
        assert!((wr - 60.0).abs() < 0.01, "got {wr}");
    }

    #[test]
    fn species_without_any_records_report_no_win_rate() {
        let out = merge(vec![snapshot(
            SourceId::Labmaus,
            500,
            true,
            vec![entry("Incineroar", 30.0)],
        )]);
        assert_eq!(out.pokemon[0].win_rate, None);
    }

    /// The headline case: a big sample from the PREVIOUS regulation must not
    /// decide the meta for the current one.
    #[test]
    fn a_stale_source_is_outweighed_by_a_current_one() {
        let out = merge(vec![
            snapshot(
                SourceId::Labmaus,
                551,
                true,
                vec![entry("Incineroar", 40.0)],
            ),
            snapshot(
                SourceId::Champteams,
                12_113,
                false,
                vec![entry("Incineroar", 10.0)],
            ),
        ]);
        let usage = out.pokemon[0].usage_percent;
        assert!(
            usage > 25.0,
            "current source should dominate, merged usage was {usage}"
        );
        let labmaus = out
            .sources
            .iter()
            .find(|s| s.source == SourceId::Labmaus)
            .unwrap();
        assert!(labmaus.weight > 0.5);
    }

    #[test]
    fn every_species_gets_a_tier_and_a_score() {
        let entries: Vec<SourceEntry> = (0..30)
            .map(|i| entry(&format!("Mon{i}"), 30.0 - i as f32))
            .collect();
        let out = merge(vec![snapshot(SourceId::Labmaus, 500, true, entries)]);
        assert_eq!(out.pokemon.len(), 30);
        assert!(out.pokemon.iter().all(|p| p.tier.is_some()));
        assert!(out.pokemon.iter().all(|p| p.meta_score.is_some()));
        assert_eq!(out.pokemon[0].tier, Some(Tier::S));
    }

    #[test]
    fn results_are_sorted_by_usage_descending() {
        let out = merge(vec![snapshot(
            SourceId::Labmaus,
            500,
            true,
            vec![entry("Low", 5.0), entry("High", 40.0), entry("Mid", 20.0)],
        )]);
        let names: Vec<&str> = out.pokemon.iter().map(|p| p.species.as_str()).collect();
        assert_eq!(names, vec!["High", "Mid", "Low"]);
    }

    #[test]
    fn zero_team_sources_split_evenly_instead_of_producing_nan() {
        let out = merge(vec![
            snapshot(SourceId::Labmaus, 0, true, vec![entry("Incineroar", 40.0)]),
            snapshot(
                SourceId::Limitless,
                0,
                true,
                vec![entry("Incineroar", 20.0)],
            ),
        ]);
        let usage = out.pokemon[0].usage_percent;
        assert!(usage.is_finite(), "usage must not be NaN");
        assert!(
            (usage - 30.0).abs() < 0.01,
            "expected an even split, got {usage}"
        );
    }
}
