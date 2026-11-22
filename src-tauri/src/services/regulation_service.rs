//! Builds the dynamic regulation catalog from the official calendar and live
//! tournament sources. The catalog is published into `domain::regulation` so
//! `Format` and the rule registry can read it without extra plumbing.

use crate::adapters::{LabmausClient, OfficialRegulationClient, OfficialStreamClient};
use crate::config;
use crate::domain::regulation::{
    self, LiveStreamScreen, OfficialLiveStream, RegulationConfidence, RegulationInfo,
    RegulationNewsItem, RegulationOrigin, RegulationSnapshot, RegulationSourceState,
    RegulationStatus, RegulationSyncStatus, RegulationWarning, SeasonInfo,
};
use crate::domain::source_stats::SourceId;
use crate::error::AppError;
use crate::services::regulations::{
    rules_for_code, RegMaRules, RegMbRules, RegMcRules, RegulationRules,
};
use chrono::{DateTime, Datelike, Duration, NaiveDate, Utc};
use std::sync::RwLock;

#[derive(Clone)]
pub struct RegulationService {
    official: OfficialRegulationClient,
    stream: OfficialStreamClient,
    labmaus: LabmausClient,
    last_sync: std::sync::Arc<RwLock<Option<DateTime<Utc>>>>,
}

impl RegulationService {
    pub fn new(
        official: OfficialRegulationClient,
        stream: OfficialStreamClient,
        labmaus: LabmausClient,
    ) -> Self {
        // Publish the bundled archive immediately. Commands that do not go
        // through `get_regulations` (allowed lists, validate_team) still see a
        // usable catalog while the first network refresh happens.
        regulation::publish(static_snapshots());
        Self {
            official,
            stream,
            labmaus,
            last_sync: std::sync::Arc::new(RwLock::new(None)),
        }
    }

    /// Refresh the catalog. The static M-A/M-B/M-C snapshots are always
    /// published, even when both upstreams are down.
    pub async fn ensure_fresh(&self, force: bool) -> Result<(), AppError> {
        if !force {
            if let Ok(guard) = self.last_sync.read() {
                if let Some(last) = *guard {
                    if (Utc::now() - last).num_seconds() < config::TTL_REGULATION_CATALOG {
                        return Ok(());
                    }
                }
            }
        }

        let mut snapshots = static_snapshots();

        match self.official.discover(force).await {
            Ok((Some(reg), season)) => {
                let roster = match self.official.roster(&reg.roster_url, force).await {
                    Ok(names) => Some(names),
                    Err(e) => {
                        tracing::warn!(error = %e, "official roster fetch failed");
                        None
                    }
                };
                apply_official(&mut snapshots, &reg, season.as_ref(), roster.as_deref());
            }
            Ok((None, _)) => tracing::warn!("official regulation index returned no entries"),
            Err(e) => tracing::warn!(error = %e, "official regulation discovery failed"),
        }

        // Only probe tournament labels when the official calendar has no
        // active regulation. While an official set is running there is no
        // decision to make, and the extra labmaus call would delay startup.
        let has_active = snapshots
            .iter()
            .any(|s| regulation::status_at(&s.info, Utc::now()) == RegulationStatus::Active);
        if !has_active {
            match self.detect_sources(&snapshots).await {
                Ok(extra) => snapshots.extend(extra),
                Err(e) => tracing::warn!(error = %e, "source-based regulation detection failed"),
            }
        }

        regulation::publish(snapshots);
        if let Ok(mut guard) = self.last_sync.write() {
            *guard = Some(Utc::now());
        }
        Ok(())
    }

    pub fn infos(&self) -> Vec<RegulationInfo> {
        if regulation::snapshots().is_empty() {
            regulation::publish(static_snapshots());
        }
        let now = Utc::now();
        let mut out: Vec<RegulationInfo> = regulation::snapshots()
            .into_iter()
            .map(|s| s.info)
            .collect();
        for info in &mut out {
            info.status = regulation::status_at(info, now);
            regulation::annotate_seasons(info, now);
        }
        out.sort_by(|a, b| a.start_at.cmp(&b.start_at));
        out
    }

