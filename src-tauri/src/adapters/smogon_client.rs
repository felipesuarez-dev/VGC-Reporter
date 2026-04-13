use crate::adapters::HttpClient;
use crate::config;
use crate::domain::format::Format;
use crate::error::AppError;
use crate::storage::SettingsRepo;
use chrono::{Datelike, Utc};
use serde::Deserialize;
use std::collections::BTreeMap;

#[derive(Clone)]
pub struct SmogonClient {
    http: HttpClient,
}

impl SmogonClient {
    pub fn new(http: HttpClient) -> Self {
        Self { http }
    }

    /// Legacy single-slug fetch. Kept for tests / simple call sites; prefer
    /// `fetch_chaos_for_format` which does slug + rating discovery.
    pub async fn fetch_chaos(&self, format: Format) -> Result<Option<ChaosStats>, AppError> {
        let now = Utc::now();
        for months_back in 0..3 {
            let (year, month) = rewind_month(now.year(), now.month() as i32, months_back);
            let url = format!(
                "{}/{:04}-{:02}/chaos/{}-1500.json",
                config::SMOGON_STATS,
                year,
                month,
                format.default_smogon_slug()
            );
            match self
                .http
                .get_json::<ChaosStats>(&url, config::TTL_SMOGON_STATS)
                .await
            {
                Ok(v) => return Ok(Some(v)),
                Err(AppError::Http(_)) => continue,
                Err(e) => return Err(e),
            }
        }
        Ok(None)
    }

    /// Discovers the real Smogon slug for the given format and returns
    /// `(slug_used, data)`. Walks (months, slug candidates, rating ladder)
    /// and caches the winning slug in `SettingsRepo` so future calls skip
    /// the discovery loop.
    pub async fn fetch_chaos_for_format(
        &self,
        format: Format,
        settings: &SettingsRepo,
    ) -> Result<Option<(String, ChaosStats)>, AppError> {
        let settings_key = format!("smogon_slug::{}", format.cache_id());
        let cached_slug = settings.get(&settings_key).ok().flatten();

        let mut candidates: Vec<String> = Vec::new();
        if let Some(s) = cached_slug {
            candidates.push(s);
        }
        candidates.push(format.default_smogon_slug().to_string());
        if matches!(format, Format::RegulationMA) {
            for extra in [
                "gen9vgc2026regm",
                "gen9vgc2026regulationma",
                "gen9vgc2026regulationm",
                "gen9vgc2026ma",
            ] {
                candidates.push(extra.to_string());
            }
        }
        if matches!(format, Format::ChampionsSingles) {
            for extra in [
                "gen9vgc2026regmasingles",
                "gen9vgc2026regmasingle",
                "gen9vgc2026masingle",
                "gen9championssingles",
                "gen9championssingle",
            ] {
                candidates.push(extra.to_string());
            }
        }
        candidates.dedup();

        let months: Vec<(i32, u32)> = match format.anchor_month() {
            Some(anchor) => vec![anchor],
            None => {
                let now = Utc::now();
                (0..6)
                    .map(|back| {
                        let (y, m) = rewind_month(now.year(), now.month() as i32, back);
                        (y, m as u32)
                    })
                    .collect()
            }
        };

        for (year, month) in months {
            for slug in &candidates {
                for rating in format.rating_ladder() {
                    let url = format!(
                        "{}/{:04}-{:02}/chaos/{}-{}.json",
                        config::SMOGON_STATS,
                        year,
                        month,
                        slug,
                        rating
                    );
                    match self
                        .http
                        .get_json::<ChaosStats>(&url, config::TTL_SMOGON_STATS)
                        .await
                    {
                        Ok(chaos) => {
                            let _ = settings.set(&settings_key, slug);
                            tracing::debug!(
                                format = %format,
                                slug = %slug,
                                year,
                                month,
                                rating,
                                "smogon slug resolved"
                            );
                            return Ok(Some((slug.clone(), chaos)));
                        }
                        Err(AppError::Http(_)) => continue,
                        Err(e) => return Err(e),
                    }
                }
            }
        }

        Ok(None)
    }
}

fn rewind_month(year: i32, month: i32, back: i32) -> (i32, i32) {
    let mut y = year;
    let mut m = month - back;
    while m <= 0 {
        m += 12;
        y -= 1;
    }
    (y, m)
}

#[derive(Debug, Deserialize)]
pub struct ChaosStats {
    pub data: BTreeMap<String, ChaosEntry>,
}

#[derive(Debug, Deserialize)]
pub struct ChaosEntry {
    #[serde(default)]
    pub usage: f64,
    #[serde(default, rename = "Moves")]
    pub moves: BTreeMap<String, f64>,
    #[serde(default, rename = "Items")]
    pub items: BTreeMap<String, f64>,
    #[serde(default, rename = "Abilities")]
    pub abilities: BTreeMap<String, f64>,
    #[serde(default, rename = "Teammates")]
    pub teammates: BTreeMap<String, f64>,
    #[serde(
        default,
        rename(deserialize = "Tera Types"),
        alias = "Tera",
        alias = "TeraTypes"
    )]
    pub tera_types: BTreeMap<String, f64>,
}
