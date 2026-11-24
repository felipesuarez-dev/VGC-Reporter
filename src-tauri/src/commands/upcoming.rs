use crate::domain::champions::{
    OfficialStandingsPage, OfficialTournamentDetail, OfficialTournamentTeams,
};
use crate::domain::{OfficialEventDetails, UpcomingTournament};
use crate::error::AppError;
use crate::state::AppState;
use chrono::NaiveDate;
use tauri::State;

#[tauri::command]
#[tracing::instrument(skip_all, err(Debug))]
pub async fn list_upcoming_tournaments(
    state: State<'_, AppState>,
    country: Option<String>,
) -> Result<Vec<UpcomingTournament>, AppError> {
    state.upcoming.list_upcoming(country).await
}

#[tauri::command]
#[tracing::instrument(skip_all, err(Debug))]
pub async fn get_official_event_details(
    state: State<'_, AppState>,
    url: String,
) -> Result<OfficialEventDetails, AppError> {
    state.upcoming.official_details(&url).await
}

#[tauri::command]
#[tracing::instrument(skip_all, err(Debug))]
pub async fn get_official_tournament_standings(
    state: State<'_, AppState>,
    url: String,
    start: Option<u32>,
    size: Option<u32>,
    name: Option<String>,
    date: Option<String>,
) -> Result<OfficialStandingsPage, AppError> {
    state
        .upcoming
        .official_standings(
            &url,
            start.unwrap_or(0),
            size.unwrap_or(32),
            name.as_deref()
                .map(str::trim)
                .filter(|name| !name.is_empty()),
            date.as_deref().and_then(parse_date),
        )
        .await
}

#[tauri::command]
#[tracing::instrument(skip_all, err(Debug))]
pub async fn get_official_tournament_teams(
    state: State<'_, AppState>,
    name: String,
    date: Option<String>,
) -> Result<Option<OfficialTournamentTeams>, AppError> {
    let name = name.trim();
    if name.is_empty() {
        return Err(AppError::Validation(
            "tournament name is required to find teams".into(),
        ));
    }
    state
        .upcoming
        .official_teams(name, date.as_deref().and_then(parse_date))
        .await
}

#[tauri::command]
#[tracing::instrument(skip_all, err(Debug))]
pub async fn get_official_tournament_detail(
    state: State<'_, AppState>,
    name: String,
    date: Option<String>,
) -> Result<Option<OfficialTournamentDetail>, AppError> {
    let name = name.trim();
    if name.is_empty() {
        return Err(AppError::Validation(
            "tournament name is required to find match details".into(),
        ));
    }
    state
        .upcoming
        .official_detail(name, date.as_deref().and_then(parse_date))
        .await
}

fn parse_date(raw: &str) -> Option<NaiveDate> {
    NaiveDate::parse_from_str(raw.trim(), "%Y-%m-%d").ok()
}
