use crate::domain::team::Team;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use ts_rs::TS;

/// Bundle schema. Bumped only when the payload shape changes; the pairing
/// ticket has its own version so the QR format can evolve independently.
pub const SYNC_SCHEMA: u32 = 1;
pub const SYNC_TICKET_VERSION: u8 = 1;
/// Sync tickets are deliberately short-lived: a phone left on a table must
/// stop serving the bundle even if the user forgets the session.
pub const SYNC_SESSION_SECONDS: u64 = 300;
/// Large enough for a full local tournament archive, small enough that a
/// malicious peer cannot exhaust memory through the LAN endpoint.
pub const SYNC_MAX_PAYLOAD_BYTES: usize = 8 * 1024 * 1024;
pub const SYNC_CODE_LEN: usize = 8;
pub const SYNC_CODE_ALPHABET: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

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

#[derive(Debug, Clone, Copy, Serialize, Deserialize, TS, PartialEq, Eq)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
#[serde(rename_all = "lowercase")]
pub enum SyncState {
    Waiting,
    Connected,
    Transferring,
    Received,
    Imported,
    Expired,
    Cancelled,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct SyncSession {
    pub version: u8,
    pub code: String,
    /// Versioned `vgcreporter://sync?...` ticket shown as a QR code.
    pub ticket: String,
    /// Legacy HTTP bundle URL kept for the advanced fallback.
    pub url: String,
    pub expires_at: String,
    pub teams: u32,
    pub settings: u32,
    pub ui_stores: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq, Eq)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct SyncSessionStatus {
    pub code: String,
    pub state: SyncState,
    pub expires_at: String,
    pub teams: u32,
    pub settings: u32,
    pub ui_stores: u32,
    #[serde(default)]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq, Eq)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct SyncTicket {
    pub version: u8,
    pub code: String,
    pub token: String,
    pub host: String,
    pub port: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct SyncImportResult {
    pub teams_imported: u32,
    pub settings_imported: u32,
}
