use crate::domain::format::Format;
use crate::domain::source_stats::SourceId;
use crate::domain::usage_stats::MetaSnapshot;
use crate::error::AppError;
use crate::state::AppState;
use tauri::State;

/// `source` restricts the snapshot to one provider; `None` merges them all.
#[tauri::command]
pub async fn get_meta_stats(
    state: State<'_, AppState>,
    format: Format,
    tournament_count: Option<u32>,
    source: Option<SourceId>,
) -> Result<MetaSnapshot, AppError> {
    let count = tournament_count.map(|n| n as usize);
    state.meta.get_meta(format, count, source).await
}
