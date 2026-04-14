use crate::domain::move_::MoveSummary;
use crate::domain::pokemon::{Pokemon, PokemonType};
use crate::domain::sets::SetsBundle;
use crate::error::AppError;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn list_pokemon(state: State<'_, AppState>) -> Result<Vec<Pokemon>, AppError> {
    state.pokedex.all().await
}

#[tauri::command]
pub async fn search_pokemon(
    state: State<'_, AppState>,
    query: Option<String>,
    type_filter: Option<PokemonType>,
) -> Result<Vec<Pokemon>, AppError> {
    state
        .pokedex
        .search(query.as_deref(), type_filter)
        .await
}

#[tauri::command]
pub async fn get_pokemon(
    state: State<'_, AppState>,
    id: String,
) -> Result<Pokemon, AppError> {
    state
        .pokedex
        .get(&id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("pokemon {id}")))
}

#[tauri::command]
pub async fn list_items(state: State<'_, AppState>) -> Result<Vec<String>, AppError> {
    state.pokedex.list_items().await
}

#[tauri::command]
pub async fn list_moves(state: State<'_, AppState>) -> Result<Vec<String>, AppError> {
    state.pokedex.list_moves().await
}

#[tauri::command]
pub async fn list_moves_for_species(
    state: State<'_, AppState>,
    species: String,
) -> Result<Vec<MoveSummary>, AppError> {
    state.pokedex.list_moves_for_species(&species).await
}

#[tauri::command]
pub async fn get_pokemon_sets(
    state: State<'_, AppState>,
    species: String,
) -> Result<SetsBundle, AppError> {
    state.sets.get_bundle(&species).await
}