    pub fn active_id(&self) -> Option<String> {
        let infos = self.infos();
        regulation::preferred_active(&infos).map(|info| info.id.clone())
    }

    pub fn status(&self) -> RegulationSyncStatus {
        let infos = self.infos();
        let active_id = self.active_id();
        let active = active_id
            .as_deref()
            .and_then(|id| infos.iter().find(|i| i.id == id));
        let last = self
            .last_sync
            .read()
            .ok()
            .and_then(|g| *g)
            .map(|d| d.to_rfc3339());
        RegulationSyncStatus {
            active_id,
            last_sync: last,
            calendar_pending: !infos.iter().any(|i| i.status == RegulationStatus::Active),
            origin: active.map(|i| i.origin),
            confidence: active.map(|i| i.confidence),
            official_roster: active
                .map(|i| i.origin == RegulationOrigin::Official)
                .unwrap_or(false),
            sources: active.map(|i| i.sources.clone()).unwrap_or_default(),
            warnings: active.map(|i| i.warnings.clone()).unwrap_or_default(),
        }
    }

    pub fn rules_for(&self, code: &str) -> Option<Box<dyn RegulationRules>> {
        rules_for_code(code)
    }

    /// Official news feed, shared by the Dashboard regulation view.
    pub async fn news(&self, force: bool) -> Result<Vec<RegulationNewsItem>, AppError> {
        self.official.news(force).await
    }

    /// Official Play! Pokémon live broadcast, if there is one. `source` is the
    /// optional user override (channel URL, @handle or video URL).
    pub async fn live_stream(
        &self,
        force: bool,
        source: Option<&str>,
    ) -> Result<Option<OfficialLiveStream>, AppError> {
        self.stream.live(force, source).await
    }

    /// Resolve every configured screen. A failing screen stays visible as
    /// offline instead of hiding the whole panel.
    pub async fn live_screens(&self, force: bool, sources: Vec<String>) -> Vec<LiveStreamScreen> {
        let tasks = sources.into_iter().map(|source| {
            let client = self.stream.clone();
            async move {
                let official = is_official_source(&source);
                let label = stream_label(&source);
                let resolved = tokio::time::timeout(
                    std::time::Duration::from_secs(8),
                    client.live_with_filter(force, Some(&source), official),
                )
                .await;
                match resolved {
                    Ok(Ok(Some(stream))) => LiveStreamScreen {
                        source_url: source,
                        label,
                        official,
                        live: true,
                        video_id: Some(stream.video_id),
                        title: Some(stream.title),
                        url: Some(stream.url),
                        embed_url: Some(stream.embed_url),
                        thumbnail_url: Some(stream.thumbnail_url),
                        recent: None,
                    },
                    Ok(Ok(None)) => {
                        let recent = client
                            .recent(force, Some(&source), official)
                            .await
                            .ok()
                            .flatten();
                        offline_screen(source, label, official, recent)
                    }
                    Ok(Err(error)) => {
                        tracing::warn!(%error, source, "live screen unavailable");
                        offline_screen(source, label, official, None)
                    }
                    Err(_) => {
                        tracing::warn!(source, "live screen timed out");
                        offline_screen(source, label, official, None)
                    }
                }
            }
        });
        futures::future::join_all(tasks).await
    }

