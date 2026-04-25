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

    /// List recent VGC tournaments for a given format code (e.g. "M-A", "SVI").
    /// Returns an empty list if the format does not live on Limitless.
    pub async fn list_tournaments(
        &self,
        format: Format,
        limit: usize,
    ) -> Result<Vec<LimitlessTournamentSummary>, AppError> {
        let Some(code) = format.limitless_code() else {
            return Ok(Vec::new());
        };
        let url = format!(
            "{}/tournaments?game=VGC&format={}&limit={}",
            config::LIMITLESS_API,
            code,
            limit
        );
        let list: Vec<LimitlessTournamentSummary> =
            self.http.get_json(&url, config::TTL_LIMITLESS_LIST).await?;
        Ok(list)
    }

    pub async fn get_standings(
        &self,
        tournament_id: &str,
    ) -> Result<Vec<LimitlessStanding>, AppError> {
        let url = format!(
            "{}/tournaments/{}/standings?limit=500",
            config::LIMITLESS_API,
            tournament_id
        );
        let standings: Vec<LimitlessStanding> = self
            .http
            .get_json(&url, config::TTL_LIMITLESS_DETAIL)
            .await?;
        Ok(standings)
    }

    /// Lists tournaments and keeps only the ones that look like Champions
    /// Regulation M-A. Even though the API is called with `format=M-A`, older
    /// listings occasionally report `m-a`, `ma`, `m2a` or no format at all, so
    /// the client-side filter normalises and also rescues anything whose name
    /// mentions "champions". Fetches a wider window than `limit` to absorb the
    /// drop-through.
    pub async fn list_tournaments_by_format(
        &self,
        format: Format,
        limit: usize,
    ) -> Result<Vec<LimitlessTournamentSummary>, AppError> {
        let all = self.list_tournaments(format, 100).await?;
        let all = exclude_non_vgc(all);
        let filtered = match format {
            Format::RegulationMA => filter_champions(all, limit),
            _ => all.into_iter().take(limit).collect(),
        };
        Ok(filtered)
    }

    /// Fetches a broad tournament listing and leaves filtering to the caller.
    /// Used by the upcoming-tournaments service (dates are kept as raw strings).
    pub async fn list_all_vgc(
        &self,
        limit: usize,
    ) -> Result<Vec<LimitlessTournamentSummary>, AppError> {
        let url = format!(
            "{}/tournaments?game=VGC&limit={}",
            config::LIMITLESS_API,
            limit
        );
        let list: Vec<LimitlessTournamentSummary> =
            self.http.get_json(&url, config::TTL_LIMITLESS_LIST).await?;
        Ok(exclude_non_vgc(list))
    }
}

/// Defensive filter: even though the query is `game=VGC`, some older entries
/// slip through with `game="TCG"` or a TCG-looking `format`. Remove them so
/// they never reach the dashboard.
fn exclude_non_vgc(list: Vec<LimitlessTournamentSummary>) -> Vec<LimitlessTournamentSummary> {
    list.into_iter()
        .filter(|t| {
            let game = t.game.as_deref().unwrap_or("").to_uppercase();
            if game.contains("TCG") {
                return false;
            }
            let fmt = t.format.as_deref().unwrap_or("");
            !fmt.to_uppercase().contains("TCG")
        })
        .collect()
}

