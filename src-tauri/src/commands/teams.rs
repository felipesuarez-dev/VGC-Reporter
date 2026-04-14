use crate::domain::team::Team;
use crate::error::AppError;
use crate::services::showdown_text;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub fn save_team(state: State<'_, AppState>, team: Team) -> Result<i64, AppError> {
    state.teams.save(&team)
}

#[tauri::command]
pub fn list_teams(state: State<'_, AppState>) -> Result<Vec<Team>, AppError> {
    state.teams.list()
}

#[tauri::command]
pub fn get_team(state: State<'_, AppState>, id: i64) -> Result<Team, AppError> {
    state.teams.get(id)
}

#[tauri::command]
pub fn delete_team(state: State<'_, AppState>, id: i64) -> Result<(), AppError> {
    state.teams.delete(id)
}

#[tauri::command]
pub fn import_showdown_text(text: String) -> Result<Team, AppError> {
    showdown_text::parse_team(&text)
}

#[tauri::command]
pub fn export_team_to_showdown(team: Team) -> Result<String, AppError> {
    Ok(showdown_text::format_team(&team))
}