    /// Detect a new regulation from live tournament labels. This is the
    /// fallback that lets M-D appear even if the official page is late: one
    /// source with real decklists is enough to build a source-validated
    /// snapshot. Official data always replaces it when published.
    async fn detect_sources(
        &self,
        current: &[RegulationSnapshot],
    ) -> Result<Vec<RegulationSnapshot>, AppError> {
        let today = Utc::now().date_naive();
        let from = today - Duration::days(30);
        let tournaments = self
            .labmaus
            .get_completed_tournaments(
                &from.format("%Y-%m-%d").to_string(),
                &today.format("%Y-%m-%d").to_string(),
            )
            .await?;

        let mut labels: Vec<(String, NaiveDate)> = Vec::new();
        for t in &tournaments {
            let label = t.regulation.trim();
            if !label.starts_with("Regulation Set M-") {
                continue;
            }
            if let Ok(date) = NaiveDate::parse_from_str(&t.date, "%Y-%m-%d") {
                labels.push((label.to_string(), date));
            }
        }
        let known: Vec<String> = current.iter().map(|s| s.info.code.clone()).collect();
        let mut out = Vec::new();
        let mut seen = std::collections::HashSet::new();
        for (label, first_date) in labels {
            if !seen.insert(label.clone()) {
                continue;
            }
            let code = label
                .trim_start_matches("Regulation Set ")
                .trim()
                .to_string();
            if known.contains(&code) {
                continue;
            }
            let from_teams = today - Duration::days(14);
            let teams = self
                .labmaus
                .get_discover_teams(
                    &from_teams.format("%Y-%m-%d").to_string(),
                    &today.format("%Y-%m-%d").to_string(),
                    &label,
                )
                .await
                .unwrap_or_default();
            if teams.is_empty() {
                continue;
            }
            let mut observed: Vec<String> = teams
                .iter()
                .flat_map(|t| t.pokemon_names.iter().cloned())
                .filter(|s| !s.trim().is_empty())
                .collect();
            observed.sort();
            observed.dedup();
            if observed.is_empty() {
                continue;
            }
            let base = RegMcRules::current();
            let mut species = observed;
            for name in base.allowed_species() {
                if !species.iter().any(|s| s.eq_ignore_ascii_case(&name)) {
                    species.push(name);
                }
            }
            let items = base.allowed_items();
            let moves = base.allowed_moves();
            let megas: Vec<String> = species
                .iter()
                .filter(|s| s.to_ascii_lowercase().contains("mega"))
                .cloned()
                .collect();
            let teams_count = teams.len() as u32;
            let confidence = if teams_count >= 10 {
                RegulationConfidence::Medium
            } else {
                RegulationConfidence::Low
            };
            let start_at = format!("{}T02:00:00Z", first_date.format("%Y-%m-%d"));
            let sources = source_states_for(&code, Some(&label), true);
            let info = RegulationInfo {
                id: format!("regulation-{}", code.to_ascii_lowercase()),
                label: format!("Regulation {code}"),
                code: code.clone(),
                start_at: start_at.clone(),
                end_at: None,
                status: RegulationStatus::Active,
                origin: RegulationOrigin::SourceValidated,
                confidence,
                seasons: Vec::new(),
                active_season: None,
                eligible_count: species.len(),
                new_species: Vec::new(),
                new_megas: Vec::new(),
                new_items: Vec::new(),
                new_moves: Vec::new(),
                sources,
                warnings: vec![RegulationWarning::SourceValidated {
                    source_count: 1,
                    teams: teams_count,
                }],
            };
            out.push(RegulationSnapshot {
                info,
                species,
                items,
                moves,
                megas,
                restricted: Vec::new(),
                max_restricted: 0,
                limitless_code: Some(code.clone()),
                labmaus_name: Some(label.clone()),
                smogon_slug: Some(format!(
                    "gen9championsvgc{}reg{}",
                    first_date.year(),
                    code.to_ascii_lowercase().replace('-', "")
                )),
                data_start: Some(first_date.format("%Y-%m-%d").to_string()),
                data_end: None,
            });
        }
        Ok(out)
    }
}

