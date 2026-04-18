use crate::adapters::HttpClient;
use crate::config;
use crate::error::AppError;
use serde::Deserialize;
use std::sync::Arc;

/// Client for labmaus.net's public JSON API. Every endpoint is gated on
/// Origin + Referer matching the site itself; without them the server
/// responds with `{"error":"unauthorized"}`.
#[derive(Clone)]
pub struct LabmausClient {
    http: Arc<HttpClient>,
}

impl LabmausClient {
    pub fn new(http: Arc<HttpClient>) -> Self {
        Self { http }
    }

    fn headers() -> Vec<(&'static str, &'static str)> {
        vec![
            ("Origin", config::LABMAUS_ORIGIN),
            ("Referer", config::LABMAUS_REFERER),
            ("Accept", "application/json"),
        ]
    }

    pub async fn get_completed_tournaments(
        &self,
        from: &str,
        to: &str,
    ) -> Result<Vec<LabmausTournament>, AppError> {
        let url = format!(
            "{}/api/completed_tournaments?date_range={}+to+{}",
            config::LABMAUS_BASE,
            from,
            to
        );
        let bytes = self
            .http
            .get_cached_with_headers(&url, &Self::headers(), config::TTL_LABMAUS_TOURNAMENTS)
            .await?;
        Ok(serde_json::from_slice(&bytes)?)
    }

    pub async fn get_discover_teams(
        &self,
        from: &str,
        to: &str,
        regulation: &str,
    ) -> Result<Vec<LabmausDiscoverTeam>, AppError> {
        let reg = urlencoding::encode(regulation);
        let url = format!(
            "{}/api/discover_teams?date_range={}+to+{}&regulation={}",
            config::LABMAUS_BASE,
            from,
            to,
            reg
        );
        let bytes = self
            .http
            .get_cached_with_headers(&url, &Self::headers(), config::TTL_LABMAUS_TOP_TEAMS)
            .await?;
        Ok(serde_json::from_slice(&bytes)?)
    }

    pub async fn get_trending_pokemon(
        &self,
        direction: TrendDirection,
        quantity: u32,
        language: &str,
    ) -> Result<Vec<LabmausTrend>, AppError> {
        let trend = match direction {
            TrendDirection::Up => "upwards",
            TrendDirection::Down => "downwards",
        };
        let url = format!(
            "{}/api/top_trending_pokemon?language={}&trend={}&quantity={}",
            config::LABMAUS_BASE,
            language,
            trend,
            quantity
        );
        let bytes = self
            .http
            .get_cached_with_headers(&url, &Self::headers(), config::TTL_LABMAUS_TRENDING)
            .await?;
        Ok(serde_json::from_slice(&bytes)?)
    }
}

#[derive(Copy, Clone, Debug, PartialEq, Eq)]
pub enum TrendDirection {
    Up,
    Down,
}

#[derive(Debug, Clone, Deserialize)]
pub struct LabmausTournament {
    pub id: serde_json::Value,
    pub name: String,
    pub date: String,
    #[serde(default)]
    pub division: Option<String>,
    #[serde(default)]
    pub num_players: Option<u32>,
    pub regulation: String,
    #[serde(default)]
    pub status: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct LabmausDiscoverTeam {
    #[serde(default)]
    pub country: Option<String>,
    #[serde(default)]
    pub division: Option<String>,
    #[serde(default)]
    pub placement: Option<u32>,
    pub player: String,
    #[serde(default)]
    pub record: Option<String>,
    /// Dex ids for each team member (may include form suffix like "898-s").
    #[serde(default)]
    pub team: Vec<String>,
    /// Display names for each team member (localised per request).
    #[serde(default)]
    pub pokemon_names: Vec<String>,
    /// Full pokepast.es URL with every member's set.
    pub team_url: String,
    #[serde(default)]
    pub tournament_id: Option<serde_json::Value>,
    #[serde(default)]
    pub tournament_name: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct LabmausTrend {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub icon: Option<String>,
    #[serde(default)]
    pub day1_usage: Option<u32>,
    #[serde(default)]
    pub day2_usage: Option<u32>,
    #[serde(default)]
    pub day1_percentage: f32,
    #[serde(default)]
    pub day2_percentage: f32,
    #[serde(default)]
    pub change_percentage: f32,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_discover_teams_sample() {
        let raw = include_str!("labmaus_discover_sample.json");
        let parsed: Vec<LabmausDiscoverTeam> =
            serde_json::from_str(raw).expect("sample should parse");
        assert!(!parsed.is_empty());
        assert!(parsed[0].team_url.starts_with("https://pokepast.es/"));
        assert!(!parsed[0].player.is_empty());
    }

    #[test]
    fn parses_trending_sample() {
        let raw = r#"[
            {"id":"145","name":"Zapdos","icon":"...","day1_usage":10,"day2_usage":42,
             "day1_percentage":4.2,"day2_percentage":17.5,"change_percentage":13.3}
        ]"#;
        let parsed: Vec<LabmausTrend> = serde_json::from_str(raw).unwrap();
        assert_eq!(parsed[0].name, "Zapdos");
        assert!((parsed[0].change_percentage - 13.3).abs() < 0.001);
    }
}
