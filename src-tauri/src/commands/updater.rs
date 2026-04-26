use crate::domain::updater::UpdateInfo;
use crate::error::AppError;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn check_for_app_update(
    state: State<'_, AppState>,
) -> Result<Option<UpdateInfo>, AppError> {
    state.updater.check().await
}
