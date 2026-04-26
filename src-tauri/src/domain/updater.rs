use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct UpdateInfo {
    pub version: String,
    pub current_version: String,
    pub notes: String,
    #[serde(default)]
    pub android_url: Option<String>,
}
