use crate::domain::UpcomingTournament;
use crate::error::AppError;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn list_upcoming_tournaments(
    state: State<'_, AppState>,
) -> Result<Vec<UpcomingTournament>, AppError> {
    state.upcoming.list_upcoming().await
}
