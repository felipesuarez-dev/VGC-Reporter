use crate::adapters::labmaus_client::LabmausDiscoverTeam;
use crate::adapters::limitless_client::{LimitlessDecklistEntry, LimitlessStanding};
use crate::adapters::smogon_client::{ChaosStats, SmogonClient};
use crate::adapters::sprite_resolver::{
    canonical_display_name, canonical_id, fallback_sprite_url, primary_sprite_url,
};
use crate::adapters::{LabmausClient, LimitlessClient, PokepasteClient, ShowdownEntry};
use crate::config;
use crate::domain::format::Format;
use crate::domain::usage_stats::{MetaSnapshot, PokemonUsage, TeammateUsage, UsageEntry};
use crate::error::AppError;
use crate::services::date_window::window_for;
use crate::services::pokedex_service::PokedexService;
use crate::services::usage_aggregator::{self, top_n_normalized};
use crate::storage::{CacheRepo, SettingsRepo};
use chrono::Utc;
use futures::stream::{self, StreamExt};
use std::collections::{HashMap, HashSet};
use std::sync::Arc;

const MIN_LIMITLESS_ENTRIES: u32 = 50;
const LABMAUS_POKEPASTE_CONCURRENCY: usize = 16;

/// Map from `canonical_id` → `(primary, fallback, home)` sprite URLs, used
/// to inject pokedex-backed HOME fallbacks into otherwise-sync snapshot
/// builders. Missing entries trigger the heuristic sprite_resolver path.
pub(crate) type SpriteMap = HashMap<String, (String, Option<String>, Option<String>)>;

#[derive(Clone)]
pub struct MetaService {
    labmaus: LabmausClient,
    pokepaste: PokepasteClient,
    limitless: LimitlessClient,
    smogon: SmogonClient,
    pokedex: Arc<PokedexService>,
    cache: Arc<CacheRepo>,
    settings: Arc<SettingsRepo>,
}

impl MetaService {
    pub fn new(
        labmaus: LabmausClient,
        pokepaste: PokepasteClient,
        limitless: LimitlessClient,
        smogon: SmogonClient,
        pokedex: Arc<PokedexService>,
        cache: Arc<CacheRepo>,
        settings: Arc<SettingsRepo>,
    ) -> Self {
        Self {
            labmaus,
            pokepaste,
            limitless,
            smogon,
            pokedex,
            cache,
            settings,
        }
    }

    /// Batch-resolve sprites for every unique species (and teammate)
    /// referenced in a Smogon chaos blob. Keys by `canonical_id` so the
    /// downstream sync builder can look them up cheaply.
    async fn resolve_smogon_sprites(&self, chaos: &ChaosStats) -> SpriteMap {
        let mut names: Vec<String> = Vec::new();
        for (species, entry) in chaos.data.iter() {
            names.push(species.clone());
            for teammate in entry.teammates.keys() {
                names.push(teammate.clone());
            }
        }
        names.sort();
        names.dedup();
        let mut out: SpriteMap = HashMap::with_capacity(names.len());
        for raw in names {
            let key = canonical_id(&raw);
            if key.is_empty() || out.contains_key(&key) {
                continue;
            }
            let urls = self.pokedex.sprite_urls_for(&raw).await;
            out.insert(key, urls);
        }
        out
    }

