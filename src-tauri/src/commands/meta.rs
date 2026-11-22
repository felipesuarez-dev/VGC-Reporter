use crate::domain::format::Format;
use crate::domain::source_stats::SourceId;
use crate::domain::usage_stats::MetaSnapshot;
use crate::error::AppError;
use crate::services::date_window::optional_range;
use crate::state::AppState;
use tauri::State;

/// `source` restricts the snapshot to one provider; `None` merges them all.
/// `from`/`to` are optional ISO dates. When omitted, the backend uses the
/// active season window, so older clients cannot silently aggregate every
/// season of a regulation.
#[tauri::command]
#[tracing::instrument(skip_all, err(Debug))]
pub async fn get_meta_stats(
    state: State<'_, AppState>,
    format: Format,
    tournament_count: Option<u32>,
    source: Option<SourceId>,
    from: Option<String>,
    to: Option<String>,
) -> Result<MetaSnapshot, AppError> {
    let count = tournament_count.map(|n| n as usize);
    let range = optional_range(from, to)?;
    state.meta.get_meta(format, count, source, range).await
}
