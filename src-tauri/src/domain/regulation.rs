//! Dynamic regulation metadata.
//!
//! The static M-A/M-B/M-C data lives in `services::regulations`. This module
//! holds the part that changes while the app is installed: the regulation
//! discovered from the official calendar and from live tournament sources.
//!
//! It deliberately contains no I/O. `RegulationService` fetches and validates
//! the data, then publishes snapshots here. `Format` reads them.

use crate::domain::source_stats::SourceId;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{OnceLock, RwLock};
use ts_rs::TS;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "snake_case")]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub enum RegulationStatus {
    Upcoming,
    Active,
    Archived,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "snake_case")]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub enum RegulationOrigin {
    Official,
    SourceValidated,
    SeedFallback,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "snake_case")]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub enum RegulationConfidence {
    High,
    Medium,
    Low,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct SeasonInfo {
    pub name: String,
    pub start_at: String,
    pub end_at: String,
    pub active: bool,
}

impl SeasonInfo {
    /// Calendar days covered by the season. The official end instant is
    /// normally `...T01:59Z`, so the last full data day is the previous date;
    /// the same rule applies to regulation windows.
    pub fn data_window(&self) -> Option<(chrono::NaiveDate, chrono::NaiveDate)> {
        let start = parse_instant(&self.start_at)?.date_naive();
        let end_at = parse_instant(&self.end_at)?;
        let six_am = chrono::NaiveTime::from_hms_opt(6, 0, 0)?;
        let end = if end_at.time() < six_am {
            end_at.date_naive() - chrono::Duration::days(1)
        } else {
            end_at.date_naive()
        };
        Some((start, end))
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(tag = "kind", rename_all = "snake_case")]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub enum RegulationWarning {
    OfficialRosterMissing,
    CalendarPending,
    RosterShrank { from: usize, to: usize },
    SourceNotVerified { source: SourceId },
    SourceOverride { source: SourceId },
    TranslationPending { count: usize },
    SourceValidated { source_count: u8, teams: u32 },
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct RegulationSourceState {
    pub source: SourceId,
    pub configured: bool,
    pub verified: bool,
    pub override_active: bool,
    pub detail: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct RegulationInfo {
    pub id: String,
    pub label: String,
    pub code: String,
    pub start_at: String,
    pub end_at: Option<String>,
    pub status: RegulationStatus,
    pub origin: RegulationOrigin,
    pub confidence: RegulationConfidence,
    pub seasons: Vec<SeasonInfo>,
    pub active_season: Option<SeasonInfo>,
    pub eligible_count: usize,
    pub new_species: Vec<String>,
    pub new_megas: Vec<String>,
    pub new_items: Vec<String>,
    pub new_moves: Vec<String>,
    pub sources: Vec<RegulationSourceState>,
    pub warnings: Vec<RegulationWarning>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct RegulationSyncStatus {
    pub active_id: Option<String>,
    pub last_sync: Option<String>,
    pub calendar_pending: bool,
    pub origin: Option<RegulationOrigin>,
    pub confidence: Option<RegulationConfidence>,
    pub official_roster: bool,
    pub sources: Vec<RegulationSourceState>,
    pub warnings: Vec<RegulationWarning>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct RegulationNewsItem {
    pub id: String,
    pub title: String,
    pub url: String,
    pub category: String,
    pub published_at: Option<String>,
    pub banner_url: Option<String>,
    pub important: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct OfficialLiveStream {
    pub video_id: String,
    pub title: String,
    pub url: String,
    pub embed_url: String,
    pub thumbnail_url: String,
    pub live: bool,
    /// YouTube's duration badge for past broadcasts (`9:07:32`), when present.
    #[serde(default)]
    pub duration: Option<String>,
    /// Approximate publish instant derived from YouTube's "Streamed 1d ago"
    /// text. It lets the UI render the age in the active locale.
    #[serde(default)]
    pub published_at: Option<String>,
}

/// One configured live screen (official channel or a community channel).
/// Offline screens keep their source URL so the UI can still offer the channel.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct LiveStreamScreen {
    pub source_url: String,
    pub label: String,
    pub official: bool,
    pub live: bool,
    pub video_id: Option<String>,
    pub title: Option<String>,
    pub url: Option<String>,
    pub embed_url: Option<String>,
    pub thumbnail_url: Option<String>,
    /// Most recent past broadcast for this source, used when nothing is live.
    #[serde(default)]
    pub recent: Option<OfficialLiveStream>,
}

/// Everything the validator and the data services need for one regulation.
#[derive(Debug, Clone)]
pub struct RegulationSnapshot {
    pub info: RegulationInfo,
    pub species: Vec<String>,
    pub items: Vec<String>,
    pub moves: Vec<String>,
    pub megas: Vec<String>,
    pub restricted: Vec<String>,
    pub max_restricted: u8,
    pub limitless_code: Option<String>,
    pub labmaus_name: Option<String>,
    pub smogon_slug: Option<String>,
    /// Inclusive date window used by labmaus/Limitless. The official end is
    /// usually `...T01:59Z`, so the last data day is the previous date.
    pub data_start: Option<String>,
    pub data_end: Option<String>,
}

impl RegulationSnapshot {
    pub fn allowed_species(&self) -> Vec<String> {
        self.species.clone()
    }
    pub fn allowed_items(&self) -> Vec<String> {
        self.items.clone()
    }
    pub fn allowed_moves(&self) -> Vec<String> {
        self.moves.clone()
    }
}

fn registry() -> &'static RwLock<HashMap<String, RegulationSnapshot>> {
    static REGISTRY: OnceLock<RwLock<HashMap<String, RegulationSnapshot>>> = OnceLock::new();
    REGISTRY.get_or_init(|| RwLock::new(HashMap::new()))
}

/// Replace every dynamically discovered regulation. Called by the sync
/// service after a successful refresh. Static M-A/M-B/M-C are not stored
/// here; their rules remain in `services::regulations`.
pub fn publish(snapshots: Vec<RegulationSnapshot>) {
    let mut map = HashMap::new();
    for snap in snapshots {
        map.insert(snap.info.id.clone(), snap);
    }
    if let Ok(mut guard) = registry().write() {
        *guard = map;
    }
}

pub fn snapshot(id: &str) -> Option<RegulationSnapshot> {
    registry()
        .read()
        .ok()
        .and_then(|guard| guard.get(id).cloned())
}

pub fn snapshots() -> Vec<RegulationSnapshot> {
    registry()
        .read()
        .map(|guard| guard.values().cloned().collect())
        .unwrap_or_default()
}

/// Parse an ISO-8601 instant or date into a UTC datetime. The official pages
/// publish instants (`2026-12-02T02:00:00Z`); tests and seeds may use dates.
pub fn parse_instant(raw: &str) -> Option<chrono::DateTime<chrono::Utc>> {
    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(raw) {
        return Some(dt.with_timezone(&chrono::Utc));
    }
    chrono::NaiveDate::parse_from_str(raw, "%Y-%m-%d")
        .ok()
        .and_then(|d| d.and_hms_opt(0, 0, 0))
        .map(|dt| dt.and_utc())
}

/// Pick the season that contains `at`, falling back to the latest started
/// season (used by archived regulations). Seasons without a parseable start
/// are ignored for selection.
pub fn season_for_at(
    seasons: &[SeasonInfo],
    at: chrono::DateTime<chrono::Utc>,
) -> Option<&SeasonInfo> {
    let started = seasons
        .iter()
        .filter(|season| {
            parse_instant(&season.start_at)
                .map(|start| start <= at)
                .unwrap_or(false)
        })
        .max_by_key(|season| parse_instant(&season.start_at));
    started.or_else(|| {
        seasons
            .iter()
            .max_by_key(|season| parse_instant(&season.start_at))
    })
}

/// Pick the regulation the app should follow: the newest Active one, then the
/// newest Archived one (so a catalog gap still has a usable default), then the
/// first entry. This is the single place that decides M-C → M-D.
pub fn preferred_active(infos: &[RegulationInfo]) -> Option<&RegulationInfo> {
    infos
        .iter()
        .filter(|info| info.status == RegulationStatus::Active)
        .max_by(|a, b| a.start_at.cmp(&b.start_at))
        .or_else(|| {
            infos
                .iter()
                .filter(|info| info.status == RegulationStatus::Archived)
                .max_by(|a, b| a.start_at.cmp(&b.start_at))
        })
        .or_else(|| infos.first())
}

pub fn status_at(info: &RegulationInfo, now: chrono::DateTime<chrono::Utc>) -> RegulationStatus {
    let start = parse_instant(&info.start_at);
    let end = info.end_at.as_deref().and_then(parse_instant);
    match (start, end) {
        (Some(start), Some(_end)) if now < start => RegulationStatus::Upcoming,
        (Some(start), None) if now < start => RegulationStatus::Upcoming,
        (Some(_start), Some(end)) if now > end => RegulationStatus::Archived,
        (Some(_), _) => RegulationStatus::Active,
        _ => RegulationStatus::Archived,
    }
}

/// Mark the season whose window contains `now`, or the latest started season
/// when the current instant falls between seasons.
pub fn annotate_seasons(info: &mut RegulationInfo, now: chrono::DateTime<chrono::Utc>) {
    let mut active: Option<SeasonInfo> = None;
    for season in &mut info.seasons {
        let start = parse_instant(&season.start_at);
        let end = parse_instant(&season.end_at);
        season.active = matches!((start, end), (Some(s), Some(e)) if now >= s && now <= e);
        if season.active {
            active = Some(season.clone());
        }
    }
    if active.is_none() {
        let mut latest: Option<(chrono::DateTime<chrono::Utc>, SeasonInfo)> = None;
        for season in &info.seasons {
            if let Some(start) = parse_instant(&season.start_at) {
                if start <= now && latest.as_ref().map(|(s, _)| start > *s).unwrap_or(true) {
                    latest = Some((start, season.clone()));
                }
            }
        }
        active = latest.map(|(_, s)| s);
    }
    if let Some(season) = &active {
        for s in &mut info.seasons {
            if s.name == season.name {
                s.active = true;
            }
        }
    }
    info.active_season = active;
}

#[cfg(test)]
mod tests {
    use super::*;

    fn info(start: &str, end: Option<&str>) -> RegulationInfo {
        RegulationInfo {
            id: "regulation-m-d".into(),
            label: "Regulation M-D".into(),
            code: "M-D".into(),
            start_at: start.into(),
            end_at: end.map(str::to_string),
            status: RegulationStatus::Archived,
            origin: RegulationOrigin::Official,
            confidence: RegulationConfidence::High,
            seasons: Vec::new(),
            active_season: None,
            eligible_count: 0,
            new_species: Vec::new(),
            new_megas: Vec::new(),
            new_items: Vec::new(),
            new_moves: Vec::new(),
            sources: Vec::new(),
            warnings: Vec::new(),
        }
    }

    #[test]
    fn status_uses_the_official_utc_instant() {
        let at = |s: &str| parse_instant(s).unwrap();
        let r = info("2026-12-02T02:00:00Z", None);
        assert_eq!(
            status_at(&r, at("2026-12-02T01:59:00Z")),
            RegulationStatus::Upcoming
        );
        assert_eq!(
            status_at(&r, at("2026-12-02T02:00:00Z")),
            RegulationStatus::Active
        );
    }

    #[test]
    fn seasons_are_annotated_from_dates() {
        let mut r = info("2026-09-09T02:00:00Z", Some("2026-12-02T01:59:00Z"));
        r.seasons = vec![
            SeasonInfo {
                name: "M-7".into(),
                start_at: "2026-10-07T02:00:00Z".into(),
                end_at: "2026-11-04T01:59:00Z".into(),
                active: false,
            },
            SeasonInfo {
                name: "M-8".into(),
                start_at: "2026-11-04T02:00:00Z".into(),
                end_at: "2026-12-02T01:59:00Z".into(),
                active: false,
            },
        ];
        annotate_seasons(&mut r, parse_instant("2026-11-21T12:00:00Z").unwrap());
        assert_eq!(
            r.active_season.as_ref().map(|s| s.name.as_str()),
            Some("M-8")
        );
    }

    #[test]
    fn season_data_window_closes_on_the_previous_day() {
        let season = SeasonInfo {
            name: "M-8".into(),
            start_at: "2026-11-04T02:00:00Z".into(),
            end_at: "2026-12-02T01:59:00Z".into(),
            active: true,
        };
        assert_eq!(
            season.data_window(),
            Some((
                chrono::NaiveDate::from_ymd_opt(2026, 11, 4).unwrap(),
                chrono::NaiveDate::from_ymd_opt(2026, 12, 1).unwrap(),
            ))
        );
    }

    #[test]
    fn season_for_at_prefers_the_latest_started_season() {
        let seasons = vec![
            SeasonInfo {
                name: "M-6".into(),
                start_at: "2026-09-09T02:00:00Z".into(),
                end_at: "2026-10-07T01:59:00Z".into(),
                active: false,
            },
            SeasonInfo {
                name: "M-7".into(),
                start_at: "2026-10-07T02:00:00Z".into(),
                end_at: "2026-11-04T01:59:00Z".into(),
                active: false,
            },
            SeasonInfo {
                name: "M-8".into(),
                start_at: "2026-11-04T02:00:00Z".into(),
                end_at: "2026-12-02T01:59:00Z".into(),
                active: false,
            },
        ];
        let at = |s: &str| parse_instant(s).unwrap();
        assert_eq!(
            season_for_at(&seasons, at("2026-11-21T12:00:00Z")).map(|s| s.name.as_str()),
            Some("M-8")
        );
        assert_eq!(
            season_for_at(&seasons, at("2027-01-01T12:00:00Z")).map(|s| s.name.as_str()),
            Some("M-8")
        );
    }

    #[test]
    fn preferred_active_switches_from_m_c_to_m_d() {
        let mut mc = info("2026-09-09T02:00:00Z", Some("2026-12-02T01:59:00Z"));
        mc.id = "regulation-m-c".into();
        mc.status = RegulationStatus::Active;
        let mut md = info("2026-12-02T02:00:00Z", None);
        md.id = "regulation-m-d".into();
        md.start_at = "2026-12-02T02:00:00Z".into();
        md.status = RegulationStatus::Upcoming;

        assert_eq!(
            preferred_active(&[mc.clone(), md.clone()]).map(|info| info.id.as_str()),
            Some("regulation-m-c")
        );
        mc.status = RegulationStatus::Archived;
        md.status = RegulationStatus::Active;
        assert_eq!(
            preferred_active(&[mc, md]).map(|info| info.id.as_str()),
            Some("regulation-m-d")
        );
    }
}
