use crate::adapters::{LimitlessClient, SmogonClient};
use crate::config;
use crate::domain::format::Format;
use crate::domain::usage_stats::MetaSnapshot;
use crate::error::AppError;
use crate::services::usage_aggregator;
use crate::storage::CacheRepo;
use std::sync::Arc;

#[derive(Clone)]
pub struct MetaService {
    limitless: LimitlessClient,
    smogon: SmogonClient,
    cache: Arc<CacheRepo>,
}

impl MetaService {
    pub fn new(limitless: LimitlessClient, smogon: SmogonClient, cache: Arc<CacheRepo>) -> Self {
        Self {
            limitless,
            smogon,
            cache,
        }
    }

    pub async fn get_meta(&self, format: Format) -> Result<MetaSnapshot, AppError> {
        let cache_key = format!("meta-snapshot::{}", format.cache_id());
        if let Some(bytes) = self.cache.get(&cache_key)? {
            if let Ok(snap) = serde_json::from_slice::<MetaSnapshot>(&bytes) {
                return Ok(snap);
            }
        }

        let tournaments = self
            .limitless
            .list_tournaments(format, config::TOURNAMENTS_PER_SNAPSHOT)
            .await
            .unwrap_or_default();

        let mut all_standings = Vec::new();
        for t in &tournaments {
            match self.limitless.get_standings(&t.id).await {
                Ok(s) => all_standings.push(s),
                Err(e) => tracing::warn!(tournament = %t.id, error = %e, "standings fetch failed"),
            }
        }

        let mut snapshot = usage_aggregator::aggregate(format, all_standings);

        // Smogon fallback: if Limitless yielded no data, seed top items/moves from ladder stats.
        if snapshot.total_entries == 0 {
            if let Ok(Some(chaos)) = self.smogon.fetch_chaos(format).await {
                snapshot = seed_from_smogon(format, chaos);
            }
        }

        let bytes = serde_json::to_vec(&snapshot)?;
        self.cache.put(&cache_key, &bytes, config::TTL_META_SNAPSHOT)?;
        Ok(snapshot)
    }
}

fn seed_from_smogon(
    format: Format,
    chaos: crate::adapters::smogon_client::ChaosStats,
) -> MetaSnapshot {
    use crate::adapters::sprite_resolver::sprite_url;
    use crate::domain::usage_stats::{PokemonUsage, UsageEntry};
    use chrono::Utc;

    let mut pokemon: Vec<PokemonUsage> = chaos
        .data
        .into_iter()
        .map(|(name, entry)| PokemonUsage {
            species: name.clone(),
            usage_percent: (entry.usage * 100.0) as f32,
            count: 0,
            top_items: entry
                .items
                .into_iter()
                .take(5)
                .map(|(k, v)| UsageEntry {
                    name: k,
                    usage_percent: (v * 100.0) as f32,
                    count: 0,
                })
                .collect(),
            top_moves: entry
                .moves
                .into_iter()
                .take(6)
                .map(|(k, v)| UsageEntry {
                    name: k,
                    usage_percent: (v * 100.0) as f32,
                    count: 0,
                })
                .collect(),
            top_abilities: entry
                .abilities
                .into_iter()
                .take(3)
                .map(|(k, v)| UsageEntry {
                    name: k,
                    usage_percent: (v * 100.0) as f32,
                    count: 0,
                })
                .collect(),
            top_tera: entry
                .tera_types
                .into_iter()
                .take(5)
                .map(|(k, v)| UsageEntry {
                    name: k,
                    usage_percent: (v * 100.0) as f32,
                    count: 0,
                })
                .collect(),
            top_teammates: entry
                .teammates
                .into_iter()
                .take(5)
                .map(|(k, v)| UsageEntry {
                    name: k,
                    usage_percent: (v * 100.0) as f32,
                    count: 0,
                })
                .collect(),
            sprite_url: sprite_url(&name),
        })
        .collect();

    pokemon.sort_by(|a, b| b.usage_percent.partial_cmp(&a.usage_percent).unwrap());

    MetaSnapshot {
        format,
        generated_at: Utc::now(),
        source: "Smogon ladder (fallback)".into(),
        tournaments_used: 0,
        total_entries: pokemon.iter().map(|p| p.count).sum(),
        pokemon,
        top_items: Vec::new(),
        top_moves: Vec::new(),
        top_tera: Vec::new(),
    }
}
