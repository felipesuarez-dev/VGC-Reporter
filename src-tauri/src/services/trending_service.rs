use crate::adapters::sprite_resolver::{
    canonical_display_name, fallback_sprite_url, primary_sprite_url,
};
use crate::adapters::{LabmausClient, LabmausDiscoverTeam};
use crate::config;
use crate::domain::format::Format;
use crate::domain::trending::{TrendingPokemon, TrendingReport};
use crate::error::AppError;
use crate::services::usage_aggregator::prettify_public;
use crate::storage::{CacheRepo, SettingsRepo};
use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use tracing::{debug, warn};

const TRENDING_LIMIT: usize = 15;

#[derive(Clone)]
pub struct TrendingService {
    labmaus: LabmausClient,
    cache: Arc<CacheRepo>,
    settings: Arc<SettingsRepo>,
}

impl TrendingService {
    pub fn new(labmaus: LabmausClient, cache: Arc<CacheRepo>, settings: Arc<SettingsRepo>) -> Self {
        Self {
            labmaus,
            cache,
            settings,
        }
    }

    /// Format-scoped trending, computed locally from labmaus `discover_teams`
    /// over two consecutive windows. We cannot use labmaus
    /// `/api/top_trending_pokemon` because it aggregates across every VGC
    /// regulation the site tracks and has no regulation filter — the
    /// results would be polluted by other regulations' data.
    ///
    /// The labmaus regulation name is resolved at call time:
    ///   1. `SettingsRepo.get("labmaus_name::<format.cache_id()>")` override
    ///   2. `format.default_labmaus_name()` static fallback
    ///
    /// An unmapped format returns `TrendingReport::empty()` without touching
    /// the network, so a new regulation can be onboarded by seeding one
    /// settings row before its static default is known.
    pub async fn get_trending(&self, format: Format) -> Result<TrendingReport, AppError> {
        let key = format!("trending::v5::{}", format.cache_id());
        if let Some(bytes) = self.cache.get(&key)? {
            if let Ok(report) = serde_json::from_slice::<TrendingReport>(&bytes) {
                return Ok(report);
            }
        }

        let Some(regulation_name) = self.resolve_labmaus_name(format) else {
            let empty = TrendingReport::empty();
            let bytes = serde_json::to_vec(&empty)?;
            self.cache.put(&key, &bytes, config::TTL_LABMAUS_TRENDING)?;
            return Ok(empty);
        };

        let catalog = match self.labmaus.get_all_vgc_pokemon("en").await {
            Ok(c) => {
                debug!(catalog_size = c.len(), "trending: labmaus catalog fetched");
                c
            }
            Err(e) => {
                warn!(error = %e, "trending: labmaus catalog fetch failed");
                HashMap::new()
            }
        };

        let (report, weighted_total) = self
            .build_report_for(
                &regulation_name,
                &catalog,
                config::LABMAUS_TRENDING_WINDOW_DAYS,
            )
            .await;

        // Widen once if the window is too sparse OR the report came back
        // empty (thin weighted data can also produce a flat report where
        // every score shrinks to zero after bayes + adaptive floor).
        let needs_widen = weighted_total < config::TRENDING_MIN_WINDOW_TEAMS
            || (report.rising.is_empty() && report.falling.is_empty());
        let report = if needs_widen {
            debug!(
                weighted_total,
                rising_len = report.rising.len(),
                falling_len = report.falling.len(),
                "trending: sparse or empty window, retrying at 2× half-window"
            );
            let (wide, _) = self
                .build_report_for(
                    &regulation_name,
                    &catalog,
                    2 * config::LABMAUS_TRENDING_WINDOW_DAYS,
                )
                .await;
            wide
        } else {
            report
        };

        // Only cache non-empty reports so a transient miss doesn't stick
        // for the full TTL.
        if !report.rising.is_empty() || !report.falling.is_empty() {
            let bytes = serde_json::to_vec(&report)?;
            self.cache.put(&key, &bytes, config::TTL_LABMAUS_TRENDING)?;
        }
        Ok(report)
    }

    fn resolve_labmaus_name(&self, format: Format) -> Option<String> {
        let override_key = format!("labmaus_name::{}", format.cache_id());
        if let Ok(Some(v)) = self.settings.get(&override_key) {
            if !v.trim().is_empty() {
                return Some(v);
            }
        }
        format.default_labmaus_name().map(|s| s.to_string())
    }

