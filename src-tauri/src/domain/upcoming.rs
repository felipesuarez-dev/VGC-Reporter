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
    /// Last day of multi-day events (official majors). `None` for single-day
    /// local/online tournaments. The calendar expands the whole range.
    #[serde(default)]
    pub end_date: Option<String>,
    /// Visual tier: `world`, `international`, `regional`, `special`, `local`
    /// or `community`. Majors are highlighted with a dedicated badge.
    #[serde(default)]
    pub tier: Option<String>,
    /// Published cash prize pool, when the official page has one.
    #[serde(default)]
    pub prize_pool: Option<String>,
    #[serde(default)]
    pub time: Option<String>,
    #[serde(default)]
    pub kind: Option<String>,
    #[serde(default)]
    pub city: Option<String>,
    #[serde(default)]
    pub country: Option<String>,
    #[serde(default)]
    pub venue: Option<String>,
    #[serde(default)]
    pub street_address: Option<String>,
    #[serde(default)]
    pub state: Option<String>,
    #[serde(default)]
    pub postal_code: Option<String>,
    #[serde(default)]
    pub latitude: Option<f64>,
    #[serde(default)]
    pub longitude: Option<f64>,
    #[serde(default)]
    pub contact_email: Option<String>,
    #[serde(default)]
    pub contact_phone: Option<String>,
    #[serde(default)]
    pub details: Option<String>,
    #[serde(default)]
    pub registration_start: Option<String>,
    #[serde(default)]
    pub registration_end: Option<String>,
    #[serde(default)]
    pub admission: Option<String>,
    /// Exact start instant for sources that publish one (Limitless). Kept
    /// alongside `date`/`time` so the UI can render the user's timezone.
    #[serde(default)]
    pub starts_at: Option<String>,
    /// Upcoming Limitless registration count (not the player field).
    #[serde(default)]
    pub registrations: Option<u32>,
    #[serde(default)]
    pub event_website: Option<String>,
    #[serde(default)]
    pub third_party_registration_website: Option<String>,
}

/// Extra fields read from the official Play! Pokémon event page. The mirror we
/// use for the event list does not include the organizer, so this best-effort
/// detail keeps the in-app card complete without embedding the anti-bot page.
#[derive(Debug, Clone, Default, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/lib/types.generated.ts")]
pub struct OfficialEventDetails {
    #[serde(default)]
    pub tournament_id: Option<String>,
    #[serde(default)]
    pub category: Option<String>,
    #[serde(default)]
    pub premier_event: Option<String>,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub organizer_name: Option<String>,
    #[serde(default)]
    pub organizer_phone: Option<String>,
    #[serde(default)]
    pub organizer_email: Option<String>,
    #[serde(default)]
    pub venue: Option<String>,
    #[serde(default)]
    pub address_line1: Option<String>,
    #[serde(default)]
    pub address_line2: Option<String>,
    #[serde(default)]
    pub city: Option<String>,
    #[serde(default)]
    pub state: Option<String>,
    #[serde(default)]
    pub postal_code: Option<String>,
    #[serde(default)]
    pub country: Option<String>,
    #[serde(default)]
    pub website: Option<String>,
    #[serde(default)]
    pub admission: Option<String>,
    #[serde(default)]
    pub registration: Option<String>,
    #[serde(default)]
    pub details: Option<String>,
    #[serde(default)]
    pub latitude: Option<f64>,
    #[serde(default)]
    pub longitude: Option<f64>,
}
