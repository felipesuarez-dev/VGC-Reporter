use crate::domain::updater::{AndroidUpdateProgress, UpdateInfo};
use crate::error::AppError;
use crate::state::AppState;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager, State};

pub const ANDROID_UPDATE_PROGRESS_EVENT: &str = "android-update-progress";

#[tauri::command]
#[tracing::instrument(skip_all, err(Debug))]
pub async fn check_for_app_update(
    state: State<'_, AppState>,
) -> Result<Option<UpdateInfo>, AppError> {
    state.updater.check().await
}

/// Download the APK into the app cache with real progress and cancellation.
/// The file is verified before the installer can see it.
#[tauri::command]
#[tracing::instrument(skip_all, err(Debug))]
pub async fn download_android_update(
    app: AppHandle,
    state: State<'_, AppState>,
    request_id: String,
    url: String,
    expected_size: u64,
    expected_sha256: String,
) -> Result<String, AppError> {
    let dir = updates_dir(&app)?;
    let destination = dir.join("vgc-reporter-update.apk");
    let progress_app = app.clone();
    let progress_id = request_id.clone();
    let mut last_pct = 255u8;
    let mut progress = move |downloaded: u64, total: u64| {
        let pct = downloaded
            .saturating_mul(100)
            .checked_div(total)
            .unwrap_or(0)
            .min(100) as u8;
        if pct == last_pct {
            return;
        }
        last_pct = pct;
        let _ = progress_app.emit(
            ANDROID_UPDATE_PROGRESS_EVENT,
            AndroidUpdateProgress {
                request_id: progress_id.clone(),
                downloaded,
                total,
                pct,
                done: false,
                error: None,
            },
        );
    };
    let result = state
        .updater
        .download_android_apk(
            &request_id,
            &url,
            &destination,
            expected_size,
            &expected_sha256,
            &mut progress,
        )
        .await;
    let payload = match &result {
        Ok(bytes) => AndroidUpdateProgress {
            request_id: request_id.clone(),
            downloaded: *bytes,
            total: *bytes,
            pct: 100,
            done: true,
            error: None,
        },
        Err(error) => AndroidUpdateProgress {
            request_id: request_id.clone(),
            downloaded: 0,
            total: expected_size,
            pct: 0,
            done: true,
            error: Some(error.to_string()),
        },
    };
    let _ = app.emit(ANDROID_UPDATE_PROGRESS_EVENT, payload);
    result?;
    Ok(destination.to_string_lossy().to_string())
}

#[tauri::command]
#[tracing::instrument(skip_all, err(Debug))]
pub fn cancel_android_update(
    state: State<'_, AppState>,
    request_id: String,
) -> Result<bool, AppError> {
    Ok(state.updater.cancel_download(&request_id))
}

/// Launch the system package installer with a FileProvider URI. The Kotlin
/// side checks that the APK signature matches the installed app and opens the
/// "install unknown apps" settings when that permission is missing.
#[tauri::command]
#[tracing::instrument(skip_all, err(Debug))]
pub fn install_android_update(app: AppHandle, path: String) -> Result<(), AppError> {
    let root = updates_dir(&app)?;
    let canonical = std::fs::canonicalize(&path)
        .map_err(|error| AppError::Validation(format!("APK not found: {error}")))?;
    let root = std::fs::canonicalize(&root).unwrap_or(root);
    if !canonical.starts_with(&root) {
        return Err(AppError::Validation(
            "the APK is outside the update cache".into(),
        ));
    }
    if canonical.extension().and_then(|value| value.to_str()) != Some("apk") {
        return Err(AppError::Validation("the update is not an APK".into()));
    }
    #[cfg(target_os = "android")]
    {
        use crate::android_installer::AndroidInstallerExt;
        app.android_installer()
            .install(&canonical.to_string_lossy())
            .map_err(AppError::Internal)
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = canonical;
        Err(AppError::Validation(
            "the Android installer is only available on Android".into(),
        ))
    }
}

fn updates_dir(app: &AppHandle) -> Result<PathBuf, AppError> {
    let dir = app
        .path()
        .app_cache_dir()
        .map_err(|error| AppError::Internal(format!("no cache dir: {error}")))?
        .join("updates");
    std::fs::create_dir_all(&dir)?;
    Ok(dir)
}
