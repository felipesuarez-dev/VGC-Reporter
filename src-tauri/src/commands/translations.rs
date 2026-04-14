use crate::adapters::TranslationTable;
use crate::error::AppError;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_translation_table(
    state: State<'_, AppState>,
) -> Result<TranslationTable, AppError> {
    state.translations.get_table().await
}