fn static_snapshots() -> Vec<RegulationSnapshot> {
    let ma = RegMaRules::current();
    let mb = RegMbRules::current();
    let mc = RegMcRules::current();
    let mut out = vec![
        static_snapshot(
            "M-A",
            ma.allowed_species(),
            ma.allowed_items(),
            ma.allowed_moves(),
        ),
        static_snapshot(
            "M-B",
            mb.allowed_species(),
            mb.allowed_items(),
            mb.allowed_moves(),
        ),
        static_snapshot(
            "M-C",
            mc.allowed_species(),
            mc.allowed_items(),
            mc.allowed_moves(),
        ),
    ];
    attach_diffs(&mut out);
    out
}

fn static_snapshot(
    code: &str,
    species: Vec<String>,
    items: Vec<String>,
    moves: Vec<String>,
) -> RegulationSnapshot {
    let (start, end, data_start, data_end, seasons) = static_calendar(code);
    let megas: Vec<String> = species
        .iter()
        .filter(|s| s.to_ascii_lowercase().contains("mega"))
        .cloned()
        .collect();
    let info = RegulationInfo {
        id: format!("regulation-{}", code.to_ascii_lowercase()),
        label: format!("Regulation {code}"),
        code: code.to_string(),
        start_at: start,
        end_at: Some(end),
        status: RegulationStatus::Archived,
        origin: RegulationOrigin::SeedFallback,
        confidence: RegulationConfidence::High,
        seasons,
        active_season: None,
        eligible_count: species.len(),
        new_species: Vec::new(),
        new_megas: Vec::new(),
        new_items: Vec::new(),
        new_moves: Vec::new(),
        sources: source_states_for(code, None, false),
        warnings: Vec::new(),
    };
    RegulationSnapshot {
        info,
        species,
        items,
        moves,
        megas,
        restricted: Vec::new(),
        max_restricted: 0,
        limitless_code: Some(code.to_string()),
        labmaus_name: Some(format!("Regulation Set {code}")),
        smogon_slug: Some(format!(
            "gen9championsvgc2026reg{}",
            code.to_ascii_lowercase().replace('-', "")
        )),
        data_start,
        data_end,
    }
}

fn static_calendar(
    code: &str,
) -> (
    String,
    String,
    Option<String>,
    Option<String>,
    Vec<SeasonInfo>,
) {
    match code {
        "M-A" => (
            "2026-04-08T02:00:00Z".into(),
            "2026-06-17T01:59:00Z".into(),
            Some("2026-06-03".into()),
            Some("2026-06-16".into()),
            vec![
                season("M-1", "2026-04-08T02:00:00Z", "2026-05-13T01:59:00Z"),
                season("M-2", "2026-05-13T02:00:00Z", "2026-06-17T01:59:00Z"),
            ],
        ),
        "M-B" => (
            "2026-06-17T02:00:00Z".into(),
            "2026-09-09T01:59:00Z".into(),
            Some("2026-06-17".into()),
            Some("2026-09-08".into()),
            vec![
                season("M-3", "2026-06-17T02:00:00Z", "2026-07-08T01:59:00Z"),
                season("M-4", "2026-07-08T02:00:00Z", "2026-08-05T01:59:00Z"),
                season("M-5", "2026-08-05T02:00:00Z", "2026-09-09T01:59:00Z"),
            ],
        ),
        _ => (
            "2026-09-09T02:00:00Z".into(),
            "2026-12-02T01:59:00Z".into(),
            Some("2026-09-09".into()),
            Some("2026-12-01".into()),
            vec![
                season("M-6", "2026-09-09T02:00:00Z", "2026-10-07T01:59:00Z"),
                season("M-7", "2026-10-07T02:00:00Z", "2026-11-04T01:59:00Z"),
                season("M-8", "2026-11-04T02:00:00Z", "2026-12-02T01:59:00Z"),
            ],
        ),
    }
}

fn season(name: &str, start: &str, end: &str) -> SeasonInfo {
    SeasonInfo {
        name: name.into(),
        start_at: start.into(),
        end_at: end.into(),
        active: false,
    }
}

