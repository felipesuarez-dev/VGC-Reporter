use crate::adapters::sprite_resolver::{
    canonical_display_name, fallback_sprite_url, primary_sprite_url,
};
use crate::adapters::{LabmausClient, LabmausDiscoverTeam};
use crate::config;
use crate::domain::trending::{TrendingPokemon, TrendingReport};
use crate::error::AppError;
use crate::services::date_window::prev_and_current_windows;
use crate::services::usage_aggregator::prettify_public;
use crate::storage::CacheRepo;
use std::collections::{HashMap, HashSet};
use std::sync::Arc;

const TRENDING_LIMIT: usize = 15;

#[derive(Clone)]
pub struct TrendingService {
    labmaus: LabmausClient,
    cache: Arc<CacheRepo>,
}

impl TrendingService {
    pub fn new(labmaus: LabmausClient, cache: Arc<CacheRepo>) -> Self {
        Self { labmaus, cache }
    }

    /// Regulation M-A trending, computed locally from labmaus `discover_teams`
    /// over two consecutive 7-day windows. We cannot use labmaus
    /// `/api/top_trending_pokemon` because it aggregates across every VGC
    /// regulation the site tracks and has no regulation filter, so the
    /// results are polluted by S/V Reg I / G / F data.
    pub async fn get_trending(&self) -> Result<TrendingReport, AppError> {
        let key = "trending::v3::regulation-m-a";
        if let Some(bytes) = self.cache.get(key)? {
            if let Ok(report) = serde_json::from_slice::<TrendingReport>(&bytes) {
                return Ok(report);
            }
        }

        let ((prev_from, prev_to), (curr_from, curr_to)) =
            prev_and_current_windows(config::LABMAUS_TRENDING_WINDOW_DAYS);

        let prev = self
            .labmaus
            .get_discover_teams(&prev_from, &prev_to, config::REGULATION_MA_LABMAUS)
            .await
            .unwrap_or_default();
        let curr = self
            .labmaus
            .get_discover_teams(&curr_from, &curr_to, config::REGULATION_MA_LABMAUS)
            .await
            .unwrap_or_default();

        // `discover_teams` sometimes returns an empty `pokemon_names` array,
        // so we pre-fetch labmaus's id→name catalog as a deterministic
        // fallback. Unwrap-or-default because trending must never hard-fail.
        let catalog = self
            .labmaus
            .get_all_vgc_pokemon("en")
            .await
            .unwrap_or_default();

        let report = build_trending_report(&prev, &curr, &curr_from, &curr_to, &catalog);

        let bytes = serde_json::to_vec(&report)?;
        self.cache.put(key, &bytes, config::TTL_LABMAUS_TRENDING)?;
        Ok(report)
    }
}

