use crate::domain::updater::UpdateInfo;
use crate::error::AppError;
use crate::state::AppState;
use tauri::{AppHandle, Manager, State};

#[tauri::command]
#[tracing::instrument(skip_all, err(Debug))]
pub async fn check_for_app_update(
    state: State<'_, AppState>,
) -> Result<Option<UpdateInfo>, AppError> {
    state.updater.check().await
}

/// Download an Android APK to the app cache so the system installer can be
/// launched with a content:// URI. Android always shows its own confirmation;
/// this only removes the browser round-trip.
#[tauri::command]
#[tracing::instrument(skip_all, err(Debug))]
pub async fn download_android_update(app: AppHandle, url: String) -> Result<String, AppError> {
    if !url.starts_with("https://") {
        return Err(AppError::Validation("the update URL must use HTTPS".into()));
    }
    let dir = app
        .path()
        .app_cache_dir()
        .map_err(|error| AppError::Internal(format!("no cache dir: {error}")))?
        .join("updates");
    std::fs::create_dir_all(&dir)?;
    let path = dir.join("vgc-reporter-update.apk");
    let response = reqwest::get(&url)
        .await
        .map_err(|error| AppError::Http(error.to_string()))?;
    if !response.status().is_success() {
        return Err(AppError::Http(format!(
            "update download returned {}",
            response.status()
        )));
    }
    let bytes = response
        .bytes()
        .await
        .map_err(|error| AppError::Http(error.to_string()))?;
    std::fs::write(&path, &bytes)?;
    Ok(path.to_string_lossy().to_string())
}
