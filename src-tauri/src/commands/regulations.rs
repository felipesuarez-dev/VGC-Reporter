use crate::domain::format::Format;
use crate::error::AppError;
use crate::services::regulations::rules_for_code;

fn rules_for_format(format: Format) -> Result<Box<dyn crate::services::regulations::RegulationRules>, AppError> {
    let code = format.cache_id();
    rules_for_code(code).ok_or_else(|| {
        AppError::Validation(format!("No regulation rules registered for {code}"))
    })
}

#[tauri::command]
pub fn get_allowed_species(format: Format) -> Result<Vec<String>, AppError> {
    Ok(rules_for_format(format)?.allowed_species())
}

#[tauri::command]
pub fn get_allowed_items(format: Format) -> Result<Vec<String>, AppError> {
    Ok(rules_for_format(format)?.allowed_items())
}

#[tauri::command]
pub fn get_allowed_moves(format: Format) -> Result<Vec<String>, AppError> {
    Ok(rules_for_format(format)?.allowed_moves())
}
