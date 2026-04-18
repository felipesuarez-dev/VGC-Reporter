use crate::adapters::smogon_client::{ChaosStats, SmogonClient};
use crate::adapters::sprite_resolver::{fallback_sprite_url, primary_sprite_url};
use crate::adapters::LimitlessClient;
use crate::config;
use crate::domain::format::Format;
use crate::domain::usage_stats::{MetaSnapshot, PokemonUsage, UsageEntry};
use crate::error::AppError;
use crate::services::usage_aggregator::{self, top_n_normalized};
use crate::storage::{CacheRepo, SettingsRepo};
use chrono::Utc;
use std::collections::HashMap;
use std::sync::Arc;

const MIN_LIMITLESS_ENTRIES: u32 = 50;

#[derive(Clone)]
pub struct MetaService {
    limitless: LimitlessClient,
    smogon: SmogonClient,
    cache: Arc<CacheRepo>,
    settings: Arc<SettingsRepo>,
}

impl MetaService {
    pub fn new(
        limitless: LimitlessClient,
        smogon: SmogonClient,
        cache: Arc<CacheRepo>,
        settings: Arc<SettingsRepo>,
    ) -> Self {
        Self {
            limitless,
            smogon,
            cache,
            settings,
        }
    }

    pub async fn get_meta(
        &self,
        format: Format,
        tournament_count: Option<usize>,
    ) -> Result<MetaSnapshot, AppError> {
        let count = tournament_count.unwrap_or(config::TOURNAMENTS_PER_SNAPSHOT);
        let cache_key = format!("meta-snapshot-v6::{}::{}", format.cache_id(), count);
        if let Some(bytes) = self.cache.get(&cache_key)? {
            if let Ok(snap) = serde_json::from_slice::<MetaSnapshot>(&bytes) {
                return Ok(snap);
            }
        }

        let lim_snap = if format.limitless_code().is_some() {
            let tournaments = self
                .limitless
                .list_tournaments(format, count)
                .await
                .unwrap_or_default();
            let mut all_standings = Vec::new();
            for t in &tournaments {
                match self.limitless.get_standings(&t.id).await {
                    Ok(s) => all_standings.push(s),
                    Err(e) => {
                        tracing::warn!(tournament = %t.id, error = %e, "standings fetch failed")
                    }
                }
            }
            let mut dates: Vec<String> =
                tournaments.iter().filter_map(|t| t.date.clone()).collect();
            dates.sort();
            let from_date = dates.first().cloned();
            let to_date = dates.last().cloned();
            let mut snap = usage_aggregator::aggregate(format, all_standings);
            snap.from_date = from_date;
            snap.to_date = to_date;
            Some(snap)
        } else {
            None
        };

        let sm_snap = self
            .smogon
            .fetch_chaos_for_format(format, &self.settings)
            .await
            .ok()
            .flatten()
            .map(|(slug, chaos)| snapshot_from_smogon(format, chaos, &slug));

        let final_snap = match (lim_snap, sm_snap) {
            (Some(lim), _) if lim.total_entries >= MIN_LIMITLESS_ENTRIES => lim,
            (_, Some(sm)) => sm,
            (Some(lim), None) => lim,
            (None, None) => MetaSnapshot::empty(format),
        };

        let bytes = serde_json::to_vec(&final_snap)?;
        self.cache
            .put(&cache_key, &bytes, config::TTL_META_SNAPSHOT)?;
        Ok(final_snap)
    }
}

