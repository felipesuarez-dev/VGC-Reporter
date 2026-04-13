use crate::domain::format::Format;
use crate::domain::usage_stats::MetaSnapshot;
use crate::error::AppError;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_meta_stats(
    state: State<'_, AppState>,
    format: Format,
) -> Result<MetaSnapshot, AppError> {
    state.meta.get_meta(format).await
}
