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
    #[serde(default)]
    #[ts(type = "number | null")]
    pub android_size: Option<u64>,
    #[serde(default)]
    pub android_sha256: Option<String>,
    #[serde(default)]
    pub android_signature: Option<String>,
    /// Present when the manifest also lists a Windows bundle; used by the
    /// diagnostic panel and the manual MSI fallback.
    #[serde(default)]
    pub desktop_url: Option<String>,
    #[serde(default)]
    pub desktop_signature: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct AndroidUpdateProgress {
    pub request_id: String,
    #[ts(type = "number")]
    pub downloaded: u64,
    #[ts(type = "number")]
    pub total: u64,
    pub pct: u8,
    pub done: bool,
    #[serde(default)]
    pub error: Option<String>,
}
