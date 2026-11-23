use crate::domain::sync::{
    SyncBundle, SyncImportResult, SyncSession, SyncSessionStatus, SYNC_SCHEMA,
};
use crate::error::AppError;
use crate::services::sync_service::{self, SyncEventSink};
use crate::state::AppState;
use chrono::Utc;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};

const SYNC_STATE_EVENT: &str = "sync-state";

const SETTINGS_WHITELIST: &[&str] = &[
    "language",
    "timezone",
    "home_country",
    "live_stream_urls",
    "official_stream_url",
    "labmaus_name::regulation-m-a",
    "limitless_code::regulation-m-a",
    "smogon_slug::regulation-m-a",
    "labmaus_name::regulation-m-b",
    "limitless_code::regulation-m-b",
    "smogon_slug::regulation-m-b",
    "labmaus_name::regulation-m-c",
    "limitless_code::regulation-m-c",
    "smogon_slug::regulation-m-c",
];

fn bundle(state: &AppState, ui_json: String) -> Result<SyncBundle, AppError> {
    let teams = state.teams.list()?;
    let settings = state
        .settings
        .all()?
        .into_iter()
        .filter(|(key, _)| SETTINGS_WHITELIST.contains(&key.as_str()))
        .collect();
    Ok(SyncBundle {
        schema: SYNC_SCHEMA,
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        exported_at: Utc::now().to_rfc3339(),
        teams,
        settings,
        ui_json,
    })
}

/// Starts a temporary LAN HTTP server and returns the versioned QR ticket.
/// The ticket is a pairing ticket, not the bundle: teams and settings travel
/// over the local Wi-Fi when the receiver redeems it.
#[tauri::command]
#[tracing::instrument(skip_all, err(Debug))]
pub fn sync_start_send(
    app: AppHandle,
    state: State<'_, AppState>,
    ui_json: String,
) -> Result<SyncSession, AppError> {
    let bundle = bundle(&state, ui_json)?;
    let sink: SyncEventSink = Arc::new(move |status| {
        let _ = app.emit(SYNC_STATE_EVENT, status);
    });
    state.sync.start(bundle, Some(sink))
}

#[tauri::command]
#[tracing::instrument(skip_all, err(Debug))]
pub fn sync_session_status(
    state: State<'_, AppState>,
    code: String,
) -> Result<SyncSessionStatus, AppError> {
    state.sync.status(&code)
}

#[tauri::command]
#[tracing::instrument(skip_all, err(Debug))]
pub fn sync_cancel(
    state: State<'_, AppState>,
    code: String,
) -> Result<SyncSessionStatus, AppError> {
    state.sync.cancel(&code)
}

/// Fetch a bundle from a versioned ticket or a legacy HTTP URL. Parsing in
/// Rust keeps Android's cleartext WebView policy out of the sync path.
#[tauri::command]
#[tracing::instrument(skip_all, err(Debug))]
pub async fn sync_fetch(ticket: String) -> Result<SyncBundle, AppError> {
    sync_service::fetch_bundle(&ticket).await
}

/// Receive a bundle using only the 8-character code. The sender answers the
/// UDP probe with its temporary HTTP URL; the token still protects the payload.
#[tauri::command]
#[tracing::instrument(skip_all, err(Debug))]
pub async fn sync_fetch_by_code(code: String) -> Result<SyncBundle, AppError> {
    sync_service::fetch_by_code(&code).await
}

/// Import teams/settings after the user reviewed conflicts in the UI. Teams
/// are always created as new rows; the frontend renames, replaces or skips
/// conflicts before calling this.
#[tauri::command]
#[tracing::instrument(skip_all, err(Debug))]
pub fn sync_import(
    state: State<'_, AppState>,
    mut bundle: SyncBundle,
    code: Option<String>,
) -> Result<SyncImportResult, AppError> {
    if bundle.schema != SYNC_SCHEMA {
        return Err(AppError::Validation("unsupported sync schema".into()));
    }
    // Validate everything before writing so a malformed peer cannot leave a
    // half-imported team list behind.
    for team in &bundle.teams {
        team.validate()
            .map_err(|error| AppError::Validation(error.to_string()))?;
    }
    let mut teams_imported = 0u32;
    for team in &mut bundle.teams {
        team.id = None;
        state.teams.save(team)?;
        teams_imported += 1;
    }
    let mut settings_imported = 0u32;
    for (key, value) in &bundle.settings {
        if !SETTINGS_WHITELIST.contains(&key.as_str()) {
            continue;
        }
        match state.settings.set(key, value) {
            Ok(()) => settings_imported += 1,
            Err(error) => tracing::warn!(%error, %key, "sync setting skipped"),
        }
    }
    if let Some(code) = code.as_deref() {
        if let Err(error) = state.sync.mark_imported(code) {
            tracing::debug!(%error, %code, "sync session could not be marked imported");
        }
    }
    tracing::info!(teams_imported, settings_imported, "sync import complete");
    Ok(SyncImportResult {
        teams_imported,
        settings_imported,
    })
}
