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
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| {
                tracing_subscriber::EnvFilter::new("info,vgc_reporter_lib=debug")
            }),
        )
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;
            #[cfg(desktop)]
            app.handle().plugin(tauri_plugin_process::init())?;

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
            commands::pokedex::list_abilities,
            commands::pokedex::list_moves_for_species,
            commands::pokedex::get_pokemon_sets,
            commands::pokedex::get_entity_descriptions,
            commands::pokedex::get_learnsets_index,
            commands::pokedex::get_move_catalog,
            commands::teams::save_team,
            commands::teams::list_teams,
            commands::teams::get_team,
            commands::teams::delete_team,
            commands::teams::import_showdown_text,
            commands::teams::export_team_to_showdown,
            commands::teams::validate_team,
            commands::regulations::get_allowed_species,
            commands::regulations::get_allowed_items,
            commands::regulations::get_allowed_moves,
            commands::top_teams::get_top_teams,
            commands::top_teams_export::save_top_teams_markdown,
            commands::settings::get_settings,
            commands::settings::set_setting,
            commands::champions::list_champions_tournaments,
            commands::champions::get_tournament_standings,
            commands::champions::search_champions,
            commands::translations::get_translation_table,
            commands::upcoming::list_upcoming_tournaments,
            commands::pikalytics::get_pikalytics_entry,
            commands::trending::get_trending,
            commands::updater::check_for_app_update,
        ])
        .run(tauri::generate_context!())
        .expect("error while running VGC-Reporter");
}
