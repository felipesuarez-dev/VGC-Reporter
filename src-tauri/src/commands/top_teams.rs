use crate::domain::format::Format;
use crate::error::AppError;
use crate::services::TopTeam;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_top_teams(
    state: State<'_, AppState>,
    format: Format,
    limit: Option<u32>,
) -> Result<Vec<TopTeam>, AppError> {
    let limit = limit.unwrap_or(20) as usize;
    state.top_teams.get_top_teams(format, limit).await
}