    /// Fetches a single `2 × half_window_days` slice of labmaus teams (same
    /// URL/params as `TopTeamsService::build_from_labmaus` when the
    /// regulation is M-A, so the HTTP cache entry is shared) plus the
    /// matching completed_tournaments window, then buckets each team into
    /// prev/curr by its tournament's real date.
    async fn build_report_for(
        &self,
        regulation: &str,
        catalog: &HashMap<String, String>,
        half_window_days: i64,
    ) -> (TrendingReport, f32) {
        let today = chrono::Utc::now().date_naive();
        let total_days = 2 * half_window_days;
        let from_date = today - chrono::Duration::days(total_days);
        let midpoint = today - chrono::Duration::days(half_window_days);
        let from = from_date.format("%Y-%m-%d").to_string();
        let to = today.format("%Y-%m-%d").to_string();
        let mid_str = midpoint.format("%Y-%m-%d").to_string();

        let teams = match self
            .labmaus
            .get_discover_teams(&from, &to, regulation)
            .await
        {
            Ok(v) => {
                debug!(
                    regulation,
                    from = %from,
                    to = %to,
                    len = v.len(),
                    "trending: discover_teams fetched"
                );
                v
            }
            Err(e) => {
                warn!(error = %e, regulation, "trending: discover_teams failed");
                Vec::new()
            }
        };

        let tournaments = match self.labmaus.get_completed_tournaments(&from, &to).await {
            Ok(v) => v,
            Err(e) => {
                warn!(error = %e, "trending: completed_tournaments failed");
                Vec::new()
            }
        };

        // Match by tournament name instead of id: labmaus serialises ids
        // inconsistently across endpoints (Number in discover_teams vs
        // String/other in completed_tournaments), but the human name is
        // stable — same pattern that TopTeamsService uses to count
        // distinct tournaments.
        let date_by_name: HashMap<String, chrono::NaiveDate> = tournaments
            .iter()
            .filter_map(|t| {
                let date = chrono::NaiveDate::parse_from_str(&t.date, "%Y-%m-%d").ok()?;
                Some((t.name.clone(), date))
            })
            .collect();

        let mut prev: Vec<LabmausDiscoverTeam> = Vec::new();
        let mut curr: Vec<LabmausDiscoverTeam> = Vec::new();
        let mut dropped = 0usize;
        for team in teams {
            let date_opt = team
                .tournament_name
                .as_deref()
                .and_then(|n| date_by_name.get(n));
            let Some(&date) = date_opt else {
                dropped += 1;
                continue;
            };
            if date >= midpoint {
                curr.push(team);
            } else {
                prev.push(team);
            }
        }

        let prev_total: f32 = prev.iter().map(team_weight).sum();
        let curr_total: f32 = curr.iter().map(team_weight).sum();
        let report = build_trending_report(&prev, &curr, &mid_str, &to, catalog);
        debug!(
            regulation,
            half_window_days,
            tournaments_len = tournaments.len(),
            prev_len = prev.len(),
            curr_len = curr.len(),
            dropped,
            prev_total,
            curr_total,
            rising_len = report.rising.len(),
            falling_len = report.falling.len(),
            "trending: report built"
        );
        (report, prev_total + curr_total)
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

    // Fast exit: if either window has zero weighted activity we can't compute
    // meaningful deltas (logarithm would divide by zero surrogate). Return
    // empty so the caller can try a wider window or surface empty state.
    if prev_stats.total <= 0.0 && curr_stats.total <= 0.0 {
        return TrendingReport {
            rising: Vec::new(),
            falling: Vec::new(),
            from_date: Some(curr_from.to_string()),
            to_date: Some(curr_to.to_string()),
        };
    }

    let mut ids: HashSet<&str> = HashSet::new();
    for id in prev_stats.counts.keys() {
        ids.insert(id.as_str());
    }
    for id in curr_stats.counts.keys() {
        ids.insert(id.as_str());
    }

    let min_sample = adaptive_min_sample(prev_stats.total.max(curr_stats.total));

    let mut entries: Vec<TrendingEntry> = ids
        .into_iter()
        .map(|id| {
            let (p_weight, p_display) = prev_stats
                .counts
                .get(id)
                .map(|(w, d)| (*w, d.as_str()))
                .unwrap_or((0.0, ""));
            let (c_weight, c_display) = curr_stats
                .counts
                .get(id)
                .map(|(w, d)| (*w, d.as_str()))
                .unwrap_or((0.0, ""));
            let display = if !c_display.is_empty() {
                c_display
            } else {
                p_display
            };

            let u_prev = bayes_rate(p_weight, prev_stats.total);
            let u_curr = bayes_rate(c_weight, curr_stats.total);
            let pp_delta = (u_curr - u_prev) * 100.0;
            let log_ratio =
                ((u_curr + config::TRENDING_EPSILON) / (u_prev + config::TRENDING_EPSILON)).ln();
            let u_baseline = u_prev.max(u_curr) * 100.0;
            let score = pp_delta + config::TRENDING_BETA_LOG * log_ratio * u_baseline;

            TrendingEntry {
                display: display.to_string(),
                prev_pct: u_prev * 100.0,
                curr_pct: u_curr * 100.0,
                score,
                max_weight: p_weight.max(c_weight),
            }
        })
        .filter(|e| e.max_weight >= min_sample)
        .collect();

    let mut rising = entries.clone();
    rising.sort_by(|a, b| {
        b.score
            .partial_cmp(&a.score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    let rising: Vec<TrendingPokemon> = rising
        .into_iter()
        .filter(|e| e.score > 0.0)
        .filter_map(to_domain)
        .take(TRENDING_LIMIT)
        .collect();

    entries.sort_by(|a, b| {
        a.score
            .partial_cmp(&b.score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    let falling: Vec<TrendingPokemon> = entries
        .into_iter()
        .filter(|e| e.score < 0.0)
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

fn bayes_rate(weight: f32, total: f32) -> f32 {
    if total <= 0.0 {
        return 0.0;
    }
    // Standard shrinkage toward a fixed prior rate, in units of pseudo-
    // observations at the prior. Keeps a species with 1 out of 10 teams from
    // looking identical to a species with 1 out of 100.
    let k = config::TRENDING_BAYES_K;
    let mu = config::TRENDING_PRIOR_RATE;
    (weight + k * mu) / (total + k)
}

fn adaptive_min_sample(max_total: f32) -> f32 {
    let fractional = max_total * config::TRENDING_SAMPLE_FRACTION;
    fractional.max(config::TRENDING_MIN_SAMPLE_FLOOR as f32)
}

fn team_weight(team: &LabmausDiscoverTeam) -> f32 {
    match team.placement {
        Some(p) if p <= config::TRENDING_PLACEMENT_TOPCUT => config::TRENDING_WEIGHT_TOPCUT,
        Some(p) if p <= config::TRENDING_PLACEMENT_DAY2 => config::TRENDING_WEIGHT_DAY2,
        _ => config::TRENDING_WEIGHT_DEFAULT,
    }
}

#[derive(Clone)]
struct TrendingEntry {
    display: String,
    prev_pct: f32,
    curr_pct: f32,
    score: f32,
    max_weight: f32,
}

struct WindowStats {
    /// labmaus id → (weighted count across teams, display name picked from the team).
    counts: HashMap<String, (f32, String)>,
    /// Sum of team weights in this window.
    total: f32,
}

fn aggregate(teams: &[LabmausDiscoverTeam], catalog: &HashMap<String, String>) -> WindowStats {
    let mut counts: HashMap<String, (f32, String)> = HashMap::new();
    let mut total = 0.0;
    for team in teams {
        let weight = team_weight(team);
        total += weight;
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
                .or_insert_with(|| (0.0, display.to_string()));
            entry.0 += weight;
            if entry.1.is_empty() && !display.is_empty() {
                entry.1 = display.to_string();
            }
        }
    }
    WindowStats { counts, total }
}

fn to_domain(e: TrendingEntry) -> Option<TrendingPokemon> {
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
        change_percentage: e.score,
        day1_percentage: e.prev_pct,
        day2_percentage: e.curr_pct,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn team(ids: &[&str], names: &[&str]) -> LabmausDiscoverTeam {
        team_with_placement(ids, names, None)
    }

    fn team_with_placement(
        ids: &[&str],
        names: &[&str],
        placement: Option<u32>,
    ) -> LabmausDiscoverTeam {
        LabmausDiscoverTeam {
            country: None,
            division: None,
            placement,
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
    fn rising_and_falling_have_correct_sign() {
        // Zamazenta: 20% → 80% (clear rise).
        // Incineroar: 50% → 20% (clear fall).
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
        assert!(
            report.falling.iter().any(|t| t.species == "Incineroar"),
            "Incineroar should be in falling"
        );
        for f in &report.falling {
            assert!(f.change_percentage < 0.0);
        }
    }

    #[test]
    fn placement_weighting_outranks_equal_raw_count() {
        // Both species appear in 5 curr teams (zero prev) so raw counts match.
        // Species A appears only in top-cut teams (weight 3 each = 15 total).
        // Species B appears only in non-cut teams (weight 1 each = 5 total).
        // A must rank above B in rising.
        let prev: Vec<LabmausDiscoverTeam> = (0..50)
            .map(|i| team_with_placement(&["999"], &["Filler"], Some(100 + i)))
            .collect();
        let mut curr: Vec<LabmausDiscoverTeam> = prev.clone();
        for i in 0..5 {
            curr.push(team_with_placement(&["001"], &["Bulbasaur"], Some(i + 1)));
        }
        for i in 0..5 {
            curr.push(team_with_placement(&["002"], &["Ivysaur"], Some(200 + i)));
        }
        let empty = HashMap::new();
        let report = build_trending_report(&prev, &curr, "a", "b", &empty);
        let bulba_pos = report.rising.iter().position(|t| t.species == "Bulbasaur");
        let ivy_pos = report.rising.iter().position(|t| t.species == "Ivysaur");
        assert!(bulba_pos.is_some(), "Bulbasaur should be in rising");
        assert!(ivy_pos.is_some(), "Ivysaur should be in rising");
        assert!(
            bulba_pos.unwrap() < ivy_pos.unwrap(),
            "top-cut Bulbasaur should rank above non-cut Ivysaur"
        );
    }

    #[test]
    fn log_ratio_surfaces_tail_mover() {
        // A mon going 1% → 5% is a clear rising signal — with only pp delta
        // (+4pp) it would lose to a head mover going 30% → 40% (+10pp), but
        // momentum should at least include the tail mover in rising.
        let mut prev = vec![];
        for _ in 0..1 {
            prev.push(team(&["002"], &["Ivysaur"]));
        }
        for i in 0..99 {
            prev.push(team_with_placement(
                &[Box::leak(format!("f{}", i).into_boxed_str())],
                &[Box::leak(format!("Filler{}", i).into_boxed_str())],
                None,
            ));
        }
        let mut curr = vec![];
        for _ in 0..5 {
            curr.push(team(&["002"], &["Ivysaur"]));
        }
        for i in 0..95 {
            curr.push(team_with_placement(
                &[Box::leak(format!("f{}", i).into_boxed_str())],
                &[Box::leak(format!("Filler{}", i).into_boxed_str())],
                None,
            ));
        }
        let empty = HashMap::new();
        let report = build_trending_report(&prev, &curr, "a", "b", &empty);
        assert!(
            report.rising.iter().any(|t| t.species == "Ivysaur"),
            "1%→5% tail mover should make it into rising"
        );
    }

    #[test]
    fn adaptive_min_sample_scales_with_window() {
        // 200-team window: floor = max(2, 0.01 * 200) = max(2, 2) = 2.
        assert_eq!(adaptive_min_sample(200.0), 2.0);
        // 10000-team window: floor = max(2, 0.01 * 10000) = 100.
        assert_eq!(adaptive_min_sample(10_000.0), 100.0);
        // Tiny window: floor bottoms at 2.
        assert_eq!(adaptive_min_sample(50.0), 2.0);
    }

    #[test]
    fn duplicate_member_in_same_team_counts_once() {
        // Defensive against noisy input: a team that lists the same mon twice
        // should contribute one weight to that mon, not two.
        let prev = vec![team(&["889", "889"], &["Zamazenta", "Zamazenta"])];
        let empty = HashMap::new();
        let stats = aggregate(&prev, &empty);
        let w = stats.counts.get("889").map(|(w, _)| *w).unwrap_or(0.0);
        assert!((w - config::TRENDING_WEIGHT_DEFAULT).abs() < 1e-6);
    }

    #[test]
    fn hyphenated_form_keeps_sprite_slug() {
        // Calyrex-Shadow falls to half presence: ensure the sprite slug
        // survives the canonicalization + prettify round-trip.
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
