use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct ChampionsTournament {
    pub id: String,
    pub name: String,
    pub date: Option<String>,
    /// Last day for multi-day official majors.
    #[serde(default)]
    pub end_date: Option<String>,
    pub players: Option<u32>,
    pub format: Option<String>,
    pub organizer_id: Option<String>,
    /// `limitless` (community) or `play-pokemon` (official major).
    #[serde(default)]
    pub source: Option<String>,
    /// Official event page / results page. Community rows are opened through
    /// the in-app Limitless standings drawer instead.
    #[serde(default)]
    pub url: Option<String>,
    #[serde(default)]
    pub location: Option<String>,
    /// ISO country code when the source publishes it (official calendar).
    #[serde(default)]
    pub country: Option<String>,
    /// `world`, `international`, `regional` or `special` for official majors.
    #[serde(default)]
    pub tier: Option<String>,
    /// Published cash prize pool, when the organizer lists one.
    #[serde(default)]
    pub prize_pool: Option<String>,
    pub champion_name: Option<String>,
    /// Country reported by Limitless for the champion; used by the local
    /// scene filter without touching standings or decklists.
    #[serde(default)]
    pub champion_country: Option<String>,
    /// Champion's six-Pokémon decklist, when the organizer published it.
    #[serde(default)]
    pub champion_team: Vec<DecklistPokemon>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct ChampionsReport {
    /// Community tournaments with published teams (Limitless).
    pub tournaments: Vec<ChampionsTournament>,
    /// Official Championship Series majors (Internationals, Regionals,
    /// Specials and Worlds) for the same date window.
    #[serde(default)]
    pub official_tournaments: Vec<ChampionsTournament>,
    pub fetched_at: DateTime<Utc>,
}

/// One row from the official Championship Series results endpoint. The
/// official feed publishes placement and match record but no decklists, so
/// `decklist` is intentionally absent.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct OfficialStanding {
    pub place: Option<u32>,
    pub player_name: String,
    #[serde(default)]
    pub country: Option<String>,
    #[serde(default)]
    pub wins: u32,
    #[serde(default)]
    pub losses: u32,
    #[serde(default)]
    pub ties: u32,
    #[serde(default)]
    pub record: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct OfficialStandingsPage {
    pub standings: Vec<OfficialStanding>,
    #[serde(default)]
    pub total_count: Option<u32>,
    pub start: u32,
    pub size: u32,
    pub results_available: bool,
    pub decklists_available: bool,
    /// `play-pokemon` for the official results feed, `pokedata` when the
    /// unofficial standings mirror filled a gap.
    #[serde(default)]
    pub source: Option<String>,
    #[serde(default)]
    pub source_url: Option<String>,
}

/// A top-cut team published by PokéBase for an official tournament. The
/// official Championship Series feed has no decklists, so this is the
/// enrichment layer used by the in-app tournament sheet.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct OfficialTournamentTeam {
    #[serde(default)]
    pub placing: Option<u32>,
    #[serde(default)]
    pub placing_label: Option<String>,
    pub player_name: String,
    #[serde(default)]
    pub country: Option<String>,
    #[serde(default)]
    pub record: Option<String>,
    pub pokemon: Vec<DecklistPokemon>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct OfficialTournamentTeams {
    /// Community source that published the teams (`pokebase`).
    pub source: String,
    pub source_url: String,
    pub tournament_name: String,
    #[serde(default)]
    pub tournament_date: Option<String>,
    #[serde(default)]
    pub teams: Vec<OfficialTournamentTeam>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct TopCutPlayer {
    pub name: String,
    #[serde(default)]
    pub seed: Option<u32>,
    #[serde(default)]
    pub country: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct TopCutMatch {
    pub winner: TopCutPlayer,
    pub loser: TopCutPlayer,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct TopCutRound {
    /// Display label from the source: `Top 16`, `Top 8`, `Top 4`, `Finals`.
    pub label: String,
    pub matches: Vec<TopCutMatch>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct TournamentTopCut {
    pub source: String,
    pub source_url: String,
    pub tournament_name: String,
    #[serde(default)]
    pub tournament_date: Option<String>,
    pub rounds: Vec<TopCutRound>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct OfficialTournamentMatch {
    pub round: u32,
    /// `swiss` or `top-cut`.
    pub phase: String,
    pub opponent_name: String,
    #[serde(default)]
    pub opponent_country: Option<String>,
    #[serde(default)]
    pub opponent_place: Option<u32>,
    /// `win`, `loss`, `tie` or `bye`.
    pub result: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct OfficialPlayerMatches {
    pub player_name: String,
    #[serde(default)]
    pub country: Option<String>,
    #[serde(default)]
    pub place: Option<u32>,
    #[serde(default)]
    pub record: Option<String>,
    pub matches: Vec<OfficialTournamentMatch>,
    /// Six-Pokémon team published by the source, when available.
    #[serde(default)]
    pub team: Vec<DecklistPokemon>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct OfficialTournamentDetail {
    pub source: String,
    pub source_url: String,
    pub tournament_name: String,
    #[serde(default)]
    pub tournament_date: Option<String>,
    #[serde(default)]
    pub swiss_rounds: Option<u32>,
    #[serde(default)]
    pub top_cut: Vec<TopCutRound>,
    /// Divisions published by the source. Empty when only Masters exists or
    /// the page does not expose the division ribbon.
    #[serde(default)]
    pub divisions: Vec<String>,
    /// Top-cut teams from PokéData; used as a fallback when PokéBase has no
    /// page for this event.
    #[serde(default)]
    pub teams: Vec<OfficialTournamentTeam>,
    #[serde(default)]
    pub players: Vec<OfficialPlayerMatches>,
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
    #[serde(default)]
    pub home_sprite_url: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
#[serde(rename_all = "lowercase")]
pub enum SearchHitKind {
    Tournament,
    Champion,
    Player,
    Pokemon,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct ChampionsSearchHit {
    pub tournament_id: String,
    pub tournament_name: String,
    pub tournament_date: Option<String>,
    pub kind: SearchHitKind,
    pub matched_text: String,
    pub player_name: Option<String>,
    pub player_placing: Option<u32>,
    pub player_pokemon: Vec<String>,
}