fn build_trending_report(
    prev: &[LabmausDiscoverTeam],
    curr: &[LabmausDiscoverTeam],
    curr_from: &str,
    curr_to: &str,
    catalog: &HashMap<String, String>,
) -> TrendingReport {
    let prev_stats = aggregate(prev, catalog);
    let curr_stats = aggregate(curr, catalog);

    // Union of every Pokemon id seen in either window.
    let mut ids: HashSet<&str> = HashSet::new();
    for id in prev_stats.counts.keys() {
        ids.insert(id.as_str());
    }
    for id in curr_stats.counts.keys() {
        ids.insert(id.as_str());
    }

    let mut deltas: Vec<TrendingEntry> = ids
        .into_iter()
        .map(|id| {
            let (p_count, p_display) = prev_stats
                .counts
                .get(id)
                .map(|(c, d)| (*c, d.as_str()))
                .unwrap_or((0, ""));
            let (c_count, c_display) = curr_stats
                .counts
                .get(id)
                .map(|(c, d)| (*c, d.as_str()))
                .unwrap_or((0, ""));
            let display = if !c_display.is_empty() {
                c_display
            } else {
                p_display
            };
            let prev_pct = pct(p_count, prev_stats.total);
            let curr_pct = pct(c_count, curr_stats.total);
            TrendingEntry {
                display: display.to_string(),
                prev_pct,
                curr_pct,
                change: curr_pct - prev_pct,
                max_count: p_count.max(c_count),
            }
        })
        .filter(|e| e.max_count >= config::TRENDING_MIN_SAMPLE)
        .collect();

    // Rising: biggest positive change, falling: biggest negative change.
    let mut rising = deltas.clone();
    rising.sort_by(|a, b| {
        b.change
            .partial_cmp(&a.change)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    let rising: Vec<TrendingPokemon> = rising
        .into_iter()
        .filter(|e| e.change > 0.0)
        .filter_map(to_domain)
        .take(TRENDING_LIMIT)
        .collect();

    deltas.sort_by(|a, b| {
        a.change
            .partial_cmp(&b.change)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    let falling: Vec<TrendingPokemon> = deltas
        .into_iter()
        .filter(|e| e.change < 0.0)
        .filter_map(to_domain)
        .take(TRENDING_LIMIT)
        .collect();

    TrendingReport {
        rising,
        falling,
        from_date: Some(curr_from.to_string()),
        to_date: Some(curr_to.to_string()),
    }
}

#[derive(Clone)]
struct TrendingEntry {
    display: String,
    prev_pct: f32,
    curr_pct: f32,
    change: f32,
    max_count: u32,
}

struct WindowStats {
    /// labmaus id → (unique-team count, display name picked from the team).
    counts: HashMap<String, (u32, String)>,
    /// Number of teams in this window.
    total: u32,
}

fn aggregate(teams: &[LabmausDiscoverTeam], catalog: &HashMap<String, String>) -> WindowStats {
    let mut counts: HashMap<String, (u32, String)> = HashMap::new();
    for team in teams {
        let mut seen: HashSet<&str> = HashSet::new();
        for (i, raw_id) in team.team.iter().enumerate() {
            let id = raw_id.trim();
            if id.is_empty() || !seen.insert(id) {
                continue;
            }
            let inline = team.pokemon_names.get(i).map(|s| s.trim()).unwrap_or("");
            let display = if inline.is_empty() {
                catalog.get(id).map(String::as_str).unwrap_or("")
            } else {
                inline
            };
            let entry = counts
                .entry(id.to_string())
                .or_insert_with(|| (0, display.to_string()));
            entry.0 += 1;
            if entry.1.is_empty() && !display.is_empty() {
                entry.1 = display.to_string();
            }
        }
    }
    WindowStats {
        counts,
        total: teams.len() as u32,
    }
}

fn pct(count: u32, total: u32) -> f32 {
    if total == 0 {
        0.0
    } else {
        (count as f32 * 100.0) / total as f32
    }
}

fn to_domain(e: TrendingEntry) -> Option<TrendingPokemon> {
    // Require a resolved display name; without one we'd emit numeric
    // dex ids as species and broken sprite URLs.
    if e.display.is_empty() {
        return None;
    }
    let canonical = canonical_display_name(&e.display);
    if canonical.is_empty() {
        return None;
    }
    Some(TrendingPokemon {
        species: prettify_public(&canonical),
        sprite_url: primary_sprite_url(&canonical),
        sprite_fallback_url: fallback_sprite_url(&canonical),
        home_sprite_url: None,
        change_percentage: e.change,
        day1_percentage: e.prev_pct,
        day2_percentage: e.curr_pct,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn team(ids: &[&str], names: &[&str]) -> LabmausDiscoverTeam {
        LabmausDiscoverTeam {
            country: None,
            division: None,
            placement: None,
            player: "p".into(),
            record: None,
            team: ids.iter().map(|s| s.to_string()).collect(),
            pokemon_names: names.iter().map(|s| s.to_string()).collect(),
            team_url: "https://pokepast.es/x".into(),
            tournament_id: None,
            tournament_name: None,
        }
    }

    #[test]
    fn rising_is_sorted_by_positive_delta_desc() {
        // Prev window: 10 teams, Zamazenta in 2 (20%), Incineroar in 5 (50%).
        let mut prev = vec![];
        for _ in 0..2 {
            prev.push(team(&["889"], &["Zamazenta"]));
        }
        for _ in 0..5 {
            prev.push(team(&["727"], &["Incineroar"]));
        }
        for _ in 0..3 {
            prev.push(team(&["145"], &["Zapdos"]));
        }
        // Curr window: 10 teams, Zamazenta in 8 (80%), Incineroar in 3 (30%).
        let mut curr = vec![];
        for _ in 0..8 {
            curr.push(team(&["889"], &["Zamazenta"]));
        }
        for _ in 0..2 {
            curr.push(team(&["727"], &["Incineroar"]));
        }
        let empty = HashMap::new();
        let report = build_trending_report(&prev, &curr, "2026-04-10", "2026-04-17", &empty);
        assert_eq!(report.rising[0].species, "Zamazenta");
        assert!(report.rising[0].change_percentage > 0.0);
        assert_eq!(report.falling[0].species, "Incineroar");
        assert!(report.falling[0].change_percentage < 0.0);
    }

    #[test]
    fn drops_entries_below_min_sample() {
        let prev: Vec<LabmausDiscoverTeam> =
            (0..1).map(|_| team(&["001"], &["Bulbasaur"])).collect();
        let curr: Vec<LabmausDiscoverTeam> =
            (0..1).map(|_| team(&["001"], &["Bulbasaur"])).collect();
        let empty = HashMap::new();
        let report = build_trending_report(&prev, &curr, "a", "b", &empty);
        assert!(report.rising.is_empty());
        assert!(report.falling.is_empty());
    }

    #[test]
    fn duplicate_member_in_same_team_counts_once() {
        // Hypothetical — defensive against noisy input.
        let prev = vec![team(&["889", "889"], &["Zamazenta", "Zamazenta"])];
        let empty = HashMap::new();
        let stats = aggregate(&prev, &empty);
        assert_eq!(stats.counts.get("889").map(|(c, _)| *c), Some(1));
    }

    #[test]
    fn hyphenated_form_keeps_sprite_slug() {
        // Calyrex-Shadow: prev 10/10 (100%), curr 5/10 (50%) → falling.
        let mut prev = vec![];
        for _ in 0..10 {
            prev.push(team(&["898-s"], &["Calyrex-Shadow"]));
        }
        let mut curr = vec![];
        for _ in 0..5 {
            curr.push(team(&["898-s"], &["Calyrex-Shadow"]));
        }
        for _ in 0..5 {
            curr.push(team(&["727"], &["Incineroar"]));
        }
        let empty = HashMap::new();
        let report = build_trending_report(&prev, &curr, "a", "b", &empty);
        let calyrex = report
            .falling
            .iter()
            .find(|t| t.species.contains("Calyrex"))
            .expect("calyrex should be in falling");
        assert!(calyrex.sprite_url.ends_with("/calyrex-shadow.png"));
    }

    #[test]
    fn catalog_resolves_missing_pokemon_names() {
        // Live discover_teams often omits pokemon_names. Catalog fallback
        // must recover the display name so we can render real sprites.
        let mut prev = vec![];
        for _ in 0..10 {
            prev.push(team(&["727"], &[]));
        }
        let mut curr = vec![];
        for _ in 0..2 {
            curr.push(team(&["727"], &[]));
        }
        for _ in 0..8 {
            curr.push(team(&["889"], &[]));
        }
        let mut catalog = HashMap::new();
        catalog.insert("727".to_string(), "Incineroar".to_string());
        catalog.insert("889".to_string(), "Zamazenta".to_string());
        let report = build_trending_report(&prev, &curr, "a", "b", &catalog);
        let incineroar = report
            .falling
            .iter()
            .find(|t| t.species == "Incineroar")
            .expect("incineroar should be in falling");
        assert!(incineroar.sprite_url.ends_with("/incineroar.png"));
    }

    #[test]
    fn catalog_miss_drops_entry() {
        // id with no pokemon_names and not in catalog → silently dropped,
        // never leaks a numeric species into the report.
        let prev: Vec<LabmausDiscoverTeam> = (0..10).map(|_| team(&["9999"], &[])).collect();
        let curr: Vec<LabmausDiscoverTeam> = (0..20).map(|_| team(&["9999"], &[])).collect();
        let empty = HashMap::new();
        let report = build_trending_report(&prev, &curr, "a", "b", &empty);
        assert!(report.rising.is_empty());
        assert!(report.falling.is_empty());
    }
}
