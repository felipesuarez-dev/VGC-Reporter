use crate::domain::team::Team;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use ts_rs::TS;

pub const SYNC_SCHEMA: u32 = 1;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct SyncBundle {
    pub schema: u32,
    pub app_version: String,
    pub exported_at: String,
    pub teams: Vec<Team>,
    pub settings: HashMap<String, String>,
    /// UI preferences serialized by the frontend (localStorage stores).
    pub ui_json: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct SyncSession {
    pub code: String,
    pub url: String,
    pub expires_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct SyncImportResult {
    pub teams_imported: u32,
    pub settings_imported: u32,
}
