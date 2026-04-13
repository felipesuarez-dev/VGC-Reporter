use crate::adapters::HttpClient;
use crate::config;
use crate::domain::format::Format;
use crate::error::AppError;
use serde::Deserialize;

#[derive(Clone)]
pub struct LimitlessClient {
    http: HttpClient,
}

impl LimitlessClient {
    pub fn new(http: HttpClient) -> Self {
        Self { http }
    }

    /// List recent VGC tournaments for a given format code (e.g. "M2A").
    pub async fn list_tournaments(
        &self,
        format: Format,
        limit: usize,
    ) -> Result<Vec<LimitlessTournamentSummary>, AppError> {
        let url = format!(
            "{}/tournaments?game=VGC&format={}&limit={}",
            config::LIMITLESS_API,
            format.limitless_code(),
            limit
        );
        let list: Vec<LimitlessTournamentSummary> = self
            .http
            .get_json(&url, config::TTL_LIMITLESS_LIST)
            .await?;
        Ok(list)
    }

    pub async fn get_standings(
        &self,
        tournament_id: &str,
    ) -> Result<Vec<LimitlessStanding>, AppError> {
        let url = format!(
            "{}/tournaments/{}/standings",
            config::LIMITLESS_API,
            tournament_id
        );
        let standings: Vec<LimitlessStanding> = self
            .http
            .get_json(&url, config::TTL_LIMITLESS_DETAIL)
            .await?;
        Ok(standings)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct LimitlessTournamentSummary {
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub date: Option<String>,
    #[serde(default)]
    pub players: Option<u32>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct LimitlessStanding {
    #[serde(default)]
    pub placing: Option<u32>,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub decklist: Option<Vec<LimitlessDecklistEntry>>,
    #[serde(default)]
    pub record: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct LimitlessDecklistEntry {
    #[serde(default)]
    pub species: Option<String>,
    #[serde(default, alias = "pokemon")]
    pub pokemon: Option<String>,
    #[serde(default)]
    pub item: Option<String>,
    #[serde(default)]
    pub ability: Option<String>,
    #[serde(default)]
    pub tera: Option<String>,
    #[serde(default, alias = "tera_type", alias = "teraType")]
    pub tera_type: Option<String>,
    #[serde(default)]
    pub moves: Option<Vec<String>>,
    #[serde(default)]
    pub nature: Option<String>,
}

impl LimitlessDecklistEntry {
    pub fn species_name(&self) -> Option<&str> {
        self.species
            .as_deref()
            .or(self.pokemon.as_deref())
    }

    pub fn tera_value(&self) -> Option<&str> {
        self.tera.as_deref().or(self.tera_type.as_deref())
    }
}