fn source_states_for(
    code: &str,
    labmaus: Option<&str>,
    labmaus_verified: bool,
) -> Vec<RegulationSourceState> {
    let mut out = vec![
        RegulationSourceState {
            source: SourceId::Labmaus,
            configured: true,
            verified: labmaus_verified,
            override_active: false,
            detail: labmaus
                .map(str::to_string)
                .or_else(|| Some(format!("Regulation Set {code}"))),
        },
        RegulationSourceState {
            source: SourceId::Limitless,
            configured: true,
            verified: false,
            override_active: false,
            detail: Some(code.to_string()),
        },
        RegulationSourceState {
            source: SourceId::Champteams,
            configured: true,
            verified: false,
            override_active: false,
            detail: Some("declared regulation read from payload".into()),
        },
        RegulationSourceState {
            source: SourceId::Smogon,
            configured: true,
            verified: false,
            override_active: false,
            detail: Some(format!(
                "gen9championsvgc2026reg{}",
                code.to_ascii_lowercase().replace('-', "")
            )),
        },
    ];
    for s in &mut out {
        if s.detail.as_deref() == Some("") {
            s.detail = None;
        }
    }
    out
}

fn attach_diffs(snapshots: &mut [RegulationSnapshot]) {
    for idx in 1..snapshots.len() {
        let prev_species: std::collections::HashSet<String> = snapshots[idx - 1]
            .species
            .iter()
            .map(|s| crate::services::regulations::common::canonical(s))
            .collect();
        let prev_items: std::collections::HashSet<String> = snapshots[idx - 1]
            .items
            .iter()
            .map(|s| crate::services::regulations::common::canonical(s))
            .collect();
        let prev_moves: std::collections::HashSet<String> = snapshots[idx - 1]
            .moves
            .iter()
            .map(|s| crate::services::regulations::common::canonical(s))
            .collect();
        let prev_megas: std::collections::HashSet<String> = snapshots[idx - 1]
            .megas
            .iter()
            .map(|s| crate::services::regulations::common::canonical(s))
            .collect();
        let new_species = snapshots[idx]
            .species
            .iter()
            .filter(|s| !prev_species.contains(&crate::services::regulations::common::canonical(s)))
            .cloned()
            .collect();
        let new_items = snapshots[idx]
            .items
            .iter()
            .filter(|s| !prev_items.contains(&crate::services::regulations::common::canonical(s)))
            .cloned()
            .collect();
        let new_moves = snapshots[idx]
            .moves
            .iter()
            .filter(|s| !prev_moves.contains(&crate::services::regulations::common::canonical(s)))
            .cloned()
            .collect();
        let new_megas = snapshots[idx]
            .megas
            .iter()
            .filter(|s| !prev_megas.contains(&crate::services::regulations::common::canonical(s)))
            .cloned()
            .collect();
        snapshots[idx].info.new_species = new_species;
        snapshots[idx].info.new_items = new_items;
        snapshots[idx].info.new_moves = new_moves;
        snapshots[idx].info.new_megas = new_megas;
    }
}

