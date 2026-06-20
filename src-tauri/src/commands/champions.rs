use crate::domain::champions::{ChampionsReport, ChampionsSearchHit, TournamentStanding};
use crate::domain::format::Format;
use crate::error::AppError;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn list_champions_tournaments(
    state: State<'_, AppState>,
    format: Option<Format>,
    limit: Option<usize>,
) -> Result<ChampionsReport, AppError> {
    let format = format.unwrap_or_default();
    let limit = limit.unwrap_or(10).clamp(1, 50);
    state.champions.list_recent(format, limit).await
}

#[tauri::command]
pub async fn get_tournament_standings(
    state: State<'_, AppState>,
    id: String,
) -> Result<Vec<TournamentStanding>, AppError> {
    state.champions.get_standings(&id).await
}

#[tauri::command]
pub async fn search_champions(
    state: State<'_, AppState>,
    query: String,
    format: Option<Format>,
    limit: Option<usize>,
) -> Result<Vec<ChampionsSearchHit>, AppError> {
    let format = format.unwrap_or_default();
    let limit = limit.unwrap_or(40).clamp(1, 200);
    state.champions.search(format, &query, limit).await
}
