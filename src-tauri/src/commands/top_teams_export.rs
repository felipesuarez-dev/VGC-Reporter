use crate::domain::format::Format;
use crate::error::AppError;
use crate::services::top_teams_export;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn export_top_teams_markdown(
    state: State<'_, AppState>,
    format: Format,
    limit: u32,
) -> Result<String, AppError> {
    let limit = limit as usize;
    let report = state.top_teams.get_top_teams_report(format, limit).await?;
    Ok(top_teams_export::build_markdown(&report, limit, format))
}
