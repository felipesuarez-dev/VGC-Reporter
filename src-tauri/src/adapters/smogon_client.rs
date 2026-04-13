use crate::adapters::HttpClient;
use crate::config;
use crate::domain::format::Format;
use crate::error::AppError;
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

    /// Attempts to fetch the Smogon "chaos" JSON for the given format for the
    /// latest available month. Returns Ok(None) if the file does not exist yet
    /// (very common right after a new format launches).
    pub async fn fetch_chaos(&self, format: Format) -> Result<Option<ChaosStats>, AppError> {
        let now = Utc::now();
        for months_back in 0..3 {
            let (year, month) = rewind_month(now.year(), now.month() as i32, months_back);
            let url = format!(
                "{}/{:04}-{:02}/chaos/{}-1500.json",
                config::SMOGON_STATS,
                year,
                month,
                format.smogon_id()
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
    #[serde(default, rename = "Tera Types")]
    pub tera_types: BTreeMap<String, f64>,
}
