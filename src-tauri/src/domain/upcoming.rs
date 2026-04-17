use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct UpcomingTournament {
    pub id: String,
    pub name: String,
    pub date: String,
    pub url: String,
    pub region: Option<String>,
    pub players: Option<u32>,
    pub source: String,
}
