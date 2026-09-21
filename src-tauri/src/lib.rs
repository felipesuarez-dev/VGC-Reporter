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

/// Directory holding the rotating log files, inside the app data dir.
pub const LOG_DIR_NAME: &str = "logs";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // A release build on Windows is a GUI subsystem binary with no console
    // attached, so everything written to stdout goes nowhere: in practice the
    // app has had no logs in production at all. Mirror them to a rotating file
    // under the app data dir so a user can actually send one, and keep the
    // stdout layer because that is what `tauri dev` shows.
    let guard = log_dir().map(|dir| {
        let appender = tracing_appender::rolling::daily(dir, "vgc-reporter.log");
        tracing_appender::non_blocking(appender)
    });

    let filter = || {
        tracing_subscriber::EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info,vgc_reporter_lib=debug"))
    };

    // The non-blocking writer stops flushing when its guard drops, so it has
    // to outlive `run`. Leaking it is the documented way to tie it to process
    // lifetime, and this runs exactly once.
    match guard {
        Some((writer, worker_guard)) => {
            std::mem::forget(worker_guard);
            use tracing_subscriber::layer::SubscriberExt;
            use tracing_subscriber::util::SubscriberInitExt;
            tracing_subscriber::registry()
                .with(filter())
                .with(tracing_subscriber::fmt::layer())
                .with(
                    tracing_subscriber::fmt::layer()
                        .with_writer(writer)
                        .with_ansi(false),
                )
                .init();
        }
        None => {
            tracing_subscriber::fmt().with_env_filter(filter()).init();
        }
    }

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

            let app_data = match app.path().app_data_dir() {
                Ok(dir) => dir.join("vgc-reporter.sqlite"),
                Err(e) => {
                    tracing::error!("startup: app_data_dir failed: {e}");
                    eprintln!("VGC-Reporter startup failed: app_data_dir: {e}");
                    return Err(e.into());
                }
            };
            let state = match AppState::bootstrap(&app_data) {
                Ok(state) => state,
                Err(e) => {
                    tracing::error!("startup: bootstrap failed: {e}");
                    eprintln!("VGC-Reporter startup failed: {e}");
                    return Err(e.into());
                }
            };
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
            commands::settings::open_logs_folder,
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

/// Resolve (and create) the log directory. Returns `None` when the platform
/// will not give us a data dir, in which case logging stays stdout-only
/// rather than failing startup over something cosmetic.
fn log_dir() -> Option<std::path::PathBuf> {
    let base = dirs_data_dir()?
        .join("com.pumasoft.vgcreporter")
        .join(LOG_DIR_NAME);
    std::fs::create_dir_all(&base).ok()?;
    Some(base)
}

/// The OS data directory, resolved without pulling in another dependency.
/// Tauri exposes this through its path API, but the subscriber has to be up
/// before the app handle exists.
fn dirs_data_dir() -> Option<std::path::PathBuf> {
    #[cfg(target_os = "windows")]
    {
        std::env::var_os("APPDATA").map(std::path::PathBuf::from)
    }
    #[cfg(target_os = "macos")]
    {
        std::env::var_os("HOME")
            .map(std::path::PathBuf::from)
            .map(|h| h.join("Library").join("Application Support"))
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        std::env::var_os("XDG_DATA_HOME")
            .map(std::path::PathBuf::from)
            .or_else(|| {
                std::env::var_os("HOME")
                    .map(std::path::PathBuf::from)
                    .map(|h| h.join(".local").join("share"))
            })
    }
}
