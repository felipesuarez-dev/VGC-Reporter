use crate::domain::{OfficialEventDetails, UpcomingTournament};
use crate::error::AppError;
use crate::state::AppState;
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