fn apply_official(
    snapshots: &mut Vec<RegulationSnapshot>,
    reg: &crate::adapters::official_regulation_client::OfficialRegulation,
    season: Option<&crate::adapters::official_regulation_client::OfficialSeason>,
    roster: Option<&[String]>,
) {
    if let Some(snap) = snapshots.iter_mut().find(|s| s.info.code == reg.code) {
        snap.info.start_at = reg.start_at.to_rfc3339();
        snap.info.end_at = Some(reg.end_at.to_rfc3339());
        snap.info.origin = RegulationOrigin::Official;
        snap.info.confidence = RegulationConfidence::High;
        snap.info.new_megas = reg.new_megas.clone();
        if let Some(names) = roster {
            snap.info.eligible_count = names.len();
        }
        snap.data_start = Some(reg.start_at.date_naive().format("%Y-%m-%d").to_string());
        snap.data_end = Some(
            (reg.end_at.date_naive() - Duration::days(1))
                .format("%Y-%m-%d")
                .to_string(),
        );
        if let Some(season) = season {
            if season
                .regulation_code
                .as_deref()
                .map(|c| c == reg.code)
                .unwrap_or(true)
            {
                let new_season = SeasonInfo {
                    name: season.name.clone(),
                    start_at: season.start_at.to_rfc3339(),
                    end_at: season.end_at.to_rfc3339(),
                    active: false,
                };
                if let Some(existing) = snap
                    .info
                    .seasons
                    .iter_mut()
                    .find(|s| s.name == new_season.name)
                {
                    *existing = new_season;
                } else {
                    snap.info.seasons.push(new_season);
                }
                snap.info
                    .seasons
                    .sort_by(|a, b| a.start_at.cmp(&b.start_at));
            }
        }
        return;
    }

    // A regulation not compiled into the binary. The official roster is the
    // authoritative species list; items/moves/megas inherit from M-C until a
    // newer source has observed them.
    let base = RegMcRules::current();
    let species = roster
        .map(|s| s.to_vec())
        .unwrap_or_else(|| base.allowed_species());
    let mut megas: Vec<String> = species
        .iter()
        .filter(|s| s.to_ascii_lowercase().contains("mega"))
        .cloned()
        .collect();
    for m in &reg.new_megas {
        if !megas.iter().any(|x| x.eq_ignore_ascii_case(m)) {
            megas.push(m.clone());
        }
    }
    let info = RegulationInfo {
        id: format!("regulation-{}", reg.code.to_ascii_lowercase()),
        label: reg.label.clone(),
        code: reg.code.clone(),
        start_at: reg.start_at.to_rfc3339(),
        end_at: Some(reg.end_at.to_rfc3339()),
        status: RegulationStatus::Active,
        origin: RegulationOrigin::Official,
        confidence: RegulationConfidence::High,
        seasons: season
            .filter(|s| {
                s.regulation_code
                    .as_deref()
                    .map(|c| c == reg.code)
                    .unwrap_or(true)
            })
            .map(|s| {
                vec![SeasonInfo {
                    name: s.name.clone(),
                    start_at: s.start_at.to_rfc3339(),
                    end_at: s.end_at.to_rfc3339(),
                    active: false,
                }]
            })
            .unwrap_or_default(),
        active_season: None,
        eligible_count: species.len(),
        new_species: Vec::new(),
        new_megas: reg.new_megas.clone(),
        new_items: Vec::new(),
        new_moves: Vec::new(),
        sources: source_states_for(&reg.code, None, false),
        warnings: Vec::new(),
    };
    snapshots.push(RegulationSnapshot {
        info,
        species,
        items: base.allowed_items(),
        moves: base.allowed_moves(),
        megas,
        restricted: Vec::new(),
        max_restricted: 0,
        limitless_code: Some(reg.code.clone()),
        labmaus_name: Some(format!("Regulation Set {}", reg.code)),
        smogon_slug: Some(format!(
            "gen9championsvgc{}reg{}",
            reg.start_at.year(),
            reg.code.to_ascii_lowercase().replace('-', "")
        )),
        data_start: Some(reg.start_at.date_naive().format("%Y-%m-%d").to_string()),
        data_end: Some(
            (reg.end_at.date_naive() - Duration::days(1))
                .format("%Y-%m-%d")
                .to_string(),
        ),
    });
}

fn is_official_source(url: &str) -> bool {
    let lower = url.to_lowercase();
    lower.contains("playpokemon") || lower.contains("play-pokemon")
}

