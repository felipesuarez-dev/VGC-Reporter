use crate::domain::format::Format;
use crate::domain::trending::TrendingReport;
use crate::error::AppError;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
#[tracing::instrument(skip_all, err(Debug))]
pub async fn get_trending(
    format: Format,
    state: State<'_, AppState>,
) -> Result<TrendingReport, AppError> {
    state.trending.get_trending(format).await
}
