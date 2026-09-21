use crate::adapters::labmaus_client::LabmausDiscoverTeam;
use crate::adapters::limitless_client::{LimitlessDecklistEntry, LimitlessStanding};
use crate::adapters::smogon_client::{ChaosStats, SmogonClient};
use crate::adapters::sprite_resolver::{
    canonical_display_name, canonical_id, fallback_sprite_url, primary_sprite_url,
};
use crate::adapters::{
    ChampteamsClient, LabmausClient, LimitlessClient, PokepasteClient, ShowdownEntry,
};
use crate::config;
use crate::domain::format::Format;
use crate::domain::source_stats::{SourceId, SourceProvenance};
use crate::domain::usage_stats::{MetaSnapshot, PokemonUsage, TeammateUsage, UsageEntry};
use crate::error::AppError;
use crate::services::aggregation::records::RecordTally;
use crate::services::aggregation::{self, SourceEntry, SourceSnapshot};
use crate::services::date_window::chunked_window_for;
use crate::services::pokedex_service::PokedexService;
use crate::services::usage_aggregator::{self, top_n_normalized};
use crate::storage::{CacheRepo, SettingsRepo};
use chrono::Utc;
use futures::stream::{self, StreamExt};
use std::collections::{HashMap, HashSet};
use std::sync::Arc;

const LABMAUS_POKEPASTE_CONCURRENCY: usize = 16;
/// Window chunks fetched at once. Kept low: the chunks exist because the
/// upstream times out, so hammering it with all of them at once defeats the
/// point.
const LABMAUS_CHUNK_CONCURRENCY: usize = 4;

/// Map from `canonical_id` → `(primary, fallback, home)` sprite URLs, used
/// to inject pokedex-backed HOME fallbacks into otherwise-sync snapshot
/// builders. Missing entries trigger the heuristic sprite_resolver path.
pub(crate) type SpriteMap = HashMap<String, (String, Option<String>, Option<String>)>;

#[derive(Clone)]
pub struct MetaService {
    labmaus: LabmausClient,
    champteams: ChampteamsClient,
    pokepaste: PokepasteClient,
    limitless: LimitlessClient,
    smogon: SmogonClient,
    pokedex: Arc<PokedexService>,
    cache: Arc<CacheRepo>,
    settings: Arc<SettingsRepo>,
}

/// Everything [`MetaService`] needs, grouped so adding a source does not keep
/// growing a positional argument list nobody can read at the call site.
pub struct MetaServiceDeps {
    pub labmaus: LabmausClient,
    pub champteams: ChampteamsClient,
    pub pokepaste: PokepasteClient,
    pub limitless: LimitlessClient,
    pub smogon: SmogonClient,
    pub pokedex: Arc<PokedexService>,
    pub cache: Arc<CacheRepo>,
    pub settings: Arc<SettingsRepo>,
}

