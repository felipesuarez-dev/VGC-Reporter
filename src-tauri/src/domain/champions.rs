use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct ChampionsTournament {
    pub id: String,
    pub name: String,
    pub date: Option<String>,
    pub players: Option<u32>,
    pub format: Option<String>,
    pub organizer_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct ChampionsReport {
    pub tournaments: Vec<ChampionsTournament>,
    pub fetched_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct TournamentStanding {
    pub placing: Option<u32>,
    pub player_name: Option<String>,
    pub player_id: Option<String>,
    pub country: Option<String>,
    pub record: Option<String>,
    pub wins: u32,
    pub losses: u32,
    pub ties: u32,
    pub decklist: Vec<DecklistPokemon>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct DecklistPokemon {
    pub id: Option<String>,
    pub name: String,
    pub item: Option<String>,
    pub ability: Option<String>,
    pub tera_type: Option<String>,
    pub moves: Vec<String>,
    pub sprite_url: String,
    pub sprite_fallback_url: Option<String>,
}