pub(crate) fn snapshot_from_smogon(
    format: Format,
    chaos: ChaosStats,
    slug_used: &str,
) -> MetaSnapshot {
    let mut global_items: HashMap<String, f64> = HashMap::new();
    let mut global_moves: HashMap<String, f64> = HashMap::new();
    let mut global_abilities: HashMap<String, f64> = HashMap::new();

    for entry in chaos.data.values() {
        for (item, ratio) in &entry.items {
            *global_items
                .entry(usage_aggregator::prettify_public(item))
                .or_insert(0.0) += entry.usage * ratio;
        }
        for (mv, ratio) in &entry.moves {
            *global_moves
                .entry(usage_aggregator::prettify_public(mv))
                .or_insert(0.0) += entry.usage * ratio;
        }
        for (ab, ratio) in &entry.abilities {
            *global_abilities
                .entry(usage_aggregator::prettify_public(ab))
                .or_insert(0.0) += entry.usage * ratio;
        }
    }

    let species_count = chaos.data.len() as u32;

    let mut pokemon: Vec<PokemonUsage> = chaos
        .data
        .into_iter()
        .map(|(name, entry)| PokemonUsage {
            species: usage_aggregator::prettify_public(&name),
            usage_percent: (entry.usage * 100.0) as f32,
            count: 0,
            top_items: entry
                .items
                .into_iter()
                .take(5)
                .map(|(k, v)| UsageEntry {
                    name: usage_aggregator::prettify_public(&k),
                    usage_percent: (v * 100.0) as f32,
                    count: 0,
                })
                .collect(),
            top_moves: entry
                .moves
                .into_iter()
                .take(6)
                .map(|(k, v)| UsageEntry {
                    name: usage_aggregator::prettify_public(&k),
                    usage_percent: (v * 100.0) as f32,
                    count: 0,
                })
                .collect(),
            top_abilities: entry
                .abilities
                .into_iter()
                .take(3)
                .map(|(k, v)| UsageEntry {
                    name: usage_aggregator::prettify_public(&k),
                    usage_percent: (v * 100.0) as f32,
                    count: 0,
                })
                .collect(),
            top_tera: Vec::new(),
            top_teammates: entry
                .teammates
                .into_iter()
                .take(5)
                .map(|(k, v)| UsageEntry {
                    name: usage_aggregator::prettify_public(&k),
                    usage_percent: (v * 100.0) as f32,
                    count: 0,
                })
                .collect(),
            top_natures: Vec::new(),
            common_movesets: Vec::new(),
            sprite_url: primary_sprite_url(&name),
            sprite_fallback_url: fallback_sprite_url(&name),
        })
        .collect();
    pokemon.sort_by(|a, b| b.usage_percent.partial_cmp(&a.usage_percent).unwrap());

    MetaSnapshot {
        format,
        generated_at: Utc::now(),
        source: format!("Smogon ladder ({})", slug_used),
        // Smogon chaos data is a ladder snapshot rather than a tournament
        // aggregate, so we report the number of distinct species tracked as
        // `total_entries` and leave `tournaments_used` at 0 — the dashboard
        // reads `source` to pick the right label.
        tournaments_used: 0,
        total_entries: species_count,
        pokemon,
        top_items: top_n_normalized(&global_items, 15),
        top_moves: top_n_normalized(&global_moves, 20),
        top_abilities: top_n_normalized(&global_abilities, 10),
        top_tera: Vec::new(),
        from_date: None,
        to_date: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::adapters::smogon_client::{ChaosEntry, ChaosStats};
    use std::collections::BTreeMap;

    fn chaos_entry(
        usage: f64,
        moves: &[(&str, f64)],
        items: &[(&str, f64)],
        abilities: &[(&str, f64)],
        tera: &[(&str, f64)],
    ) -> ChaosEntry {
        ChaosEntry {
            usage,
            moves: moves.iter().map(|(k, v)| (k.to_string(), *v)).collect(),
            items: items.iter().map(|(k, v)| (k.to_string(), *v)).collect(),
            abilities: abilities.iter().map(|(k, v)| (k.to_string(), *v)).collect(),
            teammates: BTreeMap::new(),
            tera_types: tera.iter().map(|(k, v)| (k.to_string(), *v)).collect(),
        }
    }

    #[test]
    fn snapshot_from_smogon_populates_top_level() {
        let mut data = BTreeMap::new();
        data.insert(
            "Incineroar".into(),
            chaos_entry(
                0.5,
                &[("Fake Out", 0.9), ("Knock Off", 0.8)],
                &[("Safety Goggles", 0.4), ("Assault Vest", 0.3)],
                &[("Intimidate", 1.0)],
                &[("Ghost", 0.4), ("Dark", 0.3)],
            ),
        );
        data.insert(
            "Urshifu".into(),
            chaos_entry(
                0.3,
                &[("Wicked Blow", 0.95), ("Close Combat", 0.8)],
                &[("Focus Sash", 0.5), ("Choice Scarf", 0.2)],
                &[("Unseen Fist", 1.0)],
                &[("Fighting", 0.5), ("Dark", 0.3)],
            ),
        );
        data.insert(
            "Rillaboom".into(),
            chaos_entry(
                0.25,
                &[("Grassy Glide", 0.9), ("Fake Out", 0.6)],
                &[("Assault Vest", 0.4), ("Sitrus Berry", 0.3)],
                &[("Grassy Surge", 1.0)],
                &[("Fire", 0.4), ("Grass", 0.3)],
            ),
        );
        let chaos = ChaosStats { data };
        let snap = snapshot_from_smogon(Format::RegulationI, chaos, "gen9vgc2026regi");
        assert!(!snap.top_items.is_empty(), "top_items should be populated");
        assert!(!snap.top_moves.is_empty(), "top_moves should be populated");
        assert!(
            !snap.top_abilities.is_empty(),
            "top_abilities should be populated"
        );
        assert!(
            snap.top_tera.is_empty(),
            "top_tera is disabled while Regulation M-A is Tera-less"
        );
        assert_eq!(snap.pokemon.len(), 3);
        assert_eq!(snap.total_entries, 3, "total_entries mirrors species count");
        assert!(snap.pokemon[0].usage_percent >= snap.pokemon[1].usage_percent);
    }

    #[test]
    fn top_n_normalized_percentages_sum_to_about_100() {
        let mut counts: HashMap<String, f64> = HashMap::new();
        counts.insert("A".into(), 3.0);
        counts.insert("B".into(), 2.0);
        counts.insert("C".into(), 1.0);
        let top = top_n_normalized(&counts, 10);
        let sum: f32 = top.iter().map(|e| e.usage_percent).sum();
        assert!((sum - 100.0).abs() < 0.5, "sum was {}", sum);
    }
}