impl MetaService {
    pub fn new(deps: MetaServiceDeps) -> Self {
        Self {
            labmaus: deps.labmaus,
            champteams: deps.champteams,
            pokepaste: deps.pokepaste,
            limitless: deps.limitless,
            smogon: deps.smogon,
            pokedex: deps.pokedex,
            cache: deps.cache,
            settings: deps.settings,
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

    /// Build a meta snapshot by merging every available source.
    ///
    /// `source` filters the merge to one provider. That is a filter, not a
    /// separate code path: a single source is the degenerate case of the merge
    /// and goes through exactly the same arithmetic, so there is no second
    /// implementation to drift.
    ///
    /// No individual source can fail the snapshot. Each one is fetched inside
    /// its own span and a failure drops that source from the merge and nothing
    /// else, which is the difference between "one upstream is down" and "the
    /// Dashboard is empty".
    pub async fn get_meta(
        &self,
        format: Format,
        tournament_count: Option<usize>,
        source: Option<SourceId>,
    ) -> Result<MetaSnapshot, AppError> {
        let count = tournament_count.unwrap_or(config::TOURNAMENTS_PER_SNAPSHOT);
        // The filter is part of the key: without it, picking a single source
        // would serve the cached merged snapshot and look like it did nothing.
        let cache_key = format!(
            "meta-snapshot-v13::{}::{}::{}",
            format.cache_id(),
            count,
            source.map(|s| s.as_str()).unwrap_or("all")
        );
        if let Some(bytes) = self.cache.get(&cache_key)? {
            if let Ok(snap) = serde_json::from_slice::<MetaSnapshot>(&bytes) {
                return Ok(snap);
            }
        }

        let wanted = |id: SourceId| source.is_none() || source == Some(id);
        let mut snapshots: Vec<SourceSnapshot> = Vec::new();

        if wanted(SourceId::Labmaus) {
            match self.labmaus_source(format).await {
                Ok(Some(s)) => snapshots.push(s),
                Ok(None) => tracing::info!(source = "labmaus", "no data for format"),
                Err(e) => tracing::warn!(
                    source = "labmaus",
                    error = %e,
                    "source failed, excluded from merge"
                ),
            }
        }
        if wanted(SourceId::Limitless) {
            match self.limitless_source(format, count).await {
                Ok(Some(s)) => snapshots.push(s),
                Ok(None) => tracing::info!(source = "limitless", "no data for format"),
                Err(e) => tracing::warn!(
                    source = "limitless",
                    error = %e,
                    "source failed, excluded from merge"
                ),
            }
        }
        if wanted(SourceId::Champteams) {
            match self.champteams_source(format).await {
                Ok(Some(s)) => snapshots.push(s),
                Ok(None) => tracing::info!(source = "champteams", "no data for format"),
                Err(e) => tracing::warn!(
                    source = "champteams",
                    error = %e,
                    "source failed, excluded from merge"
                ),
            }
        }
        if wanted(SourceId::Smogon) {
            match self.smogon_source(format).await {
                Ok(Some(s)) => snapshots.push(s),
                Ok(None) => tracing::info!(source = "smogon", "no data for format"),
                Err(e) => tracing::warn!(
                    source = "smogon",
                    error = %e,
                    "source failed, excluded from merge"
                ),
            }
        }

        for s in &snapshots {
            tracing::info!(
                source = %s.provenance.source,
                teams = s.provenance.teams,
                tournaments = s.provenance.tournaments,
                declared = ?s.provenance.declared_regulation,
                current = s.provenance.matches_active_format,
                species = s.entries.len(),
                "source ok"
            );
        }

        let final_snap = self.assemble(format, snapshots);

        tracing::info!(
            format = %format,
            filter = source.map(|s| s.as_str()).unwrap_or("all"),
            sources = final_snap.sources.len(),
            species = final_snap.pokemon.len(),
            entries = final_snap.total_entries,
            "meta snapshot"
        );

        // Never cache an empty snapshot: a transient upstream failure would
        // otherwise stick for the full TTL and keep showing "no data" long
        // after the source recovered.
        if final_snap.total_entries > 0 {
            let bytes = serde_json::to_vec(&final_snap)?;
            self.cache
                .put(&cache_key, &bytes, config::TTL_META_SNAPSHOT)?;
        }
        Ok(final_snap)
    }

    /// Turn merged sources into the snapshot the frontend consumes.
    fn assemble(&self, format: Format, snapshots: Vec<SourceSnapshot>) -> MetaSnapshot {
        if snapshots.is_empty() {
            tracing::warn!(format = %format, "meta snapshot empty: no source produced data");
            return MetaSnapshot::empty(format);
        }

        // Totals describe the union of what was actually read, so the UI can
        // say how much evidence is behind the numbers.
        let tournaments_used = snapshots
            .iter()
            .map(|s| s.provenance.tournaments)
            .max()
            .unwrap_or(0);
        let total_entries = snapshots.iter().map(|s| s.provenance.teams).sum();
        let from_date = snapshots
            .iter()
            .filter_map(|s| s.provenance.from_date.clone())
            .min();
        let to_date = snapshots
            .iter()
            .filter_map(|s| s.provenance.to_date.clone())
            .max();
        let label = snapshots
            .iter()
            .map(|s| s.provenance.source.as_str())
            .collect::<Vec<_>>()
            .join(" + ");

        let merged = aggregation::merge(snapshots);

        MetaSnapshot {
            format,
            generated_at: Utc::now(),
            source: label,
            tournaments_used,
            total_entries,
            battles_analyzed: total_entries,
            pokemon: merged.pokemon,
            top_items: merged.top_items,
            top_moves: merged.top_moves,
            top_abilities: merged.top_abilities,
            top_tera: merged.top_tera,
            from_date,
            to_date,
            sources: merged.sources,
        }
    }

    /// Labmaus: real tournament teams, and the only source that carries match
    /// records, so it is where our own win rate comes from.
    ///
    /// The window is chunked because labmaus 503s on any span wider than about
    /// three weeks, and a regulation runs for months. Chunks are fetched
    /// concurrently and de-duplicated by team URL, since the same paste can
    /// appear in more than one tournament listing.
    async fn labmaus_source(&self, format: Format) -> Result<Option<SourceSnapshot>, AppError> {
        let Some(regulation) = format.default_labmaus_name() else {
            return Ok(None);
        };
        let chunks = chunked_window_for(format);
        if chunks.is_empty() {
            return Ok(None);
        }

        let fetches: Vec<_> = chunks
            .iter()
            .map(|(from, to)| {
                let labmaus = self.labmaus.clone();
                let (from, to) = (from.clone(), to.clone());
                async move {
                    match labmaus.get_discover_teams(&from, &to, regulation).await {
                        Ok(teams) => teams,
                        Err(e) => {
                            // One chunk failing must not lose the others: a
                            // partial window beats no meta at all.
                            tracing::warn!(
                                source = "labmaus",
                                from = %from,
                                to = %to,
                                error = %e,
                                "window chunk failed, continuing with the rest"
                            );
                            Vec::new()
                        }
                    }
                }
            })
            .collect();

        let chunked: Vec<Vec<LabmausDiscoverTeam>> = stream::iter(fetches)
            .buffer_unordered(LABMAUS_CHUNK_CONCURRENCY)
            .collect()
            .await;

        let mut seen_urls: HashSet<String> = HashSet::new();
        let mut teams: Vec<LabmausDiscoverTeam> = Vec::new();
        for batch in chunked {
            for team in batch {
                if seen_urls.insert(team.team_url.clone()) {
                    teams.push(team);
                }
            }
        }
        if teams.is_empty() {
            return Ok(None);
        }

        let resolved = resolve_pokepastes(&self.pokepaste, &teams).await;
        let records = tally_records(&teams, &resolved);
        let standings = standings_from_labmaus(&teams, &resolved);
        let snap = usage_aggregator::aggregate(format, vec![standings]);

        let tournaments = teams
            .iter()
            .filter_map(|t| t.tournament_name.as_deref())
            .filter(|s| !s.is_empty())
            .collect::<HashSet<_>>()
            .len() as u32;

        let provenance = SourceProvenance {
            source: SourceId::Labmaus,
            // Labmaus is queried BY regulation label, so whatever came back is
            // by construction the regulation that was asked for.
            declared_regulation: Some(regulation.to_string()),
            matches_active_format: true,
            teams: teams.len() as u32,
            tournaments,
            from_date: chunks.first().map(|c| c.0.clone()),
            to_date: chunks.last().map(|c| c.1.clone()),
            weight: 0.0,
        };
        Ok(Some(aggregation::from_meta_snapshot(
            snap, provenance, &records,
        )))
    }

    /// Limitless: tournament standings with inline decklists.
    async fn limitless_source(
        &self,
        format: Format,
        count: usize,
    ) -> Result<Option<SourceSnapshot>, AppError> {
        if format.limitless_code().is_none() {
            return Ok(None);
        }
        let tournaments = self
            .limitless
            .list_tournaments_by_format(format, count)
            .await
            .unwrap_or_default();
        if tournaments.is_empty() {
            return Ok(None);
        }

        let mut all_standings = Vec::new();
        for t in &tournaments {
            match self.limitless.get_standings(&t.id).await {
                Ok(s) => all_standings.push(s),
                Err(e) => {
                    tracing::warn!(tournament = %t.id, error = %e, "standings fetch failed")
                }
            }
        }
        let teams: u32 = all_standings.iter().map(|s| s.len() as u32).sum();
        if teams == 0 {
            return Ok(None);
        }

        let mut dates: Vec<String> = tournaments.iter().filter_map(|t| t.date.clone()).collect();
        dates.sort();
        let snap = usage_aggregator::aggregate(format, all_standings);

        let provenance = SourceProvenance {
            source: SourceId::Limitless,
            declared_regulation: format.limitless_code().map(|c| c.to_string()),
            // The client already filters the tournament list to this
            // regulation own date window before it gets here.
            matches_active_format: true,
            teams,
            tournaments: tournaments.len() as u32,
            from_date: dates.first().cloned(),
            to_date: dates.last().cloned(),
            weight: 0.0,
        };
        Ok(Some(aggregation::from_meta_snapshot(
            snap,
            provenance,
            &HashMap::new(),
        )))
    }

    /// Champteams: a derived aggregate that publishes a win rate of its own.
    ///
    /// It ignores the format parameter and may be serving a previous
    /// regulation, so provenance is read back from the payload and the merge
    /// weights it accordingly. Never assume the request decided it.
    async fn champteams_source(&self, format: Format) -> Result<Option<SourceSnapshot>, AppError> {
        let list = self.champteams.get_tier_list().await?;
        if list.total_pokemon() == 0 {
            return Ok(None);
        }

        let declared = list.declared_regulation();
        let matches = declared
            .as_deref()
            .map(|d| format.label().contains(d))
            .unwrap_or(false);
        let range = list.data_range.clone();

        let mut entries = Vec::new();
        for tier in &list.tiers {
            for mon in &tier.pokemon {
                let urls = self.pokedex.sprite_urls_for(&mon.name).await;
                entries.push(SourceEntry {
                    key: canonical_id(&mon.name),
                    display: mon.name.clone(),
                    canonical: canonical_display_name(&mon.name),
                    usage_percent: mon.tournament_usage.unwrap_or(0.0),
                    count: 0,
                    win_rate: mon.win_rate,
                    // It reports a rate but not how many games back it, so it
                    // earns no shrinkage credit of its own; the merge still
                    // weights it by the source overall sample size.
                    games: 0,
                    top_cut_rate: None,
                    top_items: named_percents(&mon.items),
                    top_moves: named_percents(&mon.moves),
                    top_abilities: named_percents(&mon.usage_abilities),
                    top_tera: Vec::new(),
                    top_natures: Vec::new(),
                    top_teammates: Vec::new(),
                    common_movesets: Vec::new(),
                    sprite_url: urls.0,
                    sprite_fallback_url: urls.1,
                    home_sprite_url: urls.2,
                });
            }
        }

        let provenance = SourceProvenance {
            source: SourceId::Champteams,
            declared_regulation: declared,
            matches_active_format: matches,
            teams: range.as_ref().map(|r| r.team_count).unwrap_or(0),
            tournaments: range.as_ref().map(|r| r.tournament_count).unwrap_or(0),
            from_date: range.as_ref().and_then(|r| r.earliest.clone()),
            to_date: range.as_ref().and_then(|r| r.latest.clone()),
            weight: 0.0,
        };
        Ok(Some(SourceSnapshot {
            provenance,
            entries,
            top_items: Vec::new(),
            top_moves: Vec::new(),
            top_abilities: Vec::new(),
            top_tera: Vec::new(),
        }))
    }

    /// Smogon: ladder data, not tournament data. Lowest trust of the four.
    async fn smogon_source(&self, format: Format) -> Result<Option<SourceSnapshot>, AppError> {
        let Some((slug, chaos)) = self
            .smogon
            .fetch_chaos_for_format(format, &self.settings)
            .await?
        else {
            return Ok(None);
        };
        let sprites = self.resolve_smogon_sprites(&chaos).await;
        // ChaosStats carries no battle count, so the species count stands in
        // as the sample size. It only feeds the log-damped weight, where the
        // exact magnitude barely moves the result.
        let sample = chaos.data.len() as u32;
        let snap = snapshot_from_smogon(format, chaos, &slug, &sprites);
        if snap.pokemon.is_empty() {
            return Ok(None);
        }

        let provenance = SourceProvenance {
            source: SourceId::Smogon,
            declared_regulation: Some(slug),
            // The slug encodes the regulation, so a hit is by construction the
            // right one and a miss returns None above rather than wrong data.
            matches_active_format: true,
            teams: sample,
            tournaments: 0,
            from_date: None,
            to_date: None,
            weight: 0.0,
        };
        Ok(Some(aggregation::from_meta_snapshot(
            snap,
            provenance,
            &HashMap::new(),
        )))
    }
}

/// Per-species win/loss tally from the labmaus team records.
///
/// A team contributes its record to every species on it: the record belongs to
/// the team, and attributing it to each member is the standard way usage stats
/// turn team results into per-species rates.
pub(crate) fn tally_records(
    teams: &[LabmausDiscoverTeam],
    resolved: &[Vec<ShowdownEntry>],
) -> HashMap<String, RecordTally> {
    let mut out: HashMap<String, RecordTally> = HashMap::new();
    for (idx, team) in teams.iter().enumerate() {
        let Some(entries) = resolved.get(idx) else {
            continue;
        };
        // One species can appear twice on a paste through form variants; the
        // record must still count once for it.
        let mut seen: HashSet<String> = HashSet::new();
        for entry in entries {
            let key = canonical_id(&entry.species);
            if key.is_empty() || !seen.insert(key.clone()) {
                continue;
            }
            out.entry(key)
                .or_default()
                .add_team(team.record.as_deref(), team.placement);
        }
    }
    out
}

/// Map a champteams name/percent list onto the shared usage shape.
fn named_percents(
    src: &[crate::adapters::champteams_client::ChampteamsNamedPercent],
) -> Vec<UsageEntry> {
    src.iter()
        .map(|e| UsageEntry {
            name: e.name.clone(),
            usage_percent: e.percent,
            count: 0,
        })
        .collect()
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
                win_rate: None,
                top_cut_rate: None,
                meta_score: None,
                tier: None,
                sources_covering: 0,
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
        sources: Vec::new(),
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