fn filter_champions(
    list: Vec<LimitlessTournamentSummary>,
    limit: usize,
) -> Vec<LimitlessTournamentSummary> {
    list.into_iter()
        .filter(|t| {
            let normalized = t
                .format
                .as_deref()
                .unwrap_or("")
                .to_lowercase()
                .replace(['-', ' ', '_'], "");
            let name_lc = t.name.to_lowercase();
            let is_champions_like = normalized == "ma"
                || normalized == "m2a"
                || normalized.starts_with("ma")
                || name_lc.contains("champions");
            let has_players = t.players.map(|n| n > 0).unwrap_or(false);
            is_champions_like && has_players
        })
        .take(limit)
        .collect()
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
    #[serde(default)]
    pub format: Option<String>,
    #[serde(default)]
    pub game: Option<String>,
    #[serde(default, alias = "organizer")]
    pub organizer_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct LimitlessStanding {
    #[serde(default)]
    pub placing: Option<u32>,
    /// Player display name (Limitless calls this `name`).
    #[serde(default)]
    pub name: Option<String>,
    /// Player id (slug). Useful for linking back to Limitless profiles.
    #[serde(default)]
    pub player: Option<String>,
    #[serde(default)]
    pub country: Option<String>,
    #[serde(default)]
    pub decklist: Option<Vec<LimitlessDecklistEntry>>,
    /// Record may arrive as a struct (`{wins,losses,ties}`) or a flat string.
    #[serde(default)]
    pub record: Option<LimitlessRecord>,
    #[serde(default)]
    pub drop: Option<u32>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
pub enum LimitlessRecord {
    Parts(LimitlessRecordParts),
    String(String),
}

#[derive(Debug, Clone, Deserialize)]
pub struct LimitlessRecordParts {
    #[serde(default)]
    pub wins: u32,
    #[serde(default)]
    pub losses: u32,
    #[serde(default)]
    pub ties: u32,
}

impl LimitlessRecord {
    pub fn display(&self) -> String {
        match self {
            Self::Parts(p) => format!("{}-{}-{}", p.wins, p.losses, p.ties),
            Self::String(s) => s.clone(),
        }
    }

    pub fn wins(&self) -> u32 {
        match self {
            Self::Parts(p) => p.wins,
            Self::String(_) => 0,
        }
    }
    pub fn losses(&self) -> u32 {
        match self {
            Self::Parts(p) => p.losses,
            Self::String(_) => 0,
        }
    }
    pub fn ties(&self) -> u32 {
        match self {
            Self::Parts(p) => p.ties,
            Self::String(_) => 0,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct LimitlessDecklistEntry {
    /// Showdown slug id (e.g. "incineroar").
    #[serde(default)]
    pub id: Option<String>,
    /// Display name as Limitless serves it (e.g. "Incineroar").
    #[serde(default)]
    pub name: Option<String>,
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
    /// Limitless calls these `attacks`; older fixtures use `moves`.
    #[serde(default, alias = "attacks")]
    pub moves: Option<Vec<String>>,
    #[serde(default)]
    pub nature: Option<String>,
}

impl LimitlessDecklistEntry {
    pub fn species_name(&self) -> Option<&str> {
        self.species
            .as_deref()
            .or(self.pokemon.as_deref())
            .or(self.name.as_deref())
            .or(self.id.as_deref())
    }

    pub fn tera_value(&self) -> Option<&str> {
        self.tera.as_deref().or(self.tera_type.as_deref())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const FIXTURE: &str = r#"[
        {
            "placing": 1,
            "name": "Alice",
            "player": "alice123",
            "country": "US",
            "record": { "wins": 8, "losses": 1, "ties": 0 },
            "decklist": [
                {
                    "id": "incineroar",
                    "name": "Incineroar",
                    "item": "Safety Goggles",
                    "ability": "Intimidate",
                    "tera": "Ghost",
                    "attacks": ["Fake Out", "Knock Off", "Parting Shot", "Flare Blitz"]
                }
            ]
        },
        {
            "placing": 2,
            "name": "Bob",
            "country": "JP",
            "record": "7-2-0"
        }
    ]"#;

    #[test]
    fn standings_parse_record_struct_and_string() {
        let standings: Vec<LimitlessStanding> = serde_json::from_str(FIXTURE).unwrap();
        assert_eq!(standings.len(), 2);
        assert_eq!(standings[0].country.as_deref(), Some("US"));
        assert_eq!(standings[0].record.as_ref().unwrap().display(), "8-1-0");
        assert_eq!(standings[0].record.as_ref().unwrap().wins(), 8);
        assert_eq!(standings[1].record.as_ref().unwrap().display(), "7-2-0");

        let deck = standings[0].decklist.as_ref().unwrap();
        assert_eq!(deck.len(), 1);
        assert_eq!(deck[0].species_name(), Some("Incineroar"));
        let moves = deck[0].moves.as_ref().unwrap();
        assert_eq!(moves.len(), 4);
        assert_eq!(moves[0], "Fake Out");
    }

    #[test]
    fn filter_champions_keeps_format_ma_and_named_champions() {
        let list = vec![
            LimitlessTournamentSummary {
                id: "1".into(),
                name: "Local Reg I Cup".into(),
                date: None,
                players: Some(50),
                format: Some("SVI".into()),
                organizer_id: None,
                game: None,
            },
            LimitlessTournamentSummary {
                id: "2".into(),
                name: "Regional".into(),
                date: None,
                players: Some(120),
                format: Some("M-A".into()),
                organizer_id: None,
                game: None,
            },
            LimitlessTournamentSummary {
                id: "3".into(),
                name: "Champions Battle".into(),
                date: None,
                players: Some(80),
                format: None,
                organizer_id: None,
                game: None,
            },
            LimitlessTournamentSummary {
                id: "4".into(),
                name: "Legacy Mega".into(),
                date: None,
                players: Some(32),
                format: Some("m-a".into()),
                organizer_id: None,
                game: None,
            },
        ];
        let kept = filter_champions(list, 10);
        let ids: Vec<&str> = kept.iter().map(|t| t.id.as_str()).collect();
        assert_eq!(ids, vec!["2", "3", "4"]);
    }

    #[test]
    fn filter_champions_respects_limit() {
        let list = (0..30)
            .map(|i| LimitlessTournamentSummary {
                id: i.to_string(),
                name: format!("Champions {}", i),
                date: None,
                players: Some(64),
                format: None,
                organizer_id: None,
                game: None,
            })
            .collect();
        let kept = filter_champions(list, 10);
        assert_eq!(kept.len(), 10);
    }

    #[test]
    fn filter_champions_excludes_empty_tournaments() {
        let list = vec![
            LimitlessTournamentSummary {
                id: "empty".into(),
                name: "Glitch VGC Champions Tournament #1".into(),
                date: None,
                players: Some(0),
                format: None,
                organizer_id: None,
                game: None,
            },
            LimitlessTournamentSummary {
                id: "unknown".into(),
                name: "Champions Regional".into(),
                date: None,
                players: None,
                format: None,
                organizer_id: None,
                game: None,
            },
            LimitlessTournamentSummary {
                id: "valid".into(),
                name: "Champions Invitational".into(),
                date: None,
                players: Some(64),
                format: None,
                organizer_id: None,
                game: None,
            },
        ];
        let kept = filter_champions(list, 10);
        let ids: Vec<&str> = kept.iter().map(|t| t.id.as_str()).collect();
        assert_eq!(ids, vec!["valid"]);
    }
}