fn stream_label(url: &str) -> String {
    let lower = url.to_lowercase();
    if lower.contains("playpokemon") {
        return "Play! Pokémon".into();
    }
    if lower.contains("yuksvgc") {
        return "YukS VGC".into();
    }
    if lower.contains("cybertronvgc") {
        return "CybertronVGC".into();
    }
    if lower.contains("wolfeyvgc") {
        return "WolfeyVGC".into();
    }
    if lower.contains("jamesbaek") {
        return "James Baek".into();
    }
    if lower.contains("pokealex") {
        return "PokeAlex".into();
    }
    if lower.contains("moxie2d") {
        return "Moxie2D".into();
    }
    if lower.contains("pokemonchampions") {
        return "Pokémon Champions".into();
    }
    if lower.contains("sekiam") {
        return "Sekiam".into();
    }
    if lower.contains("irnemesis") {
        return "IRNemesis".into();
    }
    if url.contains("tP09BzCEJqU") {
        return "inder".into();
    }
    if let Some(index) = url.find("/@") {
        let handle = url[index + 2..]
            .split(['/', '?', '#'])
            .next()
            .unwrap_or_default();
        if !handle.is_empty() {
            return format!("@{handle}");
        }
    }
    if let Some(id) = url
        .split("v=")
        .nth(1)
        .and_then(|value| value.split(['&', '#']).next())
    {
        if !id.is_empty() {
            return format!("YouTube · {id}");
        }
    }
    "YouTube".into()
}

fn offline_screen(
    source_url: String,
    label: String,
    official: bool,
    recent: Option<OfficialLiveStream>,
) -> LiveStreamScreen {
    LiveStreamScreen {
        source_url,
        label,
        official,
        live: false,
        video_id: None,
        title: None,
        url: None,
        embed_url: None,
        thumbnail_url: None,
        recent,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::format::Format;

    #[test]
    fn static_catalog_has_the_three_champions_regulations() {
        let snaps = static_snapshots();
        let codes: Vec<&str> = snaps.iter().map(|s| s.info.code.as_str()).collect();
        assert_eq!(codes, vec!["M-A", "M-B", "M-C"]);
        assert!(snaps[2].species.iter().any(|s| s == "Watchog"));
        assert!(!snaps[2].species.iter().any(|s| s == "Patrat"));
    }

    #[test]
    fn m_c_season_is_m8_on_2026_11_21() {
        let infos = static_snapshots()
            .into_iter()
            .map(|s| s.info)
            .collect::<Vec<_>>();
        let mut mc = infos.into_iter().find(|i| i.code == "M-C").unwrap();
        regulation::annotate_seasons(
            &mut mc,
            chrono::DateTime::parse_from_rfc3339("2026-11-21T12:00:00Z")
                .unwrap()
                .with_timezone(&Utc),
        );
        assert_eq!(mc.active_season.map(|s| s.name), Some("M-8".into()));
    }

    #[test]
    fn static_window_closes_m_c_on_december_first() {
        assert_eq!(
            Format::mc().data_window().unwrap().1,
            chrono::NaiveDate::from_ymd_opt(2026, 12, 1)
        );
    }

    #[test]
    fn labels_the_default_live_screens() {
        assert_eq!(
            stream_label("https://www.youtube.com/@PlayPokemon"),
            "Play! Pokémon"
        );
        assert_eq!(stream_label("https://www.youtube.com/@yuksvgc"), "YukS VGC");
        assert_eq!(
            stream_label("https://www.youtube.com/@CybertronVGC"),
            "CybertronVGC"
        );
        assert_eq!(
            stream_label("https://www.youtube.com/@SomeChannel/streams"),
            "@SomeChannel"
        );
        assert_eq!(stream_label("https://www.youtube.com/@Sekiam"), "Sekiam");
        assert_eq!(
            stream_label("https://www.youtube.com/@IRNemesisTV"),
            "IRNemesis"
        );
        assert_eq!(
            stream_label("https://www.youtube.com/watch?v=tP09BzCEJqU"),
            "inder"
        );
        assert!(is_official_source("https://www.youtube.com/@PlayPokemon"));
        assert!(!is_official_source("https://www.youtube.com/@yuksvgc"));
    }
}
