use crate::adapters::{
    LimitlessClient, LimitlessTournamentSummary, OfficialEventClient, PokedataClient, PokedataEvent,
};
use crate::domain::{OfficialEventDetails, UpcomingTournament};
use crate::error::AppError;
use chrono::{Duration, NaiveDate, Utc};

const LIMITLESS_TOURNAMENT_URL: &str = "https://play.limitlesstcg.com/tournament";
const LIMITLESS_SOURCE: &str = "limitless";
const POKEDATA_SOURCE: &str = "play-pokemon";
const WINDOW_DAYS: i64 = 30;

#[derive(Clone)]
pub struct UpcomingTournamentsService {
    limitless: LimitlessClient,
    pokedata: PokedataClient,
    official_event: OfficialEventClient,
}

impl UpcomingTournamentsService {
    pub fn new(
        limitless: LimitlessClient,
        pokedata: PokedataClient,
        official_event: OfficialEventClient,
    ) -> Self {
        Self {
            limitless,
            pokedata,
            official_event,
        }
    }

    /// Extra fields from the official event page (organizer, clean address,
    /// price). Best effort: the official site sometimes serves an anti-bot page.
    pub async fn official_details(&self, url: &str) -> Result<OfficialEventDetails, AppError> {
        self.official_event.details(url).await
    }

    pub async fn list_upcoming(
        &self,
        country: Option<String>,
    ) -> Result<Vec<UpcomingTournament>, AppError> {
        let today = Utc::now().date_naive();
        let window_end = today + Duration::days(WINDOW_DAYS);
        let pokedata_start = today + Duration::days(1);

        let raw = self.limitless.list_all_vgc(200).await?;
        let mut upcoming: Vec<UpcomingTournament> = raw
            .into_iter()
            .filter_map(|t| to_upcoming(t, today, window_end))
            .collect();

        let country = country
            .as_deref()
            .map(str::trim)
            .map(str::to_uppercase)
            .filter(|code| code.len() == 2 && code.chars().all(|c| c.is_ascii_alphabetic()));
        match self
            .pokedata
            .upcoming(country.as_deref(), pokedata_start, window_end)
            .await
        {
            Ok(events) => {
                upcoming.extend(
                    events
                        .into_iter()
                        .filter_map(|event| to_pokedata_upcoming(event, today, window_end)),
                );
            }
            Err(error) => tracing::warn!(
                country = country.as_deref().unwrap_or("all"),
                %error,
                "official event locator unavailable; showing online tournaments only"
            ),
        }

        upcoming.sort_by(|a, b| {
            a.date
                .cmp(&b.date)
                .then_with(|| a.time.cmp(&b.time))
                .then_with(|| a.name.cmp(&b.name))
        });
        upcoming.dedup_by(|a, b| a.id == b.id);
        upcoming.truncate(60);
        tracing::info!(
            kept = upcoming.len(),
            today = %today,
            window_end = %window_end,
            window_days = WINDOW_DAYS,
            "upcoming tournaments filtered"
        );
        Ok(upcoming)
    }
}

fn to_upcoming(
    t: LimitlessTournamentSummary,
    today: NaiveDate,
    window_end: NaiveDate,
) -> Option<UpcomingTournament> {
    let raw_date = t.date.as_deref()?;
    let parsed = parse_date(raw_date)?;
    if parsed <= today || parsed > window_end {
        return None;
    }
    Some(UpcomingTournament {
        id: t.id.clone(),
        name: t.name,
        date: parsed.format("%Y-%m-%d").to_string(),
        url: format!("{}/{}", LIMITLESS_TOURNAMENT_URL, t.id),
        region: t.format,
        players: t.players,
        source: LIMITLESS_SOURCE.to_string(),
        time: None,
        kind: None,
        city: None,
        country: None,
        venue: None,
        street_address: None,
        state: None,
        postal_code: None,
        latitude: None,
        longitude: None,
        contact_email: None,
        contact_phone: None,
        details: None,
        registration_start: None,
        registration_end: None,
        admission: None,
        event_website: None,
        third_party_registration_website: None,
    })
}

