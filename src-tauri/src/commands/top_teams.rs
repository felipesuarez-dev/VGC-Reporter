use crate::domain::format::Format;
use crate::error::AppError;
use crate::services::date_window::optional_range;
use crate::services::TopTeamsReport;
use crate::state::AppState;
use tauri::State;

/// `source` is `labmaus`, `limitless` or `None` (the default fallback chain).
/// `from`/`to` are the same ISO dates the Dashboard uses, so Top Teams and
/// the recent-tournaments panel can never silently disagree about the window.
#[tauri::command]
#[tracing::instrument(skip_all, err(Debug))]
pub async fn get_top_teams(
    state: State<'_, AppState>,
    format: Format,
    limit: Option<u32>,
    source: Option<String>,
    from: Option<String>,
    to: Option<String>,
) -> Result<TopTeamsReport, AppError> {
    let limit = limit.unwrap_or(20) as usize;
    let range = optional_range(from, to)?;
    state
        .top_teams
        .get_top_teams_report(format, limit, source, range)
        .await
}
