use crate::domain::trending::TrendingReport;
use crate::error::AppError;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_trending(state: State<'_, AppState>) -> Result<TrendingReport, AppError> {
    state.trending.get_trending().await
}