fn to_pokedata_upcoming(
    event: PokedataEvent,
    today: NaiveDate,
    window_end: NaiveDate,
) -> Option<UpcomingTournament> {
    let parsed = NaiveDate::parse_from_str(&event.date, "%Y-%m-%d").ok()?;
    if parsed <= today || parsed > window_end {
        return None;
    }
    Some(UpcomingTournament {
        id: format!("{POKEDATA_SOURCE}-{}", event.id),
        name: event.name,
        date: event.date,
        url: event
            .url
            .unwrap_or_else(|| "https://events.pokemon.com/en-us/events?filters=vg".to_string()),
        region: None,
        players: None,
        source: POKEDATA_SOURCE.to_string(),
        time: event.time,
        kind: event.kind,
        city: event.city,
        country: event.country,
        venue: event.venue,
        street_address: event.street_address,
        state: event.state,
        postal_code: event.postal_code,
        latitude: event.latitude,
        longitude: event.longitude,
        contact_email: event.contact_email,
        contact_phone: event.contact_phone,
        details: event.details,
        registration_start: event.registration_start,
        registration_end: event.registration_end,
        admission: event.admission,
        event_website: event.event_website,
        third_party_registration_website: event.third_party_registration_website,
    })
}

fn parse_date(raw: &str) -> Option<NaiveDate> {
    if let Ok(d) = NaiveDate::parse_from_str(raw, "%Y-%m-%d") {
        return Some(d);
    }
    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(raw) {
        return Some(dt.date_naive());
    }
    if let Ok(d) = NaiveDate::parse_from_str(raw, "%d/%m/%Y") {
        return Some(d);
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_date_accepts_multiple_formats() {
        assert!(parse_date("2026-05-01").is_some());
        assert!(parse_date("2026-05-01T18:00:00Z").is_some());
        assert!(parse_date("01/05/2026").is_some());
        assert!(parse_date("nonsense").is_none());
    }

    #[test]
    fn to_upcoming_filters_past_and_far_future() {
        let today = NaiveDate::from_ymd_opt(2026, 4, 17).unwrap();
        let window = today + Duration::days(14);
        let mk = |id: &str, date: Option<&str>| LimitlessTournamentSummary {
            id: id.into(),
            name: format!("Event {}", id),
            date: date.map(str::to_string),
            players: Some(80),
            format: Some("M-A".into()),
            organizer_id: None,
            game: None,
        };
        assert!(to_upcoming(mk("past", Some("2026-04-10")), today, window).is_none());
        assert!(to_upcoming(mk("far", Some("2026-06-01")), today, window).is_none());
        assert!(to_upcoming(mk("none", None), today, window).is_none());
        assert!(to_upcoming(mk("next", Some("2026-04-25")), today, window).is_some());
        // A tournament dated today has either already finished or is in
        // progress - it is no longer "upcoming".
        assert!(to_upcoming(mk("today", Some("2026-04-17")), today, window).is_none());
        assert!(to_upcoming(mk("tomorrow", Some("2026-04-18")), today, window).is_some());
    }

    #[test]
    fn maps_a_local_event_to_the_shared_shape() {
        let today = NaiveDate::from_ymd_opt(2026, 11, 21).unwrap();
        let window = today + Duration::days(30);
        let event = PokedataEvent {
            id: "abc".into(),
            name: "League Challenge Spells VGC".into(),
            date: "2026-11-28".into(),
            time: Some("15:00:00".into()),
            kind: Some("League Challenge".into()),
            city: Some("Vina del Mar".into()),
            country: Some("CL".into()),
            venue: Some("SPELLS TCG".into()),
            url: Some("https://www.pokemon.com/x".into()),
            street_address: Some("AV. LIBERTAD 123".into()),
            state: Some("Valparaiso".into()),
            postal_code: Some("2520000".into()),
            latitude: Some(-33.0245),
            longitude: Some(-71.5518),
            contact_email: Some("events@spells.cl".into()),
            contact_phone: None,
            details: Some("Registration opens at 14:30.".into()),
            registration_start: Some("2026-11-28 14:30:00".into()),
            registration_end: Some("2026-11-28 15:00:00".into()),
            admission: Some("5000 CLP".into()),
            event_website: None,
            third_party_registration_website: None,
        };
        let mapped = to_pokedata_upcoming(event, today, window).unwrap();
        assert_eq!(mapped.source, "play-pokemon");
        assert_eq!(mapped.country.as_deref(), Some("CL"));
        assert_eq!(mapped.city.as_deref(), Some("Vina del Mar"));
        assert_eq!(mapped.kind.as_deref(), Some("League Challenge"));
        assert_eq!(mapped.latitude, Some(-33.0245));
        assert_eq!(mapped.admission.as_deref(), Some("5000 CLP"));
    }
}
