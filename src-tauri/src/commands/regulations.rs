use crate::adapters::official_stream_client::DEFAULT_LIVE_SCREENS;
use crate::domain::format::Format;
use crate::domain::regulation::{
    LiveStreamScreen, OfficialLiveStream, RegulationInfo, RegulationNewsItem, RegulationSyncStatus,
};
use crate::error::AppError;
use crate::services::regulations::rules_for_code;
use crate::state::AppState;
use tauri::State;

fn rules_for_format(
    format: Format,
) -> Result<Box<dyn crate::services::regulations::RegulationRules>, AppError> {
    let code = format.cache_id();
    rules_for_code(code)
        .ok_or_else(|| AppError::Validation(format!("No regulation rules registered for {code}")))
}

#[tauri::command]
#[tracing::instrument(skip_all, err(Debug))]
pub async fn get_regulations(state: State<'_, AppState>) -> Result<Vec<RegulationInfo>, AppError> {
    state.regulations.ensure_fresh(false).await?;
    Ok(state.regulations.infos())
}

#[tauri::command]
#[tracing::instrument(skip_all, err(Debug))]
pub async fn get_regulation_status(
    state: State<'_, AppState>,
) -> Result<RegulationSyncStatus, AppError> {
    state.regulations.ensure_fresh(false).await?;
    Ok(state.regulations.status())
}

#[tauri::command]
#[tracing::instrument(skip_all, err(Debug))]
pub async fn refresh_regulations(
    state: State<'_, AppState>,
    force: Option<bool>,
) -> Result<Vec<RegulationInfo>, AppError> {
    state
        .regulations
        .ensure_fresh(force.unwrap_or(true))
        .await?;
    Ok(state.regulations.infos())
}

#[tauri::command]
#[tracing::instrument(skip_all, err(Debug))]
pub async fn get_regulation_news(
    state: State<'_, AppState>,
    force: Option<bool>,
) -> Result<Vec<RegulationNewsItem>, AppError> {
    state.regulations.news(force.unwrap_or(false)).await
}

#[tauri::command]
#[tracing::instrument(skip_all, err(Debug))]
pub async fn get_official_live_stream(
    state: State<'_, AppState>,
    force: Option<bool>,
) -> Result<Option<OfficialLiveStream>, AppError> {
    let source = state.settings.get(crate::config::SETTING_OFFICIAL_STREAM)?;
    state
        .regulations
        .live_stream(force.unwrap_or(false), source.as_deref())
        .await
}

#[tauri::command]
#[tracing::instrument(skip_all, err(Debug))]
pub async fn get_live_streams(
    state: State<'_, AppState>,
    force: Option<bool>,
) -> Result<Vec<LiveStreamScreen>, AppError> {
    let configured = state.settings.get(crate::config::SETTING_LIVE_STREAMS)?;
    let legacy = state.settings.get(crate::config::SETTING_OFFICIAL_STREAM)?;
    let sources = configured_live_sources(configured.as_deref(), legacy.as_deref());
    Ok(state
        .regulations
        .live_screens(force.unwrap_or(false), sources)
        .await)
}

/// One URL per line. When the user has never configured screens, start from
/// the curated YukS + official + community list, preserving an older custom
/// official URL as the second screen.
fn configured_live_sources(configured: Option<&str>, legacy: Option<&str>) -> Vec<String> {
    let mut sources: Vec<String> = configured
        .unwrap_or_default()
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(str::to_string)
        .collect();
    if sources.is_empty() {
        sources.push(DEFAULT_LIVE_SCREENS[0].to_string());
        if let Some(legacy) = legacy.map(str::trim).filter(|url| !url.is_empty()) {
            sources.push(legacy.to_string());
        }
        sources.extend(
            DEFAULT_LIVE_SCREENS
                .iter()
                .skip(1)
                .map(|url| url.to_string()),
        );
    }
    let mut seen = std::collections::HashSet::new();
    sources.retain(|url| seen.insert(url.clone()));
    sources.truncate(12);
    sources
}

#[tauri::command]
#[tracing::instrument(skip_all, err(Debug))]
pub fn get_allowed_species(format: Format) -> Result<Vec<String>, AppError> {
    Ok(rules_for_format(format)?.allowed_species())
}

#[tauri::command]
#[tracing::instrument(skip_all, err(Debug))]
pub fn get_allowed_items(format: Format) -> Result<Vec<String>, AppError> {
    Ok(rules_for_format(format)?.allowed_items())
}

#[tauri::command]
#[tracing::instrument(skip_all, err(Debug))]
pub fn get_allowed_moves(format: Format) -> Result<Vec<String>, AppError> {
    Ok(rules_for_format(format)?.allowed_moves())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_to_the_curated_vgc_screens() {
        let sources = configured_live_sources(None, None);
        assert_eq!(
            sources,
            DEFAULT_LIVE_SCREENS
                .iter()
                .map(|url| url.to_string())
                .collect::<Vec<_>>()
        );
        assert_eq!(sources[0], "https://www.youtube.com/@yuksvgc");
        assert_eq!(sources[1], "https://www.youtube.com/@PlayPokemon");
        assert!(sources.contains(&"https://www.youtube.com/@WolfeyVGC".to_string()));
        assert!(sources.contains(&"https://www.youtube.com/@PokeAlex".to_string()));
    }

    #[test]
    fn keeps_a_legacy_override_after_yuks() {
        let sources = configured_live_sources(None, Some("https://www.youtube.com/@MyChannel"));
        assert_eq!(sources[0], "https://www.youtube.com/@yuksvgc");
        assert_eq!(sources[1], "https://www.youtube.com/@MyChannel");
        assert!(sources.contains(&DEFAULT_LIVE_SCREENS[1].to_string()));
    }

    #[test]
    fn splits_lines_dedupes_and_limits_to_twelve_screens() {
        let configured = (0..15)
            .map(|i| format!("https://www.youtube.com/@c{i}"))
            .collect::<Vec<_>>()
            .join("\n");
        let mut lines = configured.lines().map(str::to_string).collect::<Vec<_>>();
        lines.push(lines[0].clone());
        let sources = configured_live_sources(Some(&lines.join("\n")), None);
        assert_eq!(sources.len(), 12);
        assert_eq!(sources[0], "https://www.youtube.com/@c0");
    }
}
