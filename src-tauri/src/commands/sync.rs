use crate::domain::sync::{
    SyncBundle, SyncImportResult, SyncSendOptions, SyncSendSelection, SyncSession,
    SyncSessionStatus, SyncSettingOption, SyncTeamOption, SYNC_SCHEMA,
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

fn setting_group(key: &str) -> &'static str {
    if key.contains("::") {
        "overrides"
    } else if key == "live_stream_urls" || key == "official_stream_url" {
        "streams"
    } else {
        "general"
    }
}

/// Filter a complete bundle down to the sender's selection. Empty lists mean
/// "send none"; the UI must opt in explicitly. This keeps a session from
/// leaking teams or settings the sender did not want to share.
fn apply_send_selection(
    mut bundle: SyncBundle,
    selection: &SyncSendSelection,
) -> Result<SyncBundle, AppError> {
    let team_ids: std::collections::HashSet<i64> = selection.team_ids.iter().copied().collect();
    bundle
        .teams
        .retain(|team| team.id.map(|id| team_ids.contains(&id)).unwrap_or(false));

    let setting_keys: std::collections::HashSet<&str> =
        selection.setting_keys.iter().map(String::as_str).collect();
    bundle
        .settings
        .retain(|key, _| setting_keys.contains(key.as_str()));

    if !selection.include_ui {
        bundle.ui_json = "{}".to_string();
    }
    if bundle.teams.is_empty() && bundle.settings.is_empty() && !selection.include_ui {
        return Err(AppError::Validation(
            "select at least one team, setting or UI preference before sending".into(),
        ));
    }
    Ok(bundle)
}

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

/// Lists the teams and whitelisted settings the sender can include in a
/// session. Keeping this in Rust avoids duplicating the settings whitelist in
/// the frontend.
#[tauri::command]
#[tracing::instrument(skip_all, err(Debug))]
pub fn sync_send_options(state: State<'_, AppState>) -> Result<SyncSendOptions, AppError> {
    let teams = state
        .teams
        .list()?
        .into_iter()
        .filter_map(|team| {
            team.id.map(|id| SyncTeamOption {
                id,
                name: team.name,
            })
        })
        .collect();
    let mut settings = state
        .settings
        .all()?
        .into_iter()
        .filter(|(key, _)| SETTINGS_WHITELIST.contains(&key.as_str()))
        .map(|(key, _)| SyncSettingOption {
            group: setting_group(&key).to_string(),
            key,
        })
        .collect::<Vec<_>>();
    settings.sort_by(|a, b| a.group.cmp(&b.group).then_with(|| a.key.cmp(&b.key)));
    Ok(SyncSendOptions { teams, settings })
}

/// Starts a temporary LAN HTTP server and returns the versioned QR ticket.
/// The ticket is a pairing ticket, not the bundle: the selected teams, settings
/// and UI preferences travel over the local Wi-Fi when the receiver redeems it.
#[tauri::command]
#[tracing::instrument(skip_all, err(Debug))]
pub fn sync_start_send(
    app: AppHandle,
    state: State<'_, AppState>,
    ui_json: String,
    selection: SyncSendSelection,
) -> Result<SyncSession, AppError> {
    let bundle = apply_send_selection(bundle(&state, ui_json)?, &selection)?;
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn empty_bundle() -> SyncBundle {
        SyncBundle {
            schema: SYNC_SCHEMA,
            app_version: "test".into(),
            exported_at: "2026-11-23T00:00:00Z".into(),
            teams: Vec::new(),
            settings: HashMap::new(),
            ui_json: "{\"vgc-ui\":{}}".into(),
        }
    }

    #[test]
    fn groups_settings_for_the_sender_ui() {
        assert_eq!(setting_group("language"), "general");
        assert_eq!(setting_group("live_stream_urls"), "streams");
        assert_eq!(setting_group("labmaus_name::regulation-m-c"), "overrides");
    }

    #[test]
    fn selection_keeps_only_opted_in_settings_and_can_drop_ui() {
        let mut bundle = empty_bundle();
        bundle.settings.insert("language".into(), "es".into());
        bundle
            .settings
            .insert("live_stream_urls".into(), "https://youtube.com/@a".into());
        let selection = SyncSendSelection {
            team_ids: Vec::new(),
            setting_keys: vec!["language".into()],
            include_ui: false,
        };
        let filtered = apply_send_selection(bundle, &selection).unwrap();
        assert_eq!(filtered.settings.len(), 1);
        assert!(filtered.settings.contains_key("language"));
        assert_eq!(filtered.ui_json, "{}");
    }

    #[test]
    fn empty_selection_is_rejected() {
        let selection = SyncSendSelection {
            team_ids: Vec::new(),
            setting_keys: Vec::new(),
            include_ui: false,
        };
        assert!(apply_send_selection(empty_bundle(), &selection).is_err());
    }

    #[test]
    fn ui_only_selection_is_allowed() {
        let selection = SyncSendSelection {
            team_ids: Vec::new(),
            setting_keys: Vec::new(),
            include_ui: true,
        };
        let filtered = apply_send_selection(empty_bundle(), &selection).unwrap();
        assert!(filtered.ui_json.contains("vgc-ui"));
    }
}
