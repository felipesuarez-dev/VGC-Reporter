//! VGC-Reporter — Tauri backend library
//! PumaSoft © 2026

pub mod adapters;
pub mod commands;
pub mod config;
pub mod domain;
pub mod error;
pub mod services;
pub mod state;
pub mod storage;

use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info,vgc_reporter_lib=debug")),
        )
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            let app_data = app
                .path()
                .app_data_dir()
                .expect("app_data_dir")
                .join("vgc-reporter.sqlite");
            let state = AppState::bootstrap(&app_data).expect("AppState bootstrap");
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::meta::get_meta_stats,
            commands::pokedex::list_pokemon,
            commands::pokedex::search_pokemon,
            commands::pokedex::get_pokemon,
            commands::pokedex::list_items,
            commands::pokedex::list_moves,
            commands::pokedex::list_moves_for_species,
            commands::pokedex::get_pokemon_sets,
            commands::teams::save_team,
            commands::teams::list_teams,
            commands::teams::get_team,
            commands::teams::delete_team,
            commands::teams::import_showdown_text,
            commands::teams::export_team_to_showdown,
            commands::teams::validate_team,
            commands::top_teams::get_top_teams,
            commands::settings::get_settings,
            commands::settings::set_setting,
            commands::champions::list_champions_tournaments,
            commands::champions::get_tournament_standings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running VGC-Reporter");
}