    pub async fn get_meta(
        &self,
        format: Format,
        tournament_count: Option<usize>,
    ) -> Result<MetaSnapshot, AppError> {
        let count = tournament_count.unwrap_or(config::TOURNAMENTS_PER_SNAPSHOT);
        let cache_key = format!("meta-snapshot-v12::{}::{}", format.cache_id(), count);
        if let Some(bytes) = self.cache.get(&cache_key)? {
            if let Ok(snap) = serde_json::from_slice::<MetaSnapshot>(&bytes) {
                return Ok(snap);
            }
        }

        // PRIMARY: labmaus discover_teams + pokepast.es (any format with a
        // labmaus regulation name, i.e. the Champions sets M-A / M-B).
        if format.default_labmaus_name().is_some() {
            match self.build_from_labmaus(format).await {
                Ok(Some(snap)) if snap.total_entries >= MIN_LIMITLESS_ENTRIES => {
                    tracing::info!(
                        source = "labmaus",
                        total = snap.total_entries,
                        "meta snapshot"
                    );
                    let bytes = serde_json::to_vec(&snap)?;
                    self.cache
                        .put(&cache_key, &bytes, config::TTL_META_SNAPSHOT)?;
                    return Ok(snap);
                }
                Ok(other) => tracing::warn!(
                    source = "labmaus",
                    entries = other.as_ref().map(|s| s.total_entries).unwrap_or(0),
                    "labmaus snapshot too thin, falling back to limitless"
                ),
                Err(e) => tracing::warn!(error = ?e, "labmaus meta snapshot failed, falling back"),
            }
        }

        // FALLBACK: existing Limitless standings path.
        let lim_snap = if format.limitless_code().is_some() {
            let tournaments = self
                .limitless
                .list_tournaments_by_format(format, count)
                .await
                .unwrap_or_default();
            tracing::info!(
                source = "limitless",
                tournaments = tournaments.len(),
                format = ?format,
                "meta fallback: aggregating limitless standings"
            );
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

        let sm_snap = match self
            .smogon
            .fetch_chaos_for_format(format, &self.settings)
            .await
            .ok()
            .flatten()
        {
            Some((slug, chaos)) => {
                let sprites = self.resolve_smogon_sprites(&chaos).await;
                Some(snapshot_from_smogon(format, chaos, &slug, &sprites))
            }
            None => None,
        };

        let final_snap = match (lim_snap, sm_snap) {
            (Some(lim), _) if lim.total_entries >= MIN_LIMITLESS_ENTRIES => {
                tracing::info!(
                    source = "limitless",
                    total = lim.total_entries,
                    "meta snapshot"
                );
                lim
            }
            (_, Some(sm)) => {
                tracing::info!(source = "smogon", total = sm.total_entries, "meta snapshot");
                sm
            }
            (Some(lim), None) => {
                tracing::info!(
                    source = "limitless-thin",
                    total = lim.total_entries,
                    "meta snapshot"
                );
                lim
            }
            (None, None) => {
                tracing::warn!("meta snapshot empty: no source produced data");
                MetaSnapshot::empty(format)
            }
        };

        // Never cache an empty snapshot: a transient upstream failure (or a
        // regulation labmaus hasn't populated yet) would otherwise stick for
        // the full TTL and keep showing "no data" even after the source
        // recovers. Same guard trending_service uses.
        if final_snap.total_entries > 0 {
            let bytes = serde_json::to_vec(&final_snap)?;
            self.cache
                .put(&cache_key, &bytes, config::TTL_META_SNAPSHOT)?;
        }
        Ok(final_snap)
    }

    async fn build_from_labmaus(&self, format: Format) -> Result<Option<MetaSnapshot>, AppError> {
        let (from, to) = window_for(format);
        let regulation = format
            .default_labmaus_name()
            .unwrap_or(config::REGULATION_MA_LABMAUS);
        let teams = self
            .labmaus
            .get_discover_teams(&from, &to, regulation)
            .await?;
        if teams.is_empty() {
            return Ok(None);
        }

        let resolved = resolve_pokepastes(&self.pokepaste, &teams).await;
        let standings = standings_from_labmaus(&teams, &resolved);
        let mut snap = usage_aggregator::aggregate(format, vec![standings]);
        let distinct_tournaments = teams
            .iter()
            .filter_map(|t| t.tournament_name.as_deref())
            .filter(|s| !s.is_empty())
            .collect::<HashSet<_>>()
            .len() as u32;
        if distinct_tournaments > 0 {
            snap.tournaments_used = distinct_tournaments;
        }
        snap.source = format!("labmaus.net ({} teams, {} to {})", teams.len(), from, to);
        snap.from_date = Some(from);
        snap.to_date = Some(to);
        Ok(Some(snap))
    }
}

pub(crate) async fn resolve_pokepastes(
    client: &PokepasteClient,
    teams: &[LabmausDiscoverTeam],
) -> Vec<Vec<ShowdownEntry>> {
    let urls: Vec<String> = teams.iter().map(|t| t.team_url.clone()).collect();
    let fetches: Vec<_> = urls
        .into_iter()
        .map(|url| {
            let client = client.clone();
            async move {
                match client.get_team(&url).await {
                    Ok(v) => v,
                    Err(e) => {
                        tracing::debug!(url = %url, error = ?e, "pokepaste fetch failed");
                        Vec::new()
                    }
                }
            }
        })
        .collect();
    stream::iter(fetches)
        .buffer_unordered(LABMAUS_POKEPASTE_CONCURRENCY)
        .collect::<Vec<_>>()
        .await
}

pub(crate) fn standings_from_labmaus(
    teams: &[LabmausDiscoverTeam],
    resolved: &[Vec<ShowdownEntry>],
) -> Vec<LimitlessStanding> {
    teams
        .iter()
        .zip(resolved.iter())
        .map(|(team, paste)| {
            let deck = if !paste.is_empty() {
                paste
                    .iter()
                    .map(|e| LimitlessDecklistEntry {
                        id: None,
                        name: None,
                        species: Some(e.species.clone()),
                        pokemon: None,
                        item: e.item.clone(),
                        ability: e.ability.clone(),
                        tera: None,
                        tera_type: e.tera_type.clone(),
                        moves: if e.moves.is_empty() {
                            None
                        } else {
                            Some(e.moves.clone())
                        },
                        nature: e.nature.clone(),
                    })
                    .collect::<Vec<_>>()
            } else {
                team.pokemon_names
                    .iter()
                    .map(|s| LimitlessDecklistEntry {
                        id: None,
                        name: None,
                        species: Some(s.clone()),
                        pokemon: None,
                        item: None,
                        ability: None,
                        tera: None,
                        tera_type: None,
                        moves: None,
                        nature: None,
                    })
                    .collect::<Vec<_>>()
            };
            LimitlessStanding {
                placing: team.placement,
                name: Some(team.player.clone()),
                player: None,
                country: team.country.clone(),
                decklist: if deck.is_empty() { None } else { Some(deck) },
                record: None,
                drop: None,
            }
        })
        .collect()
}

pub(crate) fn snapshot_from_smogon(
    format: Format,
    chaos: ChaosStats,
    slug_used: &str,
    sprites: &SpriteMap,
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
        .map(|(name, entry)| {
            let canonical = canonical_display_name(&name);
            let (primary, fallback, home) = lookup_sprite(sprites, &canonical);
            PokemonUsage {
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
                    .map(|(k, v)| {
                        let canonical_mate = canonical_display_name(&k);
                        let (m_primary, m_fallback, m_home) =
                            lookup_sprite(sprites, &canonical_mate);
                        TeammateUsage {
                            name: usage_aggregator::prettify_public(&canonical_mate),
                            usage_percent: (v * 100.0) as f32,
                            count: 0,
                            sprite_url: m_primary,
                            sprite_fallback_url: m_fallback,
                            home_sprite_url: m_home,
                        }
                    })
                    .collect(),
                top_natures: Vec::new(),
                common_movesets: Vec::new(),
                sprite_url: primary,
                sprite_fallback_url: fallback,
                home_sprite_url: home,
            }
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
        battles_analyzed: 0,
        pokemon,
        top_items: top_n_normalized(&global_items, 15),
        top_moves: top_n_normalized(&global_moves, 20),
        top_abilities: top_n_normalized(&global_abilities, 10),
        top_tera: Vec::new(),
        from_date: None,
        to_date: None,
    }
}

fn lookup_sprite(sprites: &SpriteMap, canonical: &str) -> (String, Option<String>, Option<String>) {
    let key = canonical_id(canonical);
    if let Some(urls) = sprites.get(&key) {
        return urls.clone();
    }
    (
        primary_sprite_url(canonical),
        fallback_sprite_url(canonical),
        None,
    )
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
        let sprites = SpriteMap::new();
        let snap = snapshot_from_smogon(Format::RegulationI, chaos, "gen9vgc2026regi", &sprites);
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
