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
        let filtered = match format {
            // Champions sets (M-A / M-B): limitless still tags EVERY Champions
            // tournament — including the M-B ones — with `format=M-A`, so a
            // server-side `&format=M-B` filter returns nothing (verified: 0
            // results). Fetch a wide unfiltered VGC slice (limit 300 reaches
            // ~6 weeks back), keep only tournaments inside the regulation's own
            // date window, then rescue the Champions tournaments by name/format.
            // The date filter is what makes the recent list match the selected
            // regulation: M-A shows its closing fortnight, M-B shows 06-17 on.
            Format::RegulationMA | Format::RegulationMB => {
                let all = self.list_all_vgc(300).await?;
                let in_window = filter_by_window(all, format);
                filter_champions(in_window, limit)
            }
            _ => {
                let all = exclude_non_vgc(self.list_tournaments(format, 100).await?);
                all.into_iter().take(limit).collect()
            }
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

/// Keep only tournaments whose date falls inside the regulation's own window
/// (`Format::data_window`, open end clamped to today). Tournaments without a
/// parseable date are dropped — they can't be placed in a regulation. Formats
/// with no fixed window (`data_window() == None`) pass through unchanged.
fn filter_by_window(
    list: Vec<LimitlessTournamentSummary>,
    format: Format,
) -> Vec<LimitlessTournamentSummary> {
    let Some((start, end)) = format.data_window() else {
        return list;
    };
    let today = chrono::Utc::now().date_naive();
    let end = end.unwrap_or(today).min(today);
    list.into_iter()
        .filter(|t| {
            t.date
                .as_deref()
                .and_then(parse_tournament_date)
                .map(|d| d >= start && d <= end)
                .unwrap_or(false)
        })
        .collect()
}

/// Parse a Limitless tournament date. They arrive as RFC3339 timestamps
/// (`2026-06-20T17:00:00.000Z`); fall back to the leading `YYYY-MM-DD`.
fn parse_tournament_date(raw: &str) -> Option<chrono::NaiveDate> {
    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(raw) {
        return Some(dt.date_naive());
    }
    chrono::NaiveDate::parse_from_str(raw.get(..10).unwrap_or(raw), "%Y-%m-%d").ok()
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

    #[test]
    fn parse_tournament_date_handles_rfc3339_and_plain() {
        assert_eq!(
            parse_tournament_date("2026-06-20T17:00:00.000Z"),
            chrono::NaiveDate::from_ymd_opt(2026, 6, 20)
        );
        assert_eq!(
            parse_tournament_date("2026-06-03"),
            chrono::NaiveDate::from_ymd_opt(2026, 6, 3)
        );
        assert_eq!(parse_tournament_date("nope"), None);
    }

    #[test]
    fn filter_by_window_keeps_only_m_a_fortnight() {
        let mk = |id: &str, date: &str| LimitlessTournamentSummary {
            id: id.into(),
            name: "Champions".into(),
            date: Some(date.into()),
            players: Some(50),
            format: Some("M-A".into()),
            organizer_id: None,
            game: None,
        };
        let list = vec![
            mk("before", "2026-06-02T10:00:00.000Z"), // before M-A window
            mk("in_a", "2026-06-10T10:00:00.000Z"),   // inside M-A (Jun 3-16)
            mk("edge", "2026-06-16T23:00:00.000Z"),   // M-A last day
            mk("m_b", "2026-06-18T10:00:00.000Z"),    // M-B era, excluded for M-A
        ];
        let kept = filter_by_window(list, Format::RegulationMA);
        let ids: Vec<&str> = kept.iter().map(|t| t.id.as_str()).collect();
        assert_eq!(ids, vec!["in_a", "edge"]);
    }
}
