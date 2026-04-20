use crate::domain::format::Format;
use crate::error::AppError;
use crate::services::top_teams_export;
use crate::state::AppState;
use std::path::PathBuf;
use tauri::State;

#[tauri::command]
pub async fn save_top_teams_markdown(
    state: State<'_, AppState>,
    format: Format,
    limit: u32,
    path: PathBuf,
) -> Result<(), AppError> {
    let limit = limit as usize;
    let report = state.top_teams.get_top_teams_report(format, limit).await?;
    let md = top_teams_export::build_markdown(&report, limit, format);
    std::fs::write(&path, md)?;
    Ok(())
}
