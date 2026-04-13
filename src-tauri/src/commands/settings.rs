use crate::error::AppError;
use crate::state::AppState;
use std::collections::HashMap;
use tauri::State;

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> Result<HashMap<String, String>, AppError> {
    state.settings.all()
}

#[tauri::command]
pub fn set_setting(
    state: State<'_, AppState>,
    key: String,
    value: String,
) -> Result<(), AppError> {
    state.settings.set(&key, &value)
}
