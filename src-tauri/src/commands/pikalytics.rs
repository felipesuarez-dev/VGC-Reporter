use crate::domain::pikalytics::PikalyticsEntry;
use crate::error::AppError;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_pikalytics_entry(
    state: State<'_, AppState>,
    species: String,
    lang: String,
) -> Result<PikalyticsEntry, AppError> {
    state.pikalytics.get_entry(&species, &lang).await
}
