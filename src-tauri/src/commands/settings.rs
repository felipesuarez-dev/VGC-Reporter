use crate::error::AppError;
use crate::state::AppState;
use std::collections::HashMap;
use tauri::State;

#[tauri::command]
#[tracing::instrument(skip_all, err(Debug))]
pub fn get_settings(state: State<'_, AppState>) -> Result<HashMap<String, String>, AppError> {
    state.settings.all()
}

#[tauri::command]
#[tracing::instrument(skip_all, err(Debug))]
pub fn set_setting(state: State<'_, AppState>, key: String, value: String) -> Result<(), AppError> {
    state.settings.set(&key, &value)
}

/// Open the folder holding the rotating log files.
///
/// Without this, asking a user for a log means talking them through finding
/// an app data directory, which in practice means never getting one.
#[tauri::command]
#[tracing::instrument(skip_all, err(Debug))]
pub fn open_logs_folder(app: tauri::AppHandle) -> Result<(), AppError> {
    use tauri::Manager;
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Internal(format!("no app data dir: {e}")))?
        .join(crate::LOG_DIR_NAME);
    std::fs::create_dir_all(&dir)?;
    tauri_plugin_opener::open_path(&dir, None::<&str>)
        .map_err(|e| AppError::Internal(format!("could not open {}: {e}", dir.display())))
}
